import { readFileSync } from 'node:fs';
import type { Env } from './config/env.js';
import { ConversationService } from './modules/conversation/conversation-service.js';
import { MessageRouter } from './modules/conversation/message-router.js';
import { loadLessons } from './modules/lessons/lesson.loader.js';
import { loadConsentContent } from './modules/onboarding/consent-content.js';
import { OnboardingService } from './modules/onboarding/onboarding-service.js';
import { createLessonCalendar, parseHolidays } from './modules/streaks/lesson-calendar.js';
import { createTutor } from './modules/tutor/create-tutor.js';
import { DbCostLedger } from './modules/tutor/usage-costs.repository.js';
import { phoneKeysFromBase64, type PhoneKeys } from './modules/users/phone.js';
import { type AudioStore, FileAudioStore } from './modules/voice/audio-store.js';
import { createVoiceService } from './modules/voice/create-voice.js';
import type { Orm } from './shared/db/database.js';

export interface Services {
  orm: Orm;
  keys: PhoneKeys;
  router: MessageRouter;
  audioStore: AudioStore;
}

// Arma y conecta los servicios. Lo usan el servidor y los scripts: un solo lugar donde cambiar.
export function buildServices(env: Env, orm: Orm): Services {
  const keys = phoneKeysFromBase64(env.PHONE_ENCRYPTION_KEY, env.PHONE_HASH_KEY);
  const ledger = new DbCostLedger(orm);
  const audioStore = new FileAudioStore(env.AUDIO_CACHE_DIR);
  const voice = createVoiceService(env, ledger, audioStore);
  const consent = loadConsentContent();

  const conversation = new ConversationService({
    orm,
    lessons: loadLessons('content/lessons'),
    calendar: createLessonCalendar(parseHolidays(readFileSync('content/feriados.yaml', 'utf8'))),
    tutor: createTutor(env, ledger),
    voice,
  });

  const router = new MessageRouter({
    orm,
    keys,
    consent,
    onboarding: new OnboardingService({ orm, keys, consent }),
    conversation,
    voice,
  });

  return { orm, keys, router, audioStore };
}
