import type { PracticeReview, PracticeReviewRequest, Tutor } from '../lessons/tutor.js';
import { SimulatedTutor } from '../lessons/tutor.js';
import { redactSensitiveData } from '../safety/redact.js';
import { assessRisk, type RiskCategory } from '../safety/risk.js';
import { injectionRedirect } from '../safety/safety-messages.js';
import { toLocalDay } from '../streaks/lesson-calendar.js';
import type { CostLedger } from './cost-ledger.js';
import { type LlmProvider, NO_USAGE, type TokenUsage } from './llm-provider.js';
import { addSafetyNotes, findGuardFailures } from './output-guard.js';
import { estimateCostUsd, MOCK_PRICE_MODEL } from './pricing.js';
import { buildTutorPrompt } from './prompt.js';

export type ReviewRoute =
  | 'llm'
  | 'injection'
  | 'fallback_budget'
  | 'fallback_error'
  | 'fallback_refused'
  | 'fallback_invalid'
  | 'fallback_guard';

export interface ReviewDetails {
  review: PracticeReview;
  route: ReviewRoute;
  risks: RiskCategory[];
  guardFailures: string[];
  usage: TokenUsage;
  costUsd: number;
  /** Lo que se mandó al proveedor. Solo para evals y tests: nunca se escribe en los logs. */
  promptSentToProvider?: string;
}

export interface LlmTutorOptions {
  provider: LlmProvider;
  ledger: CostLedger;
  /** Tope de gasto en IA por persona y por día, en dólares. Al pasarlo se usa el respaldo. */
  dailyBudgetUsd: number;
  fallback?: Tutor;
  now?: () => Date;
  /** Recibe eventos sin datos personales: ruta, motivos y costos. */
  onEvent?: (event: { route: ReviewRoute; guardFailures: string[]; costUsd: number }) => void;
}

// El tutor con IA. El orden de las capas importa: reglas antes del modelo, controles después.
export class LlmTutor implements Tutor {
  private readonly fallback: Tutor;
  private readonly now: () => Date;

  constructor(private readonly options: LlmTutorOptions) {
    this.fallback = options.fallback ?? new SimulatedTutor();
    this.now = options.now ?? (() => new Date());
  }

  async review(request: PracticeReviewRequest): Promise<PracticeReview> {
    return (await this.reviewWithDetails(request)).review;
  }

  async reviewWithDetails(request: PracticeReviewRequest): Promise<ReviewDetails> {
    const risks = assessRisk(request.userText);
    const redaction = redactSensitiveData(request.userText);
    const safeRequest = { ...request, userText: redaction.text };
    const notesContext = { risks, redacted: redaction.redacted };

    const finish = (
      review: PracticeReview,
      route: ReviewRoute,
      extra: Partial<ReviewDetails> = {},
    ): ReviewDetails => {
      const details: ReviewDetails = {
        review: { ...review, feedback: addSafetyNotes(review.feedback, notesContext) },
        route,
        risks: [...risks],
        guardFailures: [],
        usage: NO_USAGE,
        costUsd: 0,
        ...extra,
      };
      this.options.onEvent?.({
        route,
        guardFailures: details.guardFailures,
        costUsd: details.costUsd,
      });
      return details;
    };

    const useFallback = async (route: ReviewRoute, extra: Partial<ReviewDetails> = {}) =>
      finish(await this.fallback.review(safeRequest), route, extra);

    // 1. Intentos de manipular al tutor: ni siquiera llegan al modelo.
    if (risks.has('prompt_injection')) {
      return finish(
        {
          outcome: request.retryAllowed ? 'needs_retry' : 'good',
          feedback: injectionRedirect(request.lesson.improvedExample),
        },
        'injection',
      );
    }

    // 2. Tope de costo diario por persona.
    const userId = request.userId ?? null;
    const day = toLocalDay(this.now());
    if ((await this.options.ledger.spentUsd(userId, day)) >= this.options.dailyBudgetUsd) {
      return useFallback('fallback_budget');
    }

    // 3. El modelo, con el texto ya sin datos sensibles.
    const prompt = buildTutorPrompt({
      lesson: request.lesson,
      userText: redaction.text,
      retryAllowed: request.retryAllowed,
      risks,
    });

    let result;
    try {
      result = await this.options.provider.generateReview(prompt);
    } catch {
      return useFallback('fallback_error', { promptSentToProvider: prompt.user });
    }

    const { provider } = this.options;
    const costUsd = estimateCostUsd(
      provider.name === 'mock' ? MOCK_PRICE_MODEL : provider.model,
      result.usage,
    );
    await this.options.ledger.record({
      userId,
      day,
      provider: provider.name,
      model: provider.model,
      purpose: 'tutor_review',
      usage: result.usage,
      costUsd,
    });

    const spend = { usage: result.usage, costUsd, promptSentToProvider: prompt.user };

    if (result.status !== 'ok') {
      return useFallback(
        result.status === 'refused' ? 'fallback_refused' : 'fallback_invalid',
        spend,
      );
    }

    // 4. Controles sobre la respuesta antes de mandarla.
    const guardFailures = findGuardFailures(result.review.feedback);
    if (guardFailures.length > 0) {
      return useFallback('fallback_guard', { ...spend, guardFailures });
    }

    const outcome = request.retryAllowed ? result.review.outcome : 'good';

    return finish({ outcome, feedback: result.review.feedback }, 'llm', spend);
  }
}
