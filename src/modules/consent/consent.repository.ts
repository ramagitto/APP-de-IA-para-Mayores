import { and, eq, isNull } from 'drizzle-orm';
import type { Orm } from '../../shared/db/database.js';
import { consents, consentType } from '../../shared/db/schema.js';

export type ConsentType = (typeof consentType.enumValues)[number];

export async function recordConsent(
  orm: Orm,
  input: { userId: string; type: ConsentType; version: string; now: Date },
): Promise<void> {
  await orm.insert(consents).values({
    userId: input.userId,
    type: input.type,
    version: input.version,
    grantedAt: input.now,
  });
}

export async function revokeConsent(
  orm: Orm,
  input: { userId: string; type: ConsentType; now: Date },
): Promise<void> {
  await orm
    .update(consents)
    .set({ revokedAt: input.now })
    .where(activeConsent(input.userId, input.type));
}

export async function hasActiveConsent(
  orm: Orm,
  userId: string,
  type: ConsentType,
): Promise<boolean> {
  const rows = await orm
    .select({ id: consents.id })
    .from(consents)
    .where(activeConsent(userId, type));

  return rows.length > 0;
}

function activeConsent(userId: string, type: ConsentType) {
  return and(eq(consents.userId, userId), eq(consents.type, type), isNull(consents.revokedAt));
}
