import { describe, expect, it } from 'vitest';
import { sampleLesson as lesson } from '../../../test/fixtures.js';
import {
  abandonAttempt,
  applyChallengeReport,
  applyPracticeReview,
  canRetryPractice,
  InvalidTransitionError,
  isOpen,
  type LessonTrigger,
  MAX_PAID_MESSAGES,
  type PracticeOutcome,
  startAttempt,
} from './lesson-attempt.js';

const now = new Date('2027-05-03T13:00:00Z');
const later = new Date('2027-05-03T13:05:00Z');
const report = { outcome: 'done' as const, now: later, streakNote: '' };

function start(trigger: LessonTrigger = 'user_message') {
  return startAttempt({ lesson, trigger, now }).attempt;
}

function review(outcome: PracticeOutcome) {
  return { outcome, feedback: 'Devolución del tutor' };
}

describe('startAttempt', () => {
  it('manda la intro en audio y espera la práctica', () => {
    const { attempt, messages } = startAttempt({ lesson, trigger: 'user_message', now });

    expect(attempt.state).toBe('awaiting_practice');
    expect(messages).toEqual([{ kind: 'intro', format: 'audio', text: lesson.introScript }]);
  });

  it('guarda la versión del contenido', () => {
    expect(start().lessonVersion).toBe(lesson.version);
  });

  it('si el usuario escribió, gasta un mensaje', () => {
    expect(start('user_message').paidMessagesUsed).toBe(1);
  });

  it('si hubo recordatorio, también cuenta ese mensaje', () => {
    expect(start('reminder').paidMessagesUsed).toBe(2);
  });
});

describe('práctica', () => {
  it('si salió bien, manda la devolución y el desafío juntos', () => {
    const { attempt, messages } = applyPracticeReview(start(), lesson, review('good'));

    expect(attempt.state).toBe('awaiting_challenge_report');
    expect(messages.map((message) => message.kind)).toEqual(['feedback', 'challenge']);
  });

  it('el desafío siempre incluye el recordatorio de seguridad', () => {
    const { messages } = applyPracticeReview(start(), lesson, review('good'));

    expect(messages[1]?.text).toContain(lesson.challengeSafetyReminder);
  });

  it('permite un reintento si alcanza el tope', () => {
    const { attempt, messages } = applyPracticeReview(start(), lesson, review('needs_retry'));

    expect(attempt.state).toBe('awaiting_practice');
    expect(attempt.practiceAttempts).toBe(1);
    expect(messages.map((message) => message.kind)).toEqual(['feedback']);
  });

  it('no permite un segundo reintento', () => {
    const first = applyPracticeReview(start(), lesson, review('needs_retry')).attempt;

    expect(canRetryPractice(first)).toBe(false);
    expect(applyPracticeReview(first, lesson, review('needs_retry')).attempt.state).toBe(
      'awaiting_challenge_report',
    );
  });

  it('si hubo recordatorio, no hay presupuesto para reintentar', () => {
    const attempt = start('reminder');

    expect(canRetryPractice(attempt)).toBe(false);
    expect(applyPracticeReview(attempt, lesson, review('needs_retry')).attempt.state).toBe(
      'awaiting_challenge_report',
    );
  });
});

describe('cierre', () => {
  const inChallenge = applyPracticeReview(start(), lesson, review('good')).attempt;

  it('completa la lección si pudo', () => {
    const { attempt, messages } = applyChallengeReport(inChallenge, lesson, report);

    expect(attempt).toMatchObject({
      state: 'completed',
      challengeOutcome: 'done',
      completedAt: later,
    });
    expect(messages[0]?.text).toBe(lesson.closingDone);
  });

  it('también completa si no pudo, con un mensaje de aliento', () => {
    const { attempt, messages } = applyChallengeReport(inChallenge, lesson, {
      ...report,
      outcome: 'not_done',
    });

    expect(attempt).toMatchObject({ state: 'completed', challengeOutcome: 'not_done' });
    expect(messages[0]?.text).toBe(lesson.closingNotDone);
  });

  it('suma la nota de la racha en el mismo mensaje', () => {
    const { messages } = applyChallengeReport(inChallenge, lesson, {
      ...report,
      streakNote: '¡Arrancaste tu racha!',
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]?.text).toBe(`${lesson.closingDone} ¡Arrancaste tu racha!`);
  });
});

describe('transiciones inválidas', () => {
  const inChallenge = applyPracticeReview(start(), lesson, review('good')).attempt;
  const completed = applyChallengeReport(inChallenge, lesson, report).attempt;

  it('no revisa una práctica fuera de su paso', () => {
    expect(() => applyPracticeReview(inChallenge, lesson, review('good'))).toThrow(
      InvalidTransitionError,
    );
  });

  it('no cierra el desafío antes de tiempo', () => {
    expect(() => applyChallengeReport(start(), lesson, report)).toThrow(InvalidTransitionError);
  });

  it('no abandona una lección terminada', () => {
    expect(() => abandonAttempt(completed, later)).toThrow(InvalidTransitionError);
  });
});

describe('abandono', () => {
  it('marca el intento y deja de estar abierto', () => {
    const attempt = abandonAttempt(start(), later);

    expect(attempt).toMatchObject({ state: 'abandoned', abandonedAt: later });
    expect(isOpen(attempt)).toBe(false);
  });
});

describe('tope de mensajes', () => {
  const paths: { trigger: LessonTrigger; reviews: PracticeOutcome[]; total: number }[] = [
    { trigger: 'user_message', reviews: ['good'], total: 4 },
    { trigger: 'user_message', reviews: ['needs_retry', 'good'], total: 5 },
    { trigger: 'user_message', reviews: ['needs_retry', 'needs_retry'], total: 5 },
    { trigger: 'reminder', reviews: ['good'], total: 5 },
    { trigger: 'reminder', reviews: ['needs_retry'], total: 5 },
  ];

  it.each(paths)(
    'con inicio $trigger y prácticas $reviews paga $total mensajes',
    ({ trigger, reviews, total }) => {
      let attempt = start(trigger);
      for (const outcome of reviews) {
        attempt = applyPracticeReview(attempt, lesson, review(outcome)).attempt;
      }
      attempt = applyChallengeReport(attempt, lesson, report).attempt;

      expect(attempt.state).toBe('completed');
      expect(attempt.paidMessagesUsed).toBe(total);
      expect(attempt.paidMessagesUsed).toBeLessThanOrEqual(MAX_PAID_MESSAGES);
    },
  );
});
