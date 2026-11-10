import { eq, lt } from 'drizzle-orm';
import type { Orm } from '../../shared/db/database.js';
import { pendingSignups } from '../../shared/db/schema.js';
import { recordConsent } from '../consent/consent.repository.js';
import type { OutgoingMessage } from '../lessons/lesson-attempt.js';
import { type ContactId, hashContact } from '../users/contact.js';
import type { PhoneKeys } from '../users/phone.js';
import { createUser } from '../users/users.repository.js';
import type { ConsentContent } from './consent-content.js';
import { detectKeyword } from './keywords.js';

// Después de este número de pedidos sin respuesta, se borra el alta y no se insiste más.
export const MAX_CONSENT_PROMPTS = 3;
// Un alta sin respuesta se borra a los 7 días (la Fase 5 programa la limpieza).
export const PENDING_SIGNUP_DAYS = 7;

export interface OnboardingDeps {
  orm: Orm;
  keys: PhoneKeys;
  consent: ConsentContent;
}

export interface OnboardingResult {
  messages: OutgoingMessage[];
  userId?: string;
}

function info(text: string): OutgoingMessage {
  return { kind: 'info', format: 'text', text };
}

// Alta con consentimiento primero. Antes de que la persona acepte, solo existe el hash de su
// contacto en pending_signups. Nadie se crea en `users` sin un ACEPTO explícito.
export class OnboardingService {
  constructor(private readonly deps: OnboardingDeps) {}

  async handle(input: { contact: ContactId; text: string; now: Date }): Promise<OnboardingResult> {
    const { orm, keys, consent } = this.deps;
    const contactHash = hashContact(input.contact, keys);
    const [pending] = await orm
      .select()
      .from(pendingSignups)
      .where(eq(pendingSignups.contactHash, contactHash));

    if (!pending) {
      await orm.insert(pendingSignups).values({ contactHash, createdAt: input.now });
      return { messages: [info(consent.pedido)] };
    }

    const keyword = detectKeyword(input.text);

    if (keyword === 'acepto') {
      const user = await createUser(orm, keys, { contact: input.contact });
      for (const type of ['terms_and_privacy', 'whatsapp_opt_in'] as const) {
        await recordConsent(orm, {
          userId: user.id,
          type,
          version: consent.version,
          now: input.now,
        });
      }
      await this.cancel(input.contact);

      return { messages: [info(consent.bienvenida)], userId: user.id };
    }

    if (keyword === 'rechazo') {
      await this.cancel(input.contact);
      return { messages: [info(consent.rechazo)] };
    }

    if (pending.promptsSent >= MAX_CONSENT_PROMPTS) {
      // No insistimos más: se borra todo y no se responde.
      await this.cancel(input.contact);
      return { messages: [] };
    }

    await orm
      .update(pendingSignups)
      .set({ promptsSent: pending.promptsSent + 1 })
      .where(eq(pendingSignups.contactHash, contactHash));

    return { messages: [info(consent.recordatorio)] };
  }

  /** Borra el alta en curso, si existe. */
  async cancel(contact: ContactId): Promise<void> {
    await this.deps.orm
      .delete(pendingSignups)
      .where(eq(pendingSignups.contactHash, hashContact(contact, this.deps.keys)));
  }
}

/** Borra las altas sin respuesta. Devuelve cuántas borró. */
export async function deleteExpiredPendingSignups(orm: Orm, now: Date): Promise<number> {
  const limit = new Date(now.getTime() - PENDING_SIGNUP_DAYS * 24 * 60 * 60 * 1000);
  const deleted = await orm
    .delete(pendingSignups)
    .where(lt(pendingSignups.createdAt, limit))
    .returning({ contactHash: pendingSignups.contactHash });

  return deleted.length;
}
