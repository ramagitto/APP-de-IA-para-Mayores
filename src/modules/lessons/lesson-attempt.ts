import type { Lesson } from './lesson.schema.js';

// Tope aprobado para controlar el costo: cada mensaje de Charlá se paga, incluido el recordatorio.
export const MAX_PAID_MESSAGES = 5;

// Mensajes que todavía hay que reservar después de una devolución con reintento:
// la segunda devolución, el desafío y el cierre.
const MESSAGES_NEEDED_AFTER_RETRY = 3;

export type AttemptState =
  'awaiting_practice' | 'awaiting_challenge_report' | 'completed' | 'abandoned';

export type LessonTrigger = 'user_message' | 'reminder';
export type ChallengeOutcome = 'done' | 'not_done';
export type PracticeOutcome = 'good' | 'needs_retry';

export interface LessonAttempt {
  lessonId: string;
  lessonVersion: number;
  state: AttemptState;
  trigger: LessonTrigger;
  paidMessagesUsed: number;
  practiceAttempts: number;
  challengeOutcome: ChallengeOutcome | null;
  startedAt: Date;
  completedAt: Date | null;
  abandonedAt: Date | null;
}

export interface OutgoingMessage {
  kind: 'intro' | 'feedback' | 'challenge' | 'closing';
  format: 'audio' | 'text';
  text: string;
}

export interface TransitionResult {
  attempt: LessonAttempt;
  messages: OutgoingMessage[];
}

export class InvalidTransitionError extends Error {
  constructor(state: AttemptState, action: string) {
    super(`No se puede ${action} con el intento en estado ${state}`);
    this.name = 'InvalidTransitionError';
  }
}

export function isOpen(attempt: LessonAttempt): boolean {
  return attempt.state === 'awaiting_practice' || attempt.state === 'awaiting_challenge_report';
}

function charge(attempt: LessonAttempt, messageCount: number): number {
  const total = attempt.paidMessagesUsed + messageCount;

  if (total > MAX_PAID_MESSAGES) {
    throw new Error(`La lección ${attempt.lessonId} superaría el tope de mensajes pagos`);
  }

  return total;
}

// Si la lección arrancó por un recordatorio, ese mensaje ya se pagó y cuenta para el tope.
export function startAttempt(input: {
  lesson: Lesson;
  trigger: LessonTrigger;
  now: Date;
}): TransitionResult {
  const { lesson, trigger, now } = input;

  return {
    attempt: {
      lessonId: lesson.id,
      lessonVersion: lesson.version,
      state: 'awaiting_practice',
      trigger,
      paidMessagesUsed: trigger === 'reminder' ? 2 : 1,
      practiceAttempts: 0,
      challengeOutcome: null,
      startedAt: now,
      completedAt: null,
      abandonedAt: null,
    },
    messages: [{ kind: 'intro', format: 'audio', text: lesson.introScript }],
  };
}

// El tutor lo consulta antes de escribir su devolución, para saber si puede invitar a reintentar.
export function canRetryPractice(attempt: LessonAttempt): boolean {
  return (
    attempt.state === 'awaiting_practice' &&
    attempt.paidMessagesUsed + 1 + MESSAGES_NEEDED_AFTER_RETRY <= MAX_PAID_MESSAGES
  );
}

export function applyPracticeReview(
  attempt: LessonAttempt,
  lesson: Lesson,
  review: { outcome: PracticeOutcome; feedback: string },
): TransitionResult {
  if (attempt.state !== 'awaiting_practice') {
    throw new InvalidTransitionError(attempt.state, 'revisar la práctica');
  }

  const feedback: OutgoingMessage = { kind: 'feedback', format: 'text', text: review.feedback };
  const practiceAttempts = attempt.practiceAttempts + 1;

  if (review.outcome === 'needs_retry' && canRetryPractice(attempt)) {
    return {
      attempt: { ...attempt, practiceAttempts, paidMessagesUsed: charge(attempt, 1) },
      messages: [feedback],
    };
  }

  return {
    attempt: {
      ...attempt,
      state: 'awaiting_challenge_report',
      practiceAttempts,
      paidMessagesUsed: charge(attempt, 2),
    },
    messages: [
      feedback,
      {
        kind: 'challenge',
        format: 'text',
        text: `${lesson.challengeText} ${lesson.challengeSafetyReminder}`,
      },
    ],
  };
}

export function applyChallengeReport(
  attempt: LessonAttempt,
  lesson: Lesson,
  report: { outcome: ChallengeOutcome; now: Date; streakNote: string },
): TransitionResult {
  if (attempt.state !== 'awaiting_challenge_report') {
    throw new InvalidTransitionError(attempt.state, 'cerrar el desafío');
  }

  const closing = report.outcome === 'done' ? lesson.closingDone : lesson.closingNotDone;

  return {
    attempt: {
      ...attempt,
      state: 'completed',
      challengeOutcome: report.outcome,
      completedAt: report.now,
      paidMessagesUsed: charge(attempt, 1),
    },
    messages: [{ kind: 'closing', format: 'text', text: `${closing} ${report.streakNote}`.trim() }],
  };
}

export function abandonAttempt(attempt: LessonAttempt, now: Date): LessonAttempt {
  if (!isOpen(attempt)) throw new InvalidTransitionError(attempt.state, 'abandonar');

  return { ...attempt, state: 'abandoned', abandonedAt: now };
}
