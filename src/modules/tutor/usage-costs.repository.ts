import { and, eq, isNull, sum } from 'drizzle-orm';
import type { Orm } from '../../shared/db/database.js';
import { usageCosts } from '../../shared/db/schema.js';
import type { LocalDay } from '../streaks/lesson-calendar.js';
import type { CostEntry, CostLedger } from './cost-ledger.js';

const MICROS_PER_USD = 1_000_000;

export class DbCostLedger implements CostLedger {
  /** Con `demo`, el gasto queda marcado y fuera de las métricas. El tope diario es el mismo. */
  constructor(
    private readonly orm: Orm,
    private readonly options: { demo?: boolean } = {},
  ) {}

  async spentUsd(userId: string | null, day: LocalDay): Promise<number> {
    const [row] = await this.orm
      .select({ total: sum(usageCosts.costUsdMicros) })
      .from(usageCosts)
      .where(
        and(
          userId === null ? isNull(usageCosts.userId) : eq(usageCosts.userId, userId),
          eq(usageCosts.day, day),
        ),
      );

    return Number(row?.total ?? 0) / MICROS_PER_USD;
  }

  async record(entry: CostEntry): Promise<void> {
    await this.orm.insert(usageCosts).values({
      userId: entry.userId,
      day: entry.day,
      provider: entry.provider,
      model: entry.model,
      purpose: entry.purpose,
      inputTokens: entry.usage.inputTokens,
      outputTokens: entry.usage.outputTokens,
      cacheReadTokens: entry.usage.cacheReadTokens,
      cacheWriteTokens: entry.usage.cacheWriteTokens,
      costUsdMicros: Math.ceil(entry.costUsd * MICROS_PER_USD),
      demo: this.options.demo ?? false,
    });
  }
}
