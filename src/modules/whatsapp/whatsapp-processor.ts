import { and, asc, eq } from 'drizzle-orm';
import type { Orm } from '../../shared/db/database.js';
import { inboundEvents, outboundMessages } from '../../shared/db/schema.js';
import type { IncomingMessage, MessageRouter } from '../conversation/message-router.js';
import {
  type ContactId,
  decryptContact,
  decryptText,
  encryptContact,
  encryptText,
  hashContact,
} from '../users/contact.js';
import type { PhoneKeys } from '../users/phone.js';
import type { AudioStore } from '../voice/audio-store.js';
import type { JobQueue } from './job-queue.js';
import type { RateLimiter } from './rate-limiter.js';
import { extractInboundMessages, type InboundContent } from './webhook-payload.js';
import type { WhatsAppApi } from './whatsapp-api.js';

export const UNSUPPORTED_MESSAGE =
  'Por ahora entiendo mensajes de texto y audios. ¿Me lo escribís o me mandás un audio?';

export interface WhatsAppProcessorDeps {
  orm: Orm;
  keys: PhoneKeys;
  api: WhatsAppApi;
  router: Pick<MessageRouter, 'handle'>;
  audioStore: AudioStore;
  rateLimiter: RateLimiter;
  now?: () => Date;
  /** Eventos sin datos personales, para los logs. */
  onEvent?: (event: { type: string; count?: number }) => void;
}

export interface ReceiveResult {
  accepted: number;
  duplicates: number;
  limited: number;
}

// Une el webhook con el resto del sistema:
// 1. receive: guarda cada mensaje (cifrado) una sola vez y lo encola. Rápido.
// 2. process: lo pasa por el ruteador, guarda las respuestas y las envía. Se puede reintentar
//    sin duplicar: las respuestas ya guardadas no se vuelven a calcular, y las ya enviadas no
//    se vuelven a mandar.
export class WhatsAppProcessor {
  private readonly now: () => Date;
  private queue?: JobQueue;

  constructor(private readonly deps: WhatsAppProcessorDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  useQueue(queue: JobQueue): void {
    this.queue = queue;
  }

  async receive(payload: unknown): Promise<ReceiveResult> {
    if (!this.queue) throw new Error('Falta configurar la cola');

    const { orm, keys, rateLimiter } = this.deps;
    const result: ReceiveResult = { accepted: 0, duplicates: 0, limited: 0 };
    const now = this.now();

    for (const message of extractInboundMessages(payload)) {
      const contactHash = hashContact(message.contact, keys);

      if (!rateLimiter.allow(contactHash, now.getTime())) {
        result.limited += 1;
        continue;
      }

      const [inserted] = await orm
        .insert(inboundEvents)
        .values({
          providerMessageId: message.providerMessageId,
          contactHash,
          contactEncrypted: encryptContact(message.contact, keys),
          payloadEncrypted: encryptText(JSON.stringify(message.content), keys),
          receivedAt: now,
        })
        .onConflictDoNothing({ target: inboundEvents.providerMessageId })
        .returning({ id: inboundEvents.id });

      if (!inserted) {
        result.duplicates += 1;
        continue;
      }

      await this.queue.send(inserted.id);
      result.accepted += 1;
    }

    this.deps.onEvent?.({ type: 'webhook_received', count: result.accepted });
    return result;
  }

  async process(eventId: string): Promise<void> {
    const { orm, keys } = this.deps;
    const [event] = await orm.select().from(inboundEvents).where(eq(inboundEvents.id, eventId));

    if (!event || event.completedAt || !event.contactEncrypted) return;

    const contact = decryptContact(event.contactEncrypted, keys);

    if (event.status === 'received') await this.reply(event.id, contact, event.payloadEncrypted);

    await this.sendPending(event.id, contact);

    const [current] = await orm
      .select({ forgetContact: inboundEvents.forgetContact })
      .from(inboundEvents)
      .where(eq(inboundEvents.id, event.id));

    if (current?.forgetContact) {
      // BAJA: después de mandar la despedida, no queda ningún registro de esa persona.
      await orm.delete(inboundEvents).where(eq(inboundEvents.contactHash, event.contactHash));
      this.deps.onEvent?.({ type: 'contact_forgotten' });
      return;
    }

    await orm
      .update(inboundEvents)
      .set({ completedAt: this.now(), contactEncrypted: null })
      .where(eq(inboundEvents.id, event.id));
  }

  private async reply(eventId: string, contact: ContactId, payloadEncrypted: string | null) {
    const { orm, keys } = this.deps;
    const content: InboundContent = payloadEncrypted
      ? JSON.parse(decryptText(payloadEncrypted, keys))
      : { type: 'unsupported' };

    let replies: { kind: string; text: string; audioId?: string }[];
    let forgotten = false;

    if (content.type === 'unsupported') {
      replies = [{ kind: 'info', text: UNSUPPORTED_MESSAGE }];
    } else {
      const incoming: IncomingMessage = { contact, now: this.now() };
      if (content.type === 'text') incoming.text = content.text;
      else {
        // El audio de la persona solo vive en memoria: se descarga, se transcribe y se descarta.
        const media = await this.deps.api.downloadMedia(content.mediaId);
        incoming.audio = { data: media.data, mimeType: media.mimeType };
      }

      const result = await this.deps.router.handle(incoming);
      replies = result.messages;
      forgotten = result.forgotten;
    }

    const contactHash = hashContact(contact, keys);

    await orm.transaction(async (tx) => {
      if (replies.length > 0) {
        await tx.insert(outboundMessages).values(
          replies.map((message, position) => ({
            inboundEventId: eventId,
            position,
            contactHash,
            kind: message.kind,
            bodyEncrypted: encryptText(message.text, keys),
            audioId: message.audioId,
          })),
        );
      }

      await tx
        .update(inboundEvents)
        .set({
          status: 'processed',
          processedAt: this.now(),
          payloadEncrypted: null,
          forgetContact: forgotten,
        })
        .where(eq(inboundEvents.id, eventId));
    });
  }

  private async sendPending(eventId: string, contact: ContactId): Promise<void> {
    const { orm, keys, api, audioStore } = this.deps;
    const pending = await orm
      .select()
      .from(outboundMessages)
      .where(
        and(eq(outboundMessages.inboundEventId, eventId), eq(outboundMessages.status, 'pending')),
      )
      .orderBy(asc(outboundMessages.position));

    for (const message of pending) {
      const text = message.bodyEncrypted ? decryptText(message.bodyEncrypted, keys) : '';
      const audio = message.audioId ? await audioStore.get(message.audioId) : undefined;

      // Si hay audio, va como nota de voz. Si no (proveedor simulado o sin presupuesto), texto.
      const providerMessageId = audio
        ? await api.sendVoiceNote(contact, audio)
        : await api.sendText(contact, text);

      await orm
        .update(outboundMessages)
        .set({ status: 'sent', providerMessageId, sentAt: this.now(), bodyEncrypted: null })
        .where(eq(outboundMessages.id, message.id));
    }
  }
}
