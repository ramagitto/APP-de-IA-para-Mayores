import type { Orm } from '../../shared/db/database.js';
import type { OutgoingMessage } from '../lessons/lesson-attempt.js';
import type { ConsentContent } from '../onboarding/consent-content.js';
import { detectKeyword } from '../onboarding/keywords.js';
import type { OnboardingService } from '../onboarding/onboarding-service.js';
import {
  deleteSupportRequestsByContact,
  openSupportRequest,
} from '../support/support.repository.js';
import type { ContactId } from '../users/contact.js';
import type { PhoneKeys } from '../users/phone.js';
import { deleteUser, findUserByContact } from '../users/users.repository.js';
import type { VoiceService } from '../voice/voice-service.js';
import type {
  ConversationReply,
  ConversationService,
  ReplyMessage,
} from './conversation-service.js';

export interface IncomingMessage {
  contact: ContactId;
  now: Date;
  text?: string;
  audio?: { data: Buffer; mimeType: string; hintText?: string };
}

export interface RouterReply {
  messages: ReplyMessage[];
  /** Lo que se entendió del audio, para mostrarlo en el simulador. Nunca se guarda. */
  transcript?: string;
  status: ConversationReply['status'];
  /** La persona pidió la BAJA: el canal borra también sus mensajes en tránsito. */
  forgotten: boolean;
}

export interface MessageRouterDeps {
  orm: Orm;
  keys: PhoneKeys;
  consent: ConsentContent;
  onboarding: OnboardingService;
  conversation: ConversationService;
  voice: VoiceService;
}

function info(text: string): OutgoingMessage {
  return { kind: 'info', format: 'text', text };
}

// Primera parada de todo mensaje, venga de WhatsApp o del simulador.
// Orden: BAJA y AYUDA primero; después, el alta si la persona no aceptó; por último, la lección.
export class MessageRouter {
  constructor(private readonly deps: MessageRouterDeps) {}

  async handle(incoming: IncomingMessage): Promise<RouterReply> {
    const { orm, keys, consent } = this.deps;
    const user = await findUserByContact(orm, keys, incoming.contact);
    const reply = (messages: OutgoingMessage[], extra: Partial<RouterReply> = {}): RouterReply => ({
      messages,
      status: { streak: 0 },
      forgotten: false,
      ...extra,
    });

    // Antes del consentimiento, un audio no se transcribe: mandarlo a un tercero ya sería
    // tratar datos de la persona. Se le pide que responda por escrito.
    if (!user && incoming.audio && !incoming.text) {
      const result = await this.deps.onboarding.handle({
        contact: incoming.contact,
        text: '',
        now: incoming.now,
      });
      return reply(result.messages);
    }

    let text = incoming.text?.trim() ?? '';
    let transcript: string | undefined;

    if (user && incoming.audio) {
      // El audio solo vive en memoria mientras se transcribe: no se guarda.
      const { data, mimeType, hintText } = incoming.audio;
      transcript = await this.deps.voice.transcribe({ audio: data, mimeType, hintText }, user.id);
      text = transcript;
    }

    const keyword = detectKeyword(text);

    if (keyword === 'baja') {
      await this.forget(incoming.contact);
      return reply([info(consent.baja)], { transcript, forgotten: true });
    }

    if (keyword === 'ayuda') {
      await openSupportRequest(orm, keys, {
        contact: incoming.contact,
        userId: user?.id ?? null,
        reason: 'ayuda',
        now: incoming.now,
      });
      return reply([info(consent.ayuda)], { transcript });
    }

    if (!user) {
      const result = await this.deps.onboarding.handle({
        contact: incoming.contact,
        text,
        now: incoming.now,
      });
      return reply(result.messages);
    }

    const result = await this.deps.conversation.handle({
      userId: user.id,
      text,
      inputWasAudio: Boolean(incoming.audio),
      now: incoming.now,
    });

    // Si hubo un mensaje de cuidado, además se avisa a una persona del equipo.
    if (result.messages.some((message) => message.kind === 'care')) {
      await openSupportRequest(orm, keys, {
        contact: incoming.contact,
        userId: user.id,
        reason: 'care',
        now: incoming.now,
      });
    }

    return { ...result, transcript, forgotten: false };
  }

  /** BAJA: borra a la persona, su alta en curso y sus pedidos de ayuda. */
  async forget(contact: ContactId): Promise<void> {
    const { orm, keys } = this.deps;
    const user = await findUserByContact(orm, keys, contact);

    if (user) await deleteUser(orm, user.id);
    await this.deps.onboarding.cancel(contact);
    await deleteSupportRequestsByContact(orm, keys, contact);
  }
}
