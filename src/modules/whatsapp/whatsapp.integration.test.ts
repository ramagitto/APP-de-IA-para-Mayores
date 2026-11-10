import { randomInt, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { loadEnv } from '../../config/env.js';
import { createDatabase, createOrm } from '../../shared/db/database.js';
import { inboundEvents, outboundMessages } from '../../shared/db/schema.js';
import { ConversationService } from '../conversation/conversation-service.js';
import { MessageRouter } from '../conversation/message-router.js';
import { loadLessons } from '../lessons/lesson.loader.js';
import { loadConsentContent } from '../onboarding/consent-content.js';
import { OnboardingService } from '../onboarding/onboarding-service.js';
import { createLessonCalendar } from '../streaks/lesson-calendar.js';
import { InMemoryCostLedger } from '../tutor/cost-ledger.js';
import { LlmTutor } from '../tutor/llm-tutor.js';
import { MockLlmProvider } from '../tutor/mock-provider.js';
import { hashContact, whatsappContact } from '../users/contact.js';
import { phoneKeysFromBase64 } from '../users/phone.js';
import { findUserByContact } from '../users/users.repository.js';
import { InMemoryAudioStore } from '../voice/audio-store.js';
import { MockTextToSpeech } from '../voice/mock-speech.js';
import type { SpeechToText } from '../voice/speech.js';
import { VoiceService } from '../voice/voice-service.js';
import { InlineQueue, PgBossQueue } from './job-queue.js';
import { RateLimiter } from './rate-limiter.js';
import { FakeWhatsAppApi } from './whatsapp-api.js';
import { UNSUPPORTED_MESSAGE, WhatsAppProcessor } from './whatsapp-processor.js';
import { audioPayload, textPayload } from '../../../test/whatsapp-payloads.js';

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL);
const orm = createOrm(database);
const keys = phoneKeysFromBase64(env.PHONE_ENCRYPTION_KEY, env.PHONE_HASH_KEY);
const consent = loadConsentContent();
const ledger = new InMemoryCostLedger();
const monday = new Date('2027-05-03T10:00:00-03:00');

// Voz a texto de prueba: "entiende" cualquier audio como un pedido claro.
const stt: SpeechToText = {
  name: 'prueba',
  transcribe: async () => ({
    text: 'Tengo papas y huevos, ¿qué puedo cocinar hoy para dos?',
    costUsd: 0,
  }),
};

function setup(options: { limit?: number } = {}) {
  const voice = new VoiceService({
    stt,
    tts: new MockTextToSpeech(),
    store: new InMemoryAudioStore(),
    ledger,
    dailyBudgetUsd: 1,
  });
  const realRouter = new MessageRouter({
    orm,
    keys,
    consent,
    onboarding: new OnboardingService({ orm, keys, consent }),
    voice,
    conversation: new ConversationService({
      orm,
      lessons: loadLessons('content/lessons'),
      calendar: createLessonCalendar(),
      tutor: new LlmTutor({ provider: new MockLlmProvider(), ledger, dailyBudgetUsd: 1 }),
      voice,
    }),
  });
  let routerCalls = 0;
  const router = {
    handle: (incoming: Parameters<MessageRouter['handle']>[0]) => {
      routerCalls += 1;
      return realRouter.handle(incoming);
    },
  };
  const api = new FakeWhatsAppApi();
  const processor = new WhatsAppProcessor({
    orm,
    keys,
    api,
    router,
    audioStore: new InMemoryAudioStore(),
    rateLimiter: new RateLimiter(options.limit ?? 100, 60_000),
    now: () => monday,
  });
  processor.useQueue(new InlineQueue((eventId) => processor.process(eventId)));

  return { processor, api, routerCalls: () => routerCalls };
}

function newUserId(): string {
  return `AR.${randomInt(1_000_000_000, 9_999_999_999)}`;
}

let counter = 0;
function messageId(): string {
  counter += 1;
  return `wamid.prueba-${randomUUID()}-${counter}`;
}

async function eventsOf(userId: string) {
  return orm
    .select()
    .from(inboundEvents)
    .where(eq(inboundEvents.contactHash, hashContact(whatsappContact(userId), keys)));
}

afterAll(() => database.end());

