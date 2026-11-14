import { eq } from 'drizzle-orm';
import type { Orm } from '../../shared/db/database.js';
import { pendingSignups } from '../../shared/db/schema.js';
import type { CourseProgress, LessonStatus } from '../conversation/conversation-service.js';
import type {
  IncomingMessage,
  MessageRouter,
  RouterReply,
} from '../conversation/message-router.js';
import type { DemoAction, DemoLesson, DemoResult, DemoService } from '../demo/demo-service.js';
import { DbEventRecorder, type EventRecorder } from '../metrics/product-events.js';
import { loadConsentContent, WEB_CONSENT_FILE } from '../onboarding/consent-content.js';
import { hashContact, webContact } from '../users/contact.js';
import type { PhoneKeys } from '../users/phone.js';
import { findUserByContact } from '../users/users.repository.js';
import {
  closeParticipant,
  findParticipantByToken,
  markSeen,
  type Participant,
} from './participants.repository.js';

// welcome: nunca escribió. consent: ya vio el pedido de permiso. active: aceptó.
export type WebPhase = 'welcome' | 'consent' | 'active';

export interface WebState {
  phase: WebPhase;
  streak: number;
  lesson?: LessonStatus;
  progress?: CourseProgress;
  /** Solo en `consent`: el pedido de permiso, para mostrarlo aunque se haya recargado la página. */
  consentText?: string;
  /** Solo para participantes demo. Un participante real nunca recibe este campo. */
  demo?: { lessons: DemoLesson[] };
}

export type WebMessage = Omit<IncomingMessage, 'contact'>;

// Lo que necesitan las rutas de la web. Las rutas no saben de la base de datos: así se testean
// con un doble.
export interface WebBackend {
  findParticipant(token: string): Promise<Participant | undefined>;
  /** Con `opened`, además anota que la persona abrió la app (para las métricas). */
  state(participant: Participant, now: Date, options?: { opened?: boolean }): Promise<WebState>;
  handle(participant: Participant, message: WebMessage): Promise<RouterReply>;
  /** Atajos del modo demo. Con un participante real devuelve 'not_demo' y no toca nada. */
  demo(
    participant: Participant,
    action: DemoAction,
    now: Date,
    lessonId?: string,
  ): Promise<DemoResult | 'not_demo'>;
}

export interface WebBackendDeps {
  orm: Orm;
  keys: PhoneKeys;
  router: Pick<MessageRouter, 'handle' | 'conversation'>;
  events?: EventRecorder;
  /** Por defecto, el pedido de `content/consentimiento-web.yaml`. */
  consentText?: string;
  /** Sin esto, los participantes demo no pueden entrar. */
  demo?: DemoService;
}

export function createWebBackend(deps: WebBackendDeps): WebBackend {
  const { orm, keys, router } = deps;
  const events = deps.events ?? new DbEventRecorder(orm, 'web');
  const consentText = deps.consentText ?? loadConsentContent(WEB_CONSENT_FILE).pedido;
  const demo = deps.demo;
  // Cada participante va por su router: el demo, por el suyo, que no anota métricas.
  const routerFor = (participant: Participant) => (participant.demo ? demo?.router : router);

  async function baseState(
    participant: Participant,
    now: Date,
    options: { opened?: boolean },
  ): Promise<WebState> {
    const contact = webContact(participant.id);
    if (options.opened) await markSeen(orm, participant.id, now);

    const user = await findUserByContact(orm, keys, contact);
    if (user) {
      if (options.opened && !participant.demo) {
        await events.record({ subjectId: user.id, type: 'app_opened', occurredAt: now });
      }
      const status = await routerFor(participant)!.conversation.status(user.id, now);
      return {
        phase: 'active',
        streak: status.streak,
        lesson: status.lesson,
        progress: status.progress,
      };
    }

    const [pending] = await orm
      .select({ contactHash: pendingSignups.contactHash })
      .from(pendingSignups)
      .where(eq(pendingSignups.contactHash, hashContact(contact, keys)));

    return pending ? { phase: 'consent', streak: 0, consentText } : { phase: 'welcome', streak: 0 };
  }

  return {
    // Sin el servicio demo configurado, un link demo no funciona.
    async findParticipant(token) {
      const participant = await findParticipantByToken(orm, token);
      return participant && (!participant.demo || demo) ? participant : undefined;
    },

    async state(participant, now, options = {}) {
      const state = await baseState(participant, now, options);
      return participant.demo && demo ? { ...state, demo: { lessons: demo.lessons() } } : state;
    },

    async demo(participant, action, now, lessonId) {
      if (!participant.demo || !demo) return 'not_demo';
      return demo.run(webContact(participant.id), action, now, lessonId);
    },

    async handle(participant, message) {
      const channelRouter = routerFor(participant);
      if (!channelRouter) throw new Error('Participante demo sin modo demo configurado');
      const reply = await channelRouter.handle({ ...message, contact: webContact(participant.id) });

      // Con la BAJA, el link deja de funcionar.
      if (reply.forgotten) await closeParticipant(orm, participant.id, message.now);

      return reply;
    },
  };
}
