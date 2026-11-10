import { eq } from 'drizzle-orm';
import type { Orm } from '../../shared/db/database.js';
import { streaks } from '../../shared/db/schema.js';
import { EMPTY_STREAK, type Streak } from './streak.js';

export async function getStreak(orm: Orm, userId: string): Promise<Streak> {
  const [row] = await orm
    .select({
      current: streaks.current,
      best: streaks.best,
      lastCompletedDay: streaks.lastCompletedDay,
    })
    .from(streaks)
    .where(eq(streaks.userId, userId));

  return row ?? EMPTY_STREAK;
}

export async function saveStreak(
  orm: Orm,
  userId: string,
  streak: Streak,
  now: Date,
): Promise<void> {
  const values = { ...streak, updatedAt: now };

  await orm
    .insert(streaks)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: streaks.userId, set: values });
}
