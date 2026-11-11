import { randomInt } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { loadEnv } from '../../config/env.js';
import { createDatabase, createOrm } from '../../shared/db/database.js';
import { pendingSignups, supportRequests, users } from '../../shared/db/schema.js';
import { hasActiveConsent } from '../consent/consent.repository.js';
import { loadLessons } from '../lessons/lesson.loader.js';
import { loadConsentContent } from '../onboarding/consent-content.js';
import { MAX_CONSENT_PROMPTS, OnboardingService } from '../onboarding/onboarding-service.js';
import { createLessonCalendar } from '../streaks/lesson-calendar.js';
import { InMemoryCostLedger } from '../tutor/cost-ledger.js';
import { LlmTutor } from '../tutor/llm-tutor.js';
import { MockLlmProvider } from '../tutor/mock-provider.js';
import { type ContactId, hashContact, whatsappContact } from '../users/contact.js';
import { phoneKeysFromBase64 } from '../users/phone.js';
import { findUserByContact } from '../users/users.repository.js';
import { InMemoryAudioStore } from '../voice/audio-store.js';
import { MockSpeechToText } from '../voice/mock-speech.js';
import type { TextToSpeech } from '../voice/speech.js';
import { VoiceService } from '../voice/voice-service.js';
import { ConversationService, INFO_MESSAGES } from './conversation-service.js';
import { MessageRouter } from './message-router.js';

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL);
const orm = createOrm(database);
const keys = phoneKeysFromBase64(env.PHONE_ENCRYPTION_KEY, env.PHONE_HASH_KEY);
const lessons = loadLessons('content/lessons');
const consent = loadConsentContent();
const ledger = new InMemoryCostLedger();

// Texto a voz de prueba: genera un audio falso, para verificar cuándo se pide audio.
const tts: TextToSpeech = {
  name: 'prueba',
  voiceKey: 'prueba',
  synthesize: async () => ({ audio: Buffer.from('ogg'), mimeType: 'audio/ogg', costUsd: 0 }),
};

const voice = new VoiceService({
  stt: new MockSpeechToText(),
  tts,
  store: new InMemoryAudioStore(),
  ledger,
  dailyBudgetUsd: 1,
});

const onboarding = new OnboardingService({ orm, keys, consent });
const router = new MessageRouter({
  orm,
  keys,
  consent,
  onboarding,
  voice,
  conversation: new ConversationService({
    orm,
    lessons,
    calendar: createLessonCalendar(),
    tutor: new LlmTutor({ provider: new MockLlmProvider(), ledger, dailyBudgetUsd: 1 }),
    voice,
  }),
});

const monday = new Date('2027-05-03T10:00:00-03:00');
const tuesday = new Date('2027-05-04T10:00:00-03:00');
const clearRequest = 'Tengo papas y huevos, ¿qué puedo cocinar hoy para dos personas?';

function newContact(): ContactId {
  return whatsappContact(`AR.${randomInt(1_000_000_000, 9_999_999_999)}`);
}

async function send(contact: ContactId, text: string, now = monday) {
  return router.handle({ contact, text, now });
}

async function registered(): Promise<ContactId> {
  const contact = newContact();
  await send(contact, 'hola');
  await send(contact, 'ACEPTO');
  return contact;
}

async function pendingRow(contact: ContactId) {
  const [row] = await orm
    .select()
    .from(pendingSignups)
    .where(eq(pendingSignups.contactHash, hashContact(contact, keys)));
  return row;
}

afterAll(() => database.end());

describe('alta con consentimiento primero', () => {
  it('el primer mensaje pide el consentimiento y no crea a nadie', async () => {
    const contact = newContact();

    const reply = await send(contact, 'hola');

    expect(reply.messages[0]?.text).toBe(consent.pedido);
    expect(await findUserByContact(orm, keys, contact)).toBeUndefined();
    expect(await pendingRow(contact)).toBeDefined();
  });

  it('el alta en curso guarda solo el hash del contacto', async () => {
    const contact = newContact();
    await send(contact, 'hola');

    const row = await pendingRow(contact);

    expect(Object.keys(row ?? {}).sort()).toEqual(['contactHash', 'createdAt', 'promptsSent']);
    expect(JSON.stringify(row)).not.toContain(contact.slice(3));
  });

  it('ACEPTO crea a la persona, registra los consentimientos y borra el alta', async () => {
    const contact = newContact();
    await send(contact, 'hola');

    const reply = await send(contact, 'Sí, acepto');

    const user = await findUserByContact(orm, keys, contact);
    expect(reply.messages[0]?.text).toBe(consent.bienvenida);
    expect(user).toBeDefined();
    expect(await hasActiveConsent(orm, user!.id, 'terms_and_privacy')).toBe(true);
    expect(await hasActiveConsent(orm, user!.id, 'whatsapp_opt_in')).toBe(true);
    expect(await pendingRow(contact)).toBeUndefined();
  });

  it('NO borra el alta y no crea a nadie', async () => {
    const contact = newContact();
    await send(contact, 'hola');

    const reply = await send(contact, 'No');

    expect(reply.messages[0]?.text).toBe(consent.rechazo);
    expect(await findUserByContact(orm, keys, contact)).toBeUndefined();
    expect(await pendingRow(contact)).toBeUndefined();
  });

  it('sin respuesta clara recuerda, y después de varios intentos deja de insistir y borra', async () => {
    const contact = newContact();
    await send(contact, 'hola');

    for (let prompt = 1; prompt < MAX_CONSENT_PROMPTS; prompt += 1) {
      expect((await send(contact, '¿qué es esto?')).messages[0]?.text).toBe(consent.recordatorio);
    }
    const last = await send(contact, '¿y?');

    expect(last.messages).toEqual([]);
    expect(await pendingRow(contact)).toBeUndefined();
  });

  it('antes de aceptar, un audio no se transcribe: se pide responder por escrito', async () => {
    const contact = newContact();
    await send(contact, 'hola');

    const reply = await router.handle({
      contact,
      now: monday,
      audio: { data: Buffer.from('a'), mimeType: 'audio/ogg', hintText: 'acepto' },
    });

    expect(reply.messages[0]?.text).toBe(consent.recordatorio);
    expect(reply.transcript).toBeUndefined();
    expect(await findUserByContact(orm, keys, contact)).toBeUndefined();
  });
});

