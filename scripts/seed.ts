// Carga datos de prueba en la base local: npm run db:seed
// Se puede correr varias veces. Los teléfonos son inventados.
import { loadEnv } from '../src/config/env.js';
import { recordConsent } from '../src/modules/consent/consent.repository.js';
import { startAttempt } from '../src/modules/lessons/lesson-attempt.js';
import { insertAttempt } from '../src/modules/lessons/lesson-attempts.repository.js';
import { loadLessons } from '../src/modules/lessons/lesson.loader.js';
import { saveStreak } from '../src/modules/streaks/streaks.repository.js';
import { phoneKeysFromBase64 } from '../src/modules/users/phone.js';
import { createUser, findUserByPhone } from '../src/modules/users/users.repository.js';
import { createDatabase, createOrm } from '../src/shared/db/database.js';

const env = loadEnv();

if (env.APP_ENV !== 'local') {
  console.error('Los datos de prueba solo se cargan en local.');
  process.exit(1);
}

const database = createDatabase(env.DATABASE_URL);
const orm = createOrm(database);
const keys = phoneKeysFromBase64(env.PHONE_ENCRYPTION_KEY, env.PHONE_HASH_KEY);
const now = new Date();

const testUsers = [
  { phone: '+5491100000001', firstName: 'Usuaria de prueba A' },
  { phone: '+5491100000002', firstName: 'Usuaria de prueba B' },
  { phone: '+5491100000003', firstName: 'Usuario de prueba C' },
];

try {
  const [firstLesson] = loadLessons('content/lessons');
  let created = 0;

  for (const testUser of testUsers) {
    if (await findUserByPhone(orm, keys, testUser.phone)) continue;

    const user = await createUser(orm, keys, testUser);
    await recordConsent(orm, {
      userId: user.id,
      type: 'terms_and_privacy',
      version: 'semilla',
      now,
    });
    await saveStreak(orm, user.id, { current: 0, best: 0, lastCompletedDay: null }, now);

    if (firstLesson && created === 0) {
      const { attempt } = startAttempt({ lesson: firstLesson, trigger: 'user_message', now });
      await insertAttempt(orm, user.id, attempt);
    }

    created += 1;
  }

  console.log(`Usuarios de prueba creados: ${created}.`);
} finally {
  await database.end();
}
