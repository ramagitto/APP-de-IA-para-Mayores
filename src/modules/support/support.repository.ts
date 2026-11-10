import { and, asc, eq } from 'drizzle-orm';
import type { Orm } from '../../shared/db/database.js';
import { supportRequests } from '../../shared/db/schema.js';
import { type ContactId, decryptContact, encryptContact, hashContact } from '../users/contact.js';
import type { PhoneKeys } from '../users/phone.js';

export type SupportReason = 'ayuda' | 'care';

export interface SupportRequest {
  id: string;
  reason: SupportReason;
  createdAt: Date;
  hasUser: boolean;
}

// Abre un pedido para que una persona del equipo responda. Si ya hay uno abierto con el mismo
// motivo para ese contacto, no se duplica.
export async function openSupportRequest(
  orm: Orm,
  keys: PhoneKeys,
  input: { contact: ContactId; userId: string | null; reason: SupportReason; now: Date },
): Promise<void> {
  const contactHash = hashContact(input.contact, keys);
  const [existing] = await orm
    .select({ id: supportRequests.id })
    .from(supportRequests)
    .where(
      and(
        eq(supportRequests.contactHash, contactHash),
        eq(supportRequests.reason, input.reason),
        eq(supportRequests.status, 'open'),
      ),
    );

  if (existing) return;

  await orm.insert(supportRequests).values({
    userId: input.userId,
    contactHash,
    contactEncrypted: encryptContact(input.contact, keys),
    reason: input.reason,
    createdAt: input.now,
  });
}

export async function listOpenSupportRequests(orm: Orm): Promise<SupportRequest[]> {
  const rows = await orm
    .select()
    .from(supportRequests)
    .where(eq(supportRequests.status, 'open'))
    .orderBy(asc(supportRequests.createdAt));

  return rows.map((row) => ({
    id: row.id,
    reason: row.reason,
    createdAt: row.createdAt,
    hasUser: row.userId !== null,
  }));
}

/** El contacto descifrado, solo para responderle. No se muestra ni se guarda en logs. */
export async function supportContact(
  orm: Orm,
  keys: PhoneKeys,
  id: string,
): Promise<ContactId | undefined> {
  const [row] = await orm.select().from(supportRequests).where(eq(supportRequests.id, id));
  return row && decryptContact(row.contactEncrypted, keys);
}

export async function closeSupportRequest(orm: Orm, id: string, now: Date): Promise<void> {
  await orm
    .update(supportRequests)
    .set({ status: 'closed', closedAt: now })
    .where(eq(supportRequests.id, id));
}

export async function deleteSupportRequestsByContact(
  orm: Orm,
  keys: PhoneKeys,
  contact: ContactId,
): Promise<void> {
  await orm
    .delete(supportRequests)
    .where(eq(supportRequests.contactHash, hashContact(contact, keys)));
}
