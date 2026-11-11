import { eq } from 'drizzle-orm';
import type { Orm } from '../../shared/db/database.js';
import { users } from '../../shared/db/schema.js';
import { type ContactId, encryptContact, hashContact } from './contact.js';
import type { PhoneKeys } from './phone.js';

export type User = typeof users.$inferSelect;

// Solo el alta, después del consentimiento explícito, crea personas (ver src/modules/onboarding).
export async function createUser(
  orm: Orm,
  keys: PhoneKeys,
  input: { contact: ContactId; firstName?: string },
): Promise<User> {
  const [user] = await orm
    .insert(users)
    .values({
      contactHash: hashContact(input.contact, keys),
      contactEncrypted: encryptContact(input.contact, keys),
      firstName: input.firstName,
      status: 'active',
    })
    .returning();

  if (!user) throw new Error('No se pudo crear el usuario');
  return user;
}

export async function findUserByContact(
  orm: Orm,
  keys: PhoneKeys,
  contact: ContactId,
): Promise<User | undefined> {
  const [user] = await orm
    .select()
    .from(users)
    .where(eq(users.contactHash, hashContact(contact, keys)));

  return user;
}

// Borra también sus consentimientos, intentos, rachas y pedidos de ayuda (ON DELETE CASCADE).
export async function deleteUser(orm: Orm, userId: string): Promise<void> {
  await orm.delete(users).where(eq(users.id, userId));
}
