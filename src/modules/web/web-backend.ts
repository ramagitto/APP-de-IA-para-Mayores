import { eq } from 'drizzle-orm';
import type { Orm } from '../../shared/db/database.js';
import { pendingSignups } from '../../shared/db/schema.js';
import type { CourseProgress, LessonStatus } from '../conversation/conversation-service.js';
import type {
  IncomingMessage,
  MessageRouter,
  RouterReply,
} from '../conversation/message-router.js';
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
}

export type WebMessage = Omit<IncomingMessage, 'contact'>;

// Lo que necesitan las rutas de la web. Las rutas no saben de la base de datos: así se testean
// con un doble.
export interface WebBackend {
  findParticipant(token: string): Promise<Participant | undefined>;
  /** Con `opened`, además anota que la persona abrió la app (para las métricas). */
  state(participant: Participant, now: Date, options?: { opened?: boolean }): Promise<WebState>;
  handle(participant: Participant, message: WebMessage): Promise<RouterReply>;
}

export interface WebBackendDeps {
  orm: Orm;
  keys: PhoneKeys;
  router: Pick<MessageRouter, 'handle' | 'conversation'>;
  events?: EventRecorder;
  /** Por defecto, el pedido de `content/consentimiento-web.yaml`. */
  consentText?: string;
}

export function createWebBackend(deps: WebBackendDeps): WebBackend {
  const { orm, keys, router } = deps;
  const events = deps.events ?? new DbEventRecorder(orm, 'web');
  const consentText = deps.consentText ?? loadConsentContent(WEB_CONSENT_FILE).pedido;

  return {
    findParticipant: (token) => findParticipantByToken(orm, token),

    async state(participant, now, options = {}) {
      const contact = webContact(participant.id);
      if (options.opened) await markSeen(orm, participant.id, now);

      const user = await findUserByContact(orm, keys, contact);
      if (user) {
        if (options.opened) {
          await events.record({ subjectId: user.id, type: 'app_opened', occurredAt: now });
        }
        const status = await router.conversation.status(user.id, now);
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

      return pending
        ? { phase: 'consent', streak: 0, consentText }
        : { phase: 'welcome', streak: 0 };
    },

    async handle(participant, message) {
      const reply = await router.handle({ ...message, contact: webContact(participant.id) });

      // Con la BAJA, el link deja de funcionar.
      if (reply.forgotten) await closeParticipant(orm, participant.id, message.now);

      return reply;
    },
  };
}
