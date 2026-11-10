import type { PracticeOutcome } from '../lessons/lesson-attempt.js';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export const NO_USAGE: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

export interface TutorPrompt {
  /** Instrucciones fijas. Siempre iguales, para que el proveedor las pueda cachear. */
  system: string;
  /** La lección, las indicaciones del turno y el texto del usuario, ya sin datos sensibles. */
  user: string;
  /** Datos ya separados. Solo los usa el proveedor simulado; uno real lee `user`. */
  hints: { userText: string; retryAllowed: boolean; improvedExample: string };
}

export interface ProviderReview {
  outcome: PracticeOutcome;
  feedback: string;
}

export type ProviderResult =
  | { status: 'ok'; review: ProviderReview; usage: TokenUsage }
  | { status: 'refused' | 'invalid'; usage: TokenUsage };

// Cada proveedor (simulado, Anthropic u otro) es un adaptador. Cambiar de proveedor no toca al tutor.
export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  generateReview(prompt: TutorPrompt): Promise<ProviderResult>;
}