describe('WhatsAppProcessor', () => {
  it('a un contacto nuevo le pide el consentimiento, respondiendo por su id de WhatsApp', async () => {
    const { processor, api } = setup();
    const userId = newUserId();

    await processor.receive(textPayload('hola', messageId(), userId));

    expect(api.sent).toEqual([{ to: whatsappContact(userId), type: 'text', body: consent.pedido }]);
  });

  it('un mensaje repetido por Meta se procesa una sola vez', async () => {
    const { processor, api } = setup();
    const userId = newUserId();
    const id = messageId();

    await processor.receive(textPayload('hola', id, userId));
    const second = await processor.receive(textPayload('hola', id, userId));

    expect(second.duplicates).toBe(1);
    expect(api.sent).toHaveLength(1);
  });

  it('alta, lección y respuestas en orden', async () => {
    const { processor, api } = setup();
    const userId = newUserId();

    for (const text of ['hola', 'ACEPTO', 'hola']) {
      await processor.receive(textPayload(text, messageId(), userId));
    }

    expect(api.sent.map((message) => message.body?.slice(0, 20))).toEqual([
      consent.pedido.slice(0, 20),
      consent.bienvenida.slice(0, 20),
      expect.stringMatching(/^Hola, ¿cómo andás/),
    ]);
  });

  it('entiende una nota de voz de una persona registrada', async () => {
    const { processor, api } = setup();
    const userId = newUserId();
    for (const text of ['hola', 'ACEPTO', 'hola']) {
      await processor.receive(textPayload(text, messageId(), userId));
    }
    api.media.set('media-1', { data: Buffer.from('ogg'), mimeType: 'audio/ogg' });

    await processor.receive(audioPayload('media-1', messageId(), userId));

    // Sin audio generado (voz simulada), la devolución y el desafío salen como texto.
    expect(api.sent.slice(-2).map((message) => message.type)).toEqual(['text', 'text']);
    expect(api.sent.at(-2)?.body).toMatch(/Muy bien/);
  });

  it('borra el contenido apenas procesa, y el contacto al terminar de enviar', async () => {
    const { processor } = setup();
    const userId = newUserId();

    await processor.receive(textPayload('hola', messageId(), userId));

    const [event] = await eventsOf(userId);
    expect(event).toMatchObject({
      status: 'processed',
      payloadEncrypted: null,
      contactEncrypted: null,
    });
    expect(event?.completedAt).not.toBeNull();
    const [outbound] = await orm
      .select()
      .from(outboundMessages)
      .where(eq(outboundMessages.inboundEventId, event!.id));
    expect(outbound).toMatchObject({ status: 'sent', bodyEncrypted: null });
  });

  it('si un envío falla, el reintento manda lo que falta sin volver a correr la lección', async () => {
    const { processor, api, routerCalls } = setup();
    const userId = newUserId();
    const originalSend = api.sendText.bind(api);
    let failures = 1;
    api.sendText = async (to, body) => {
      if (failures-- > 0) throw new Error('WhatsApp no respondió');
      return originalSend(to, body);
    };

    await expect(processor.receive(textPayload('hola', messageId(), userId))).rejects.toThrow();
    const [event] = await eventsOf(userId);
    await processor.process(event!.id);

    expect(routerCalls()).toBe(1);
    expect(api.sent).toHaveLength(1);
  });

  it('BAJA manda la despedida y después no queda ningún registro de esa persona', async () => {
    const { processor, api } = setup();
    const userId = newUserId();
    for (const text of ['hola', 'ACEPTO', 'BAJA']) {
      await processor.receive(textPayload(text, messageId(), userId));
    }

    expect(api.sent.at(-1)?.body).toBe(consent.baja);
    expect(await findUserByContact(orm, keys, whatsappContact(userId))).toBeUndefined();
    expect(await eventsOf(userId)).toEqual([]);
  });

  it('a lo que no es texto ni audio responde que por ahora no lo entiende', async () => {
    const { processor, api } = setup();
    const payload = textPayload('hola', messageId(), newUserId());
    payload.entry[0]!.changes[0]!.value.messages[0]!.type = 'sticker';

    await processor.receive(payload);

    expect(api.sent[0]?.body).toBe(UNSUPPORTED_MESSAGE);
  });

  it('pasado el límite de mensajes por minuto, no responde', async () => {
    const { processor, api } = setup({ limit: 2 });
    const userId = newUserId();

    await processor.receive(textPayload('uno', messageId(), userId));
    await processor.receive(textPayload('dos', messageId(), userId));
    const third = await processor.receive(textPayload('tres', messageId(), userId));

    expect(third.limited).toBe(1);
    expect(api.sent).toHaveLength(2);
  });
});

describe('PgBossQueue', () => {
  it('entrega los trabajos al procesador', async () => {
    const queue = new PgBossQueue(env.DATABASE_URL);
    const received: string[] = [];
    await queue.start(async (eventId) => {
      received.push(eventId);
    });

    const id = randomUUID();
    await queue.send(id);
    for (let wait = 0; wait < 40 && !received.includes(id); wait += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    await queue.stop();

    expect(received).toContain(id);
  }, 20_000);
});