describe('BAJA', () => {
  it('borra a la persona, su avance y sus pedidos de ayuda', async () => {
    const contact = await registered();
    await send(contact, 'hola');
    await send(contact, 'AYUDA');
    const user = await findUserByContact(orm, keys, contact);

    const reply = await send(contact, 'BAJA');

    expect(reply.messages[0]?.text).toBe(consent.baja);
    expect(reply.forgotten).toBe(true);
    expect(await orm.select().from(users).where(eq(users.id, user!.id))).toEqual([]);
    expect(
      await orm
        .select()
        .from(supportRequests)
        .where(eq(supportRequests.contactHash, hashContact(contact, keys))),
    ).toEqual([]);
  });

  it('también funciona durante el alta', async () => {
    const contact = newContact();
    await send(contact, 'hola');

    const reply = await send(contact, 'baja.');

    expect(reply.forgotten).toBe(true);
    expect(await pendingRow(contact)).toBeUndefined();
  });
});

describe('AYUDA', () => {
  it('abre un pedido para una persona del equipo, sin duplicarlo', async () => {
    const contact = await registered();

    const reply = await send(contact, 'Ayuda');
    await send(contact, 'AYUDA');

    expect(reply.messages[0]?.text).toBe(consent.ayuda);
    const open = await orm
      .select()
      .from(supportRequests)
      .where(eq(supportRequests.contactHash, hashContact(contact, keys)));
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ reason: 'ayuda', status: 'open' });
  });

  it('una práctica que menciona ayuda no se toma como pedido', async () => {
    const contact = await registered();
    await send(contact, 'hola');

    const reply = await send(contact, 'Necesito ayuda con una receta de papas y huevos para dos');

    expect(reply.messages[0]?.kind).toBe('feedback');
  });

  it('un mensaje de cuidado también avisa al equipo', async () => {
    const contact = await registered();

    const reply = await send(contact, 'Me quiero morir');

    expect(reply.messages[0]?.kind).toBe('care');
    const [request] = await orm
      .select()
      .from(supportRequests)
      .where(eq(supportRequests.contactHash, hashContact(contact, keys)));
    expect(request?.reason).toBe('care');
  });
});

describe('lecciones, una vez registrada', () => {
  it('recorre una lección completa y guarda la racha', async () => {
    const contact = await registered();

    const intro = await send(contact, 'hola');
    expect(intro.messages[0]).toMatchObject({ kind: 'intro', format: 'audio' });

    const practice = await send(contact, clearRequest);
    expect(practice.messages.map((message) => message.kind)).toEqual(['feedback', 'challenge']);

    const closing = await send(contact, 'Sí, listo');
    expect(closing.status).toMatchObject({ state: 'completed', streak: 1 });

    const sameDay = await send(contact, 'hola de nuevo');
    expect(sameDay.messages[0]?.text).toBe(INFO_MESSAGES.doneToday);

    const nextDay = await send(contact, 'buen día', tuesday);
    expect(nextDay.status.lessonId).toBe(lessons[1]?.id);
  });

  it('entiende un audio y le contesta con audio', async () => {
    const contact = await registered();
    await send(contact, 'hola');

    const reply = await router.handle({
      contact,
      now: monday,
      audio: { data: Buffer.from('a'), mimeType: 'audio/ogg', hintText: clearRequest },
    });

    expect(reply.transcript).toBe(clearRequest);
    expect(reply.messages.every((message) => message.format === 'audio')).toBe(true);
  });

  it('BAJA dicha en un audio también funciona', async () => {
    const contact = await registered();

    const reply = await router.handle({
      contact,
      now: monday,
      audio: { data: Buffer.from('a'), mimeType: 'audio/ogg', hintText: 'Baja.' },
    });

    expect(reply.forgotten).toBe(true);
    expect(await findUserByContact(orm, keys, contact)).toBeUndefined();
  });
});
