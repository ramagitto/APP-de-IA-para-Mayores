import { readFileSync } from 'node:fs';
import type { Env } from './config/env.js';
import { ConversationService } from './modules/conversation/conversation-service.js';
import { MessageRouter } from './modules/conversation/message-router.js';
import { loadLessons } from './modules/lessons/lesson.loader.js';
import { type Channel, DbEventRecorder } from './modules/metrics/product-events.js';
import { loadConsentContent, WEB_CONSENT_FILE } from './modules/onboarding/consent-content.js';
import {
  OnboardingService,
  WEB_CONSENTS,
  WHATSAPP_CONSENTS,
} from './modules/onboarding/onboarding-service.js';
import { createLessonCalendar, parseHolidays } from './modules/streaks/lesson-calendar.js';
import { createTutor } from './modules/tutor/create-tutor.js';
import { DbCostLedger } from './modules/tutor/usage-costs.repository.js';
import { phoneKeysFromBase64, type PhoneKeys } from './modules/users/phone.js';
import { type AudioStore, FileAudioStore } from './modules/voice/audio-store.js';
import { createVoiceService } from './modules/voice/create-voice.js';
import type { VoiceService } from './modules/voice/voice-service.js';
import type { Orm } from './shared/db/database.js';

export interface Services {
  orm: Orm;
  keys: PhoneKeys;
  /** WhatsApp y el simulador. */
  router: MessageRouter;
  /** El piloto web: mismo motor, con su texto de consentimiento. */
  webRouter: MessageRouter;
  audioStore: AudioStore;
  voice: VoiceService;
}

// Arma y conecta los servicios. Lo usan el servidor y los scripts: un solo lugar donde cambiar.
export function buildServices(env: Env, orm: Orm): Services {
  const keys = phoneKeysFromBase64(env.PHONE_ENCRYPTION_KEY, env.PHONE_HASH_KEY);
  const ledger = new DbCostLedger(orm);
  const audioStore = new FileAudioStore(env.AUDIO_CACHE_DIR);
  const voice = createVoiceService(env, ledger, audioStore);
  const lessons = loadLessons('content/lessons');
  const calendar = createLessonCalendar(
    parseHolidays(readFileSync('content/feriados.yaml', 'utf8')),
  );
  const tutor = createTutor(env, ledger);

  // Cada canal tiene su texto de consentimiento y anota sus eventos con su nombre.
  function buildRouter(channel: Channel, consentFile?: string): MessageRouter {
    const consent = loadConsentContent(consentFile);
    const events = new DbEventRecorder(orm, channel);
    const consentTypes = channel === 'web' ? WEB_CONSENTS : WHATSAPP_CONSENTS;

    return new MessageRouter({
      orm,
      keys,
      consent,
      onboarding: new OnboardingService({ orm, keys, consent, consentTypes, events }),
      conversation: new ConversationService({ orm, lessons, calendar, tutor, voice, events }),
      voice,
      events,
    });
  }

  return {
    orm,
    keys,
    router: buildRouter('whatsapp'),
    webRouter: buildRouter('web', WEB_CONSENT_FILE),
    audioStore,
    voice,
  };
}
