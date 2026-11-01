import { randomInt } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { sampleLesson as lesson } from '../../../test/fixtures.js';
import { loadEnv } from '../../config/env.js';
import { createDatabase, createOrm } from '../../shared/db/database.js';
import { consents, lessonAttempts, streaks, users } from '../../shared/db/schema.js';
import { hasActiveConsent, recordConsent, revokeConsent } from '../consent/consent.repository.js';
import { saveStreak, getStreak } from '../streaks/streaks.repository.js';
import { EMPTY_STREAK } from '../streaks/streak.js';
import { decryptPhone, phoneKeysFromBase64 } from '../users/phone.js';
import { createUser, deleteUser, findUserByPhone } from '../users/users.repository.js';
import { applyPracticeReview, startAttempt } from './lesson-attempt.js';
import {
  findOpenAttempt,
  insertAttempt,
  listCompletedLessonIds,
  updateAttempt,
} from './lesson-attempts.repository.js';

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL);
const orm = createOrm(database);
const keys = phoneKeysFromBase64(env.PHONE_ENCRYPTION_KEY, env.PHONE_HASH_KEY);
const now = new Date('2027-05-03T13:00:00Z');

function fakePhone(): string {
  return `+549110${randomInt(1_000_000, 9_999_999)}`;
}

async function newUser() {
  const phone = fakePhone();

  return { phone, user: await createUser(orm, keys, { phone, firstName: 'Prueba' }) };
}

function startedAttempt() {
  return startAttempt({ lesson, trigger: 'user_message', now }).attempt;
}

afterAll(() => database.end());

describe('usuarios', () => {
  it('guarda el teléfono cifrado y lo encuentra por hash', async () => {
    const { phone, user } = await newUser();

    expect(user.phoneEncrypted).not.toContain(phone.slice(1));
    expect(user.phoneHash).not.toContain(phone.slice(1));
    expect(decryptPhone(user.phoneEncrypted, keys)).toBe(phone);
    expect((await findUserByPhone(orm, keys, phone))?.id).toBe(user.id);
  });

  it('no permite dos usuarios con el mismo teléfono', async () => {
    const { phone } = await newUser();

    await expect(createUser(orm, keys, { phone })).rejects.toThrow();
  });

  it('borrar un usuario borra todos sus datos', async () => {
    const { user } = await newUser();
    await recordConsent(orm, {
      userId: user.id,
      type: 'terms_and_privacy',
      version: '1',
      now,
    });
    await insertAttempt(orm, user.id, startedAttempt());
    await saveStreak(orm, user.id, { current: 1, best: 1, lastCompletedDay: '2027-05-03' }, now);

    await deleteUser(orm, user.id);

    expect(await orm.select().from(users).where(eq(users.id, user.id))).toEqual([]);
    expect(await orm.select().from(consents).where(eq(consents.userId, user.id))).toEqual([]);
    expect(
      await orm.select().from(lessonAttempts).where(eq(lessonAttempts.userId, user.id)),
    ).toEqual([]);
    expect(await orm.select().from(streaks).where(eq(streaks.userId, user.id))).toEqual([]);
  });
});

describe('consentimientos', () => {
  it('registra y revoca', async () => {
    const { user } = await newUser();
    const type = 'whatsapp_opt_in';

    expect(await hasActiveConsent(orm, user.id, type)).toBe(false);

    await recordConsent(orm, { userId: user.id, type, version: '1', now });
    expect(await hasActiveConsent(orm, user.id, type)).toBe(true);

    await revokeConsent(orm, { userId: user.id, type, now });
    expect(await hasActiveConsent(orm, user.id, type)).toBe(false);
  });

  it('no permite dos consentimientos activos del mismo tipo', async () => {
    const { user } = await newUser();
    const input = { userId: user.id, type: 'whatsapp_opt_in' as const, version: '1', now };

    await recordConsent(orm, input);

    await expect(recordConsent(orm, input)).rejects.toThrow();
  });

  it('permite volver a aceptar después de revocar', async () => {
    const { user } = await newUser();
    const input = { userId: user.id, type: 'whatsapp_opt_in' as const, version: '1', now };

    await recordConsent(orm, input);
    await revokeConsent(orm, { ...input });
    await recordConsent(orm, { ...input, version: '2' });

    expect(await hasActiveConsent(orm, user.id, input.type)).toBe(true);
  });
});

describe('intentos de lección', () => {
  it('guarda, encuentra y actualiza el intento abierto', async () => {
    const { user } = await newUser();
    const id = await insertAttempt(orm, user.id, startedAttempt());

    expect((await findOpenAttempt(orm, user.id))?.attempt).toEqual(startedAttempt());

    const next = applyPracticeReview(startedAttempt(), lesson, {
      outcome: 'good',
      feedback: 'Bien',
    }).attempt;
    await updateAttempt(orm, id, next);

    expect((await findOpenAttempt(orm, user.id))?.attempt.state).toBe('awaiting_challenge_report');
  });

  it('un usuario no puede tener dos lecciones abiertas', async () => {
    const { user } = await newUser();
    await insertAttempt(orm, user.id, startedAttempt());

    await expect(insertAttempt(orm, user.id, startedAttempt())).rejects.toThrow();
  });

  it('la base rechaza superar el tope de mensajes', async () => {
    const { user } = await newUser();

    await expect(
      insertAttempt(orm, user.id, { ...startedAttempt(), paidMessagesUsed: 6 }),
    ).rejects.toThrow();
  });

  it('lista las lecciones completadas sin repetir', async () => {
    const { user } = await newUser();
    const completed = { ...startedAttempt(), state: 'completed' as const, completedAt: now };

    await insertAttempt(orm, user.id, completed);
    await insertAttempt(orm, user.id, completed);
    await insertAttempt(orm, user.id, { ...startedAttempt(), lessonId: 'n1-l02-abierta' });

    expect(await listCompletedLessonIds(orm, user.id)).toEqual([lesson.id]);
  });
});

describe('rachas', () => {
  it('devuelve una racha vacía si todavía no hay ninguna', async () => {
    const { user } = await newUser();

    expect(await getStreak(orm, user.id)).toEqual(EMPTY_STREAK);
  });

  it('guarda y sobrescribe', async () => {
    const { user } = await newUser();
    const first = { current: 1, best: 1, lastCompletedDay: '2027-05-03' };
    const second = { current: 2, best: 2, lastCompletedDay: '2027-05-04' };

    await saveStreak(orm, user.id, first, now);
    await saveStreak(orm, user.id, second, now);

    expect(await getStreak(orm, user.id)).toEqual(second);
  });
});
