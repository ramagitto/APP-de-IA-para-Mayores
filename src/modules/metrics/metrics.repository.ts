import { asc, sql } from 'drizzle-orm';
import type { Orm } from '../../shared/db/database.js';
import { productEvents, usageCosts } from '../../shared/db/schema.js';
import type { ProductEvent } from './product-events.js';

export async function loadEvents(orm: Orm): Promise<ProductEvent[]> {
  const rows = await orm.select().from(productEvents).orderBy(asc(productEvents.occurredAt));

  return rows.map((row) => ({
    subjectId: row.subjectId,
    type: row.type,
    occurredAt: row.occurredAt,
    ...(row.lessonId && { lessonId: row.lessonId }),
    ...(row.trigger && { trigger: row.trigger }),
  }));
}

/** Costo de IA por persona y total, en dólares. */
export async function loadCosts(
  orm: Orm,
): Promise<{ bySubject: Map<string, number>; totalUsd: number }> {
  const rows = await orm
    .select({
      userId: usageCosts.userId,
      micros: sql<string>`sum(${usageCosts.costUsdMicros})`,
    })
    .from(usageCosts)
    .groupBy(usageCosts.userId);

  const bySubject = new Map<string, number>();
  let totalUsd = 0;
  for (const row of rows) {
    const usd = Number(row.micros) / 1_000_000;
    totalUsd += usd;
    if (row.userId) bySubject.set(row.userId, usd);
  }
  return { bySubject, totalUsd };
}
