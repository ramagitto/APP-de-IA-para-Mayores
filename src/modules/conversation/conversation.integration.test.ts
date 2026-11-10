import { randomInt } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { loadEnv } from '../../config/env.js';
import { createDatabase, createOrm } from '../../shared/db/database.js';
import { loadLessons } from '../lessons/lesson.loader.js';
import { createLessonCalendar } from '../streaks/lesson-calendar.js';
import { InMemoryCostLedger } from '../tutor/cost-ledger.js';
import { LlmTutor } from '../tutor/llm-tutor.js';
import { MockLlmProvider } from '../tutor/mock-provider.js';
import { phoneKeysFromBase64 } from '../users/phone.js';
import { findUserByPhone } from '../users/users.repository.js';
import { InMemoryAudioStore } from '../voice/audio-store.js';
import { MockSpeechToText } from '../voice/mock-speech.js';
import type { TextToSpeech } from '../voice/speech.js';
import { VoiceService } from '../voice/voice-service.js';
import { ConversationService, INFO_MESSAGES } from './conversation-service.js';

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL);
const orm = createOrm(database);
const keys = phoneKeysFromBase64(env.PHONE_ENCRYPTION_KEY, env.PHONE_HASH_KEY);
const lessons = loadLessons('content/lessons');
const ledger = new InMemoryCostLedger();

// Texto a voz de prueba: genera un audio falso, para verificar cuándo se pide audio.
const tts: TextToSpeech = {
  name: 'prueba',
  voiceKey: 'prueba',
  synthesize: async () => ({ audio: Buffer.from('ogg'), mimeType: 'audio/ogg', costUsd: 0 }),
};

const service = new ConversationService({
  orm,
  keys,
  lessons,
  calendar: createLessonCalendar(),
  tutor: new LlmTutor({ provider: new MockLlmProvider(), ledger, dailyBudgetUsd: 1 }),
  voice: new VoiceService({
    stt: new MockSpeechToText(),
    tts,
    store: new InMemoryAudioStore(),
    ledger,
    dailyBudgetUsd: 1,
  }),
});

const monday = new Date('2027-05-03T10:00:00-03:00');
const tuesday = new Date('2027-05-04T10:00:00-03:00');
const clearRequest = 'Tengo papas y huevos, ¿qué puedo cocinar hoy para dos personas?';

function fakePhone(): string {
  return `+549110${randomInt(1_000_000, 9_999_999)}`;
}

afterAll(() => database.end());

describe('ConversationService', () => {
  it('cualquier mensaje arranca la primera lección, con la intro en audio', async () => {
    const reply = await service.handle({ phone: fakePhone(), text: 'hola', now: monday });

    expect(reply.messages).toHaveLength(1);
    expect(reply.messages[0]).toMatchObject({ kind: 'intro', format: 'audio' });
    expect(reply.messages[0]?.audioId).toMatch(/^[0-9a-f]{64}$/);
    expect(reply.status).toMatchObject({ lessonId: lessons[0]?.id, state: 'awaiting_practice' });
  });

  it('recorre una lección completa y guarda la racha', async () => {
    const phone = fakePhone();
    await service.handle({ phone, text: 'hola', now: monday });

    const practice = await service.handle({ phone, text: clearRequest, now: monday });
    expect(practice.messages.map((message) => message.kind)).toEqual(['feedback', 'challenge']);

    const closing = await service.handle({ phone, text: 'Sí, listo', now: monday });
    expect(closing.messages[0]?.kind).toBe('closing');
    expect(closing.status).toMatchObject({ state: 'completed', streak: 1 });
  });

  it('una sola lección por día, y al día siguiente sigue la próxima', async () => {
    const phone = fakePhone();
    await service.handle({ phone, text: 'hola', now: monday });
    await service.handle({ phone, text: clearRequest, now: monday });
    await service.handle({ phone, text: 'Sí', now: monday });

    const sameDay = await service.handle({ phone, text: 'hola de nuevo', now: monday });
    expect(sameDay.messages[0]).toMatchObject({ kind: 'info', text: INFO_MESSAGES.doneToday });

    const nextDay = await service.handle({ phone, text: 'buen día', now: tuesday });
    expect(nextDay.status.lessonId).toBe(lessons[1]?.id);
  });

  it('entiende un audio y le contesta también con audio', async () => {
    const phone = fakePhone();
    await service.handle({ phone, text: 'hola', now: monday });

    const reply = await service.handle({
      phone,
      now: monday,
      audio: { data: Buffer.from('audio'), mimeType: 'audio/webm', hintText: clearRequest },
    });

    expect(reply.transcript).toBe(clearRequest);
    expect(reply.messages.every((message) => message.format === 'audio')).toBe(true);
  });

  it('si no entiende el audio, lo pide de nuevo sin avanzar la lección', async () => {
    const phone = fakePhone();
    await service.handle({ phone, text: 'hola', now: monday });

    const reply = await service.handle({
      phone,
      now: monday,
      audio: { data: Buffer.from('audio'), mimeType: 'audio/webm' },
    });

    expect(reply.messages[0]?.text).toBe(INFO_MESSAGES.unclearAudio);
  });

  it('cuida a la persona aunque no tenga una lección en curso', async () => {
    const reply = await service.handle({
      phone: fakePhone(),
      text: 'Me quiero morir',
      now: monday,
    });

    expect(reply.messages[0]).toMatchObject({ kind: 'care', format: 'text' });
    expect(reply.status.lessonId).toBeUndefined();
  });

  it('los mensajes de cuidado van en texto aunque la persona haya hablado', async () => {
    const reply = await service.handle({
      phone: fakePhone(),
      now: monday,
      audio: { data: Buffer.from('a'), mimeType: 'audio/webm', hintText: 'Me vaciaron la cuenta' },
    });

    expect(reply.messages[0]).toMatchObject({ kind: 'care', format: 'text' });
  });

  it('olvidar a una persona borra sus datos', async () => {
    const phone = fakePhone();
    await service.handle({ phone, text: 'hola', now: monday });

    await service.forget(phone);

    expect(await findUserByPhone(orm, keys, phone)).toBeUndefined();
  });
});
