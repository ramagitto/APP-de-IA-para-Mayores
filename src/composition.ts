import { readFileSync } from 'node:fs';
import type { Env } from './config/env.js';
import { ConversationService } from './modules/conversation/conversation-service.js';
import { MessageRouter } from './modules/conversation/message-router.js';
import { loadLessons } from './modules/lessons/lesson.loader.js';
import { DemoService } from './modules/demo/demo-service.js';
import {
  type Channel,
  DbEventRecorder,
  type EventRecorder,
  NO_EVENTS,
} from './modules/metrics/product-events.js';
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
  /** Modo demo de la web: su propio router, sin métricas y con el gasto marcado como demo. */
  demo: DemoService;
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
  function buildRouter(
    channel: Channel,
    consentFile?: string,
    demo?: { events: EventRecorder; tutor: typeof tutor; voice: VoiceService },
  ): MessageRouter {
    const consent = loadConsentContent(consentFile);
    const events = demo?.events ?? new DbEventRecorder(orm, channel);
    const consentTypes = channel === 'web' ? WEB_CONSENTS : WHATSAPP_CONSENTS;
    const channelVoice = demo?.voice ?? voice;

    return new MessageRouter({
      orm,
      keys,
      consent,
      onboarding: new OnboardingService({ orm, keys, consent, consentTypes, events }),
      conversation: new ConversationService({
        orm,
        lessons,
        calendar,
        tutor: demo?.tutor ?? tutor,
        voice: channelVoice,
        events,
        demo: Boolean(demo),
      }),
      voice: channelVoice,
      events,
    });
  }

  // El demo usa los mismos proveedores, capas de seguridad y tope diario; solo cambia que no
  // anota eventos y que su gasto queda marcado para no contarlo en las métricas.
  const demoLedger = new DbCostLedger(orm, { demo: true });
  const demoRouter = buildRouter('web', WEB_CONSENT_FILE, {
    events: NO_EVENTS,
    tutor: createTutor(env, demoLedger),
    voice: createVoiceService(env, demoLedger, audioStore),
  });

  return {
    orm,
    keys,
    router: buildRouter('whatsapp'),
    webRouter: buildRouter('web', WEB_CONSENT_FILE),
    audioStore,
    voice,
    demo: new DemoService({ orm, keys, router: demoRouter, lessons, calendar }),
  };
}
