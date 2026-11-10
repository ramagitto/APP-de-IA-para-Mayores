import { eq } from 'drizzle-orm';
import type { Orm } from '../../shared/db/database.js';
import { users } from '../../shared/db/schema.js';
import { encryptPhone, hashPhone, normalizePhone, type PhoneKeys } from './phone.js';

export type User = typeof users.$inferSelect;

export async function createUser(
  orm: Orm,
  keys: PhoneKeys,
  input: { phone: string; firstName?: string },
): Promise<User> {
  const phone = normalizePhone(input.phone);
  const [user] = await orm
    .insert(users)
    .values({
      phoneHash: hashPhone(phone, keys),
      phoneEncrypted: encryptPhone(phone, keys),
      firstName: input.firstName,
    })
    .returning();

  if (!user) throw new Error('No se pudo crear el usuario');
  return user;
}

export async function findUserByPhone(
  orm: Orm,
  keys: PhoneKeys,
  rawPhone: string,
): Promise<User | undefined> {
  const phoneHash = hashPhone(normalizePhone(rawPhone), keys);
  const [user] = await orm.select().from(users).where(eq(users.phoneHash, phoneHash));

  return user;
}

// Borra también sus consentimientos, intentos y rachas (ON DELETE CASCADE).
export async function deleteUser(orm: Orm, userId: string): Promise<void> {
  await orm.delete(users).where(eq(users.id, userId));
}
