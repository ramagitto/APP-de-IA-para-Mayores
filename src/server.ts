import { readFileSync } from 'node:fs';
import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';
import { ConversationService } from './modules/conversation/conversation-service.js';
import { loadLessons } from './modules/lessons/lesson.loader.js';
import type { SimulatorDeps } from './modules/simulator/simulator.routes.js';
import { createLessonCalendar, parseHolidays } from './modules/streaks/lesson-calendar.js';
import { createTutor } from './modules/tutor/create-tutor.js';
import { DbCostLedger } from './modules/tutor/usage-costs.repository.js';
import { phoneKeysFromBase64 } from './modules/users/phone.js';
import { FileAudioStore } from './modules/voice/audio-store.js';
import { createVoiceService } from './modules/voice/create-voice.js';
import { createDatabase, createOrm, type Database, pingDatabase } from './shared/db/database.js';

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL);

function buildSimulator(db: Database): SimulatorDeps {
  const orm = createOrm(db);
  const ledger = new DbCostLedger(orm);
  const audioStore = new FileAudioStore(env.AUDIO_CACHE_DIR);

  return {
    audioStore,
    conversation: new ConversationService({
      orm,
      keys: phoneKeysFromBase64(env.PHONE_ENCRYPTION_KEY, env.PHONE_HASH_KEY),
      lessons: loadLessons('content/lessons'),
      calendar: createLessonCalendar(parseHolidays(readFileSync('content/feriados.yaml', 'utf8'))),
      tutor: createTutor(env, ledger),
      voice: createVoiceService(env, ledger, audioStore),
    }),
  };
}

const app = buildApp({
  logLevel: env.LOG_LEVEL,
  checkDatabase: () => pingDatabase(database),
  // El simulador no tiene login: solo existe en local.
  simulator: env.APP_ENV === 'local' ? buildSimulator(database) : undefined,
});

async function shutdown(): Promise<void> {
  await app.close();
  await database.end();
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());

await app.listen({ host: '0.0.0.0', port: env.PORT });

if (env.APP_ENV === 'local') {
  app.log.info(`Simulador en http://localhost:${env.PORT}/simulador`);
}
