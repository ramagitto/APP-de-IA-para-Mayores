import type { TutorEnv } from '../../config/env.js';
import { AnthropicProvider } from './anthropic-provider.js';
import type { CostLedger } from './cost-ledger.js';
import type { LlmProvider } from './llm-provider.js';
import { LlmTutor, type LlmTutorOptions } from './llm-tutor.js';
import { MockLlmProvider } from './mock-provider.js';

export function createProvider(env: TutorEnv): LlmProvider {
  if (env.LLM_PROVIDER === 'anthropic' && env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider({ apiKey: env.ANTHROPIC_API_KEY, model: env.TUTOR_MODEL });
  }

  return new MockLlmProvider();
}

export function createTutor(
  env: TutorEnv,
  ledger: CostLedger,
  options: Pick<LlmTutorOptions, 'onEvent' | 'now'> = {},
): LlmTutor {
  return new LlmTutor({
    provider: createProvider(env),
    ledger,
    dailyBudgetUsd: env.TUTOR_DAILY_BUDGET_USD,
    ...options,
  });
}
