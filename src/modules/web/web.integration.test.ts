import { eq, inArray } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { loadEnv } from '../../config/env.js';
import { createDatabase, createOrm } from '../../shared/db/database.js';
import { productEvents, supportRequests, webParticipants } from '../../shared/db/schema.js';
import { hasActiveConsent } from '../consent/consent.repository.js';
import { ConversationService } from '../conversation/conversation-service.js';
import { MessageRouter } from '../conversation/message-router.js';
import { loadLessons } from '../lessons/lesson.loader.js';
import { DbEventRecorder } from '../metrics/product-events.js';
import { loadConsentContent, WEB_CONSENT_FILE } from '../onboarding/consent-content.js';
import { OnboardingService, WEB_CONSENTS } from '../onboarding/onboarding-service.js';
import { createLessonCalendar } from '../streaks/lesson-calendar.js';
import { InMemoryCostLedger } from '../tutor/cost-ledger.js';
import { LlmTutor } from '../tutor/llm-tutor.js';
import { MockLlmProvider } from '../tutor/mock-provider.js';
import { hashContact, webContact } from '../users/contact.js';
import { phoneKeysFromBase64 } from '../users/phone.js';
import { findUserByContact } from '../users/users.repository.js';
import { InMemoryAudioStore } from '../voice/audio-store.js';
import { MockSpeechToText, MockTextToSpeech } from '../voice/mock-speech.js';
import { VoiceService } from '../voice/voice-service.js';
import {
  createParticipants,
  findParticipantByToken,
  listParticipants,
  type Participant,
  replaceToken,
} from './participants.repository.js';
import { createWebBackend } from './web-backend.js';

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL);
const orm = createOrm(database);
const keys = phoneKeysFromBase64(env.PHONE_ENCRYPTION_KEY, env.PHONE_HASH_KEY);
const consent = loadConsentContent(WEB_CONSENT_FILE);
const lessons = loadLessons('content/lessons');
const ledger = new InMemoryCostLedger();
const events = new DbEventRecorder(orm, 'web');
const voice = new VoiceService({
  stt: new MockSpeechToText(),
  tts: new MockTextToSpeech(),
  store: new InMemoryAudioStore(),
  ledger,
  dailyBudgetUsd: 1,
});
const router = new MessageRouter({
  orm,
  keys,
  consent,
  onboarding: new OnboardingService({ orm, keys, consent, consentTypes: WEB_CONSENTS, events }),
  conversation: new ConversationService({
    orm,
    lessons,
    calendar: createLessonCalendar(),
    tutor: new LlmTutor({ provider: new MockLlmProvider(), ledger, dailyBudgetUsd: 1 }),
    voice,
    events,
  }),
  voice,
  events,
});
const backend = createWebBackend({ orm, keys, router, events });

const monday = new Date('2027-05-03T10:00:00-03:00');
const clearRequest = 'Tengo papas y huevos, ¿qué puedo cocinar hoy para dos personas?';

async function newParticipant(): Promise<Participant & { token: string }> {
  const [created] = await createParticipants(orm, keys, 1, monday);
  return created!;
}

const send = (participant: Participant, text: string, now = monday) =>
  backend.handle(participant, { text, now });

async function eventsOf(participant: Participant) {
  const user = await findUserByContact(orm, keys, webContact(participant.id));
  if (!user) return [];
  const rows = await orm.select().from(productEvents).where(eq(productEvents.subjectId, user.id));
  return rows.map((row) => row.type);
}

afterAll(() => database.end());

describe('participantes del piloto web', () => {
  it('crea códigos correlativos y guarda el token solo como hash y cifrado', async () => {
    const created = await createParticipants(orm, keys, 2, monday);
    const [first, second] = created;
    const rows = await orm
      .select()
      .from(webParticipants)
      .where(
        inArray(
          webParticipants.id,
          created.map((participant) => participant.id),
        ),
      );

    expect(Number(second!.code.slice(1))).toBe(Number(first!.code.slice(1)) + 1);
    expect(JSON.stringify(rows)).not.toContain(first!.token);
    expect(await findParticipantByToken(orm, first!.token)).toEqual({
      id: first!.id,
      code: first!.code,
      demo: false,
    });
  });

  it('un link nuevo reemplaza al anterior', async () => {
    const participant = await newParticipant();

    const token = await replaceToken(orm, keys, participant.id);

    expect(await findParticipantByToken(orm, participant.token)).toBeUndefined();
    expect((await findParticipantByToken(orm, token))?.id).toBe(participant.id);
  });
});

