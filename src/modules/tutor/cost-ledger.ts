import type { LocalDay } from '../streaks/lesson-calendar.js';
import type { TokenUsage } from './llm-provider.js';

export interface CostEntry {
  userId: string | null;
  day: LocalDay;
  provider: string;
  model: string;
  purpose: 'tutor_review';
  usage: TokenUsage;
  costUsd: number;
}

// Registro del costo de IA. Sirve para el tope diario por persona y para medir el costo del piloto.
export interface CostLedger {
  spentUsd(userId: string | null, day: LocalDay): Promise<number>;
  record(entry: CostEntry): Promise<void>;
}

export class InMemoryCostLedger implements CostLedger {
  readonly entries: CostEntry[] = [];

  async spentUsd(userId: string | null, day: LocalDay): Promise<number> {
    return this.entries
      .filter((entry) => entry.userId === userId && entry.day === day)
      .reduce((total, entry) => total + entry.costUsd, 0);
  }

  async record(entry: CostEntry): Promise<void> {
    this.entries.push(entry);
  }
}
