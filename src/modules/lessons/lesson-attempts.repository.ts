import { and, eq, inArray } from 'drizzle-orm';
import type { Orm } from '../../shared/db/database.js';
import { lessonAttempts } from '../../shared/db/schema.js';
import type { LessonAttempt } from './lesson-attempt.js';

export interface StoredAttempt {
  id: string;
  attempt: LessonAttempt;
}

function toStored(row: typeof lessonAttempts.$inferSelect): StoredAttempt {
  const { id, userId, ...attempt } = row;

  return { id, attempt };
}

export async function insertAttempt(
  orm: Orm,
  userId: string,
  attempt: LessonAttempt,
): Promise<string> {
  const [row] = await orm
    .insert(lessonAttempts)
    .values({ userId, ...attempt })
    .returning({ id: lessonAttempts.id });

  if (!row) throw new Error('No se pudo guardar el intento');
  return row.id;
}

export async function updateAttempt(orm: Orm, id: string, attempt: LessonAttempt): Promise<void> {
  await orm.update(lessonAttempts).set(attempt).where(eq(lessonAttempts.id, id));
}

export async function findOpenAttempt(
  orm: Orm,
  userId: string,
): Promise<StoredAttempt | undefined> {
  const [row] = await orm
    .select()
    .from(lessonAttempts)
    .where(
      and(
        eq(lessonAttempts.userId, userId),
        inArray(lessonAttempts.state, ['awaiting_practice', 'awaiting_challenge_report']),
      ),
    );

  return row && toStored(row);
}

export async function listCompletedLessonIds(orm: Orm, userId: string): Promise<string[]> {
  const rows = await orm
    .selectDistinct({ lessonId: lessonAttempts.lessonId })
    .from(lessonAttempts)
    .where(and(eq(lessonAttempts.userId, userId), eq(lessonAttempts.state, 'completed')));

  return rows.map((row) => row.lessonId);
}