describe('recorrido por la web', () => {
  it('consentimiento primero: nadie existe hasta tocar ACEPTO, y solo con los términos', async () => {
    const participant = await newParticipant();
    const contact = webContact(participant.id);

    expect((await backend.state(participant, monday)).phase).toBe('welcome');

    const first = await send(participant, 'Hola');
    expect(first.messages[0]?.text).toBe(consent.pedido);
    expect(await findUserByContact(orm, keys, contact)).toBeUndefined();
    expect(await backend.state(participant, monday)).toMatchObject({
      phase: 'consent',
      consentText: consent.pedido,
    });

    const accepted = await send(participant, 'ACEPTO');
    const user = await findUserByContact(orm, keys, contact);
    expect(accepted.messages[0]?.text).toBe(consent.bienvenida);
    expect(await hasActiveConsent(orm, user!.id, 'terms_and_privacy')).toBe(true);
    expect(await hasActiveConsent(orm, user!.id, 'whatsapp_opt_in')).toBe(false);
    expect(await eventsOf(participant)).toEqual(['signup']);
  });

  it('completa una lección y deja los eventos para las métricas', async () => {
    const participant = await newParticipant();
    await send(participant, 'Hola');
    await send(participant, 'ACEPTO');

    const ready = await backend.state(participant, monday, { opened: true });
    expect(ready).toMatchObject({
      lesson: { kind: 'ready', lessonNumber: 1 },
      progress: { completed: 0, total: lessons.length },
    });

    const intro = await send(participant, 'Empezar la lección');
    expect(intro.messages[0]?.kind).toBe('intro');
    expect((await backend.state(participant, monday)).lesson).toMatchObject({
      kind: 'in_lesson',
      step: 'practice',
      lessonNumber: 1,
    });

    await send(participant, clearRequest);
    expect((await backend.state(participant, monday)).lesson).toMatchObject({
      kind: 'in_lesson',
      step: 'challenge',
    });

    await send(participant, 'Sí, lo hice');
    const done = await backend.state(participant, monday);
    expect(done).toMatchObject({
      streak: 1,
      lesson: { kind: 'done_today' },
      progress: { completed: 1 },
    });
    expect(await eventsOf(participant)).toEqual([
      'signup',
      'app_opened',
      'lesson_started',
      'lesson_completed',
    ]);
  });

  it('AYUDA abre un pedido y BAJA borra todo, cierra el link y deja los eventos anónimos', async () => {
    const participant = await newParticipant();
    const contact = webContact(participant.id);
    await send(participant, 'Hola');
    await send(participant, 'ACEPTO');
    const user = await findUserByContact(orm, keys, contact);

    const help = await send(participant, 'AYUDA');
    expect(help.messages[0]?.text).toBe(consent.ayuda);
    const requests = () =>
      orm
        .select()
        .from(supportRequests)
        .where(eq(supportRequests.contactHash, hashContact(contact, keys)));
    expect(await requests()).toHaveLength(1);

    const farewell = await send(participant, 'BAJA');

    expect(farewell).toMatchObject({ forgotten: true, messages: [{ text: consent.baja }] });
    expect(await findUserByContact(orm, keys, contact)).toBeUndefined();
    expect(await requests()).toHaveLength(0);
    expect(await findParticipantByToken(orm, participant.token)).toBeUndefined();

    const listed = (await listParticipants(orm, keys)).find((row) => row.id === participant.id);
    expect(listed).toMatchObject({ token: null, closedAt: expect.any(Date) });

    const left = await orm
      .select({ type: productEvents.type })
      .from(productEvents)
      .where(eq(productEvents.subjectId, user!.id));
    expect(left.map((row) => row.type)).toEqual(['signup', 'help_requested', 'unsubscribed']);
  });
});
