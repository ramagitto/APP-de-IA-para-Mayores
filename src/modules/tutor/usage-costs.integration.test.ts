import { randomInt } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { loadEnv } from '../../config/env.js';
import { createDatabase, createOrm } from '../../shared/db/database.js';
import { usageCosts } from '../../shared/db/schema.js';
import { phoneContact } from '../users/contact.js';
import { phoneKeysFromBase64 } from '../users/phone.js';
import { createUser, deleteUser } from '../users/users.repository.js';
import { DbCostLedger } from './usage-costs.repository.js';

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL);
const orm = createOrm(database);
const keys = phoneKeysFromBase64(env.PHONE_ENCRYPTION_KEY, env.PHONE_HASH_KEY);
const ledger = new DbCostLedger(orm);
const usage = { inputTokens: 1200, outputTokens: 150, cacheReadTokens: 900, cacheWriteTokens: 0 };

async function newUserId(): Promise<string> {
  const user = await createUser(orm, keys, {
    contact: phoneContact(`+549110${randomInt(1_000_000, 9_999_999)}`),
  });
  return user.id;
}

function entry(userId: string | null, day: string, costUsd: number) {
  return {
    userId,
    day,
    provider: 'mock',
    model: 'mock',
    purpose: 'tutor_review' as const,
    usage,
    costUsd,
  };
}

afterAll(() => database.end());

describe('DbCostLedger', () => {
  it('suma lo gastado por persona y por día', async () => {
    const userId = await newUserId();

    await ledger.record(entry(userId, '2027-05-03', 0.0002));
    await ledger.record(entry(userId, '2027-05-03', 0.0003));
    await ledger.record(entry(userId, '2027-05-04', 0.01));

    expect(await ledger.spentUsd(userId, '2027-05-03')).toBeCloseTo(0.0005, 6);
    expect(await ledger.spentUsd(userId, '2027-05-05')).toBe(0);
  });

  it('redondea hacia arriba para no subestimar', async () => {
    const userId = await newUserId();

    await ledger.record(entry(userId, '2027-05-03', 0.0000001));

    expect(await ledger.spentUsd(userId, '2027-05-03')).toBe(0.000001);
  });

  it('al dar de baja a la persona, el costo se conserva pero sin usuario', async () => {
    const userId = await newUserId();
    const marker = randomInt(100_000, 999_999);
    await ledger.record(entry(userId, '2027-05-03', marker / 1_000_000));

    await deleteUser(orm, userId);

    const rows = await orm
      .select({ userId: usageCosts.userId })
      .from(usageCosts)
      .where(eq(usageCosts.costUsdMicros, marker));
    expect(rows).toEqual([{ userId: null }]);
  });
});
