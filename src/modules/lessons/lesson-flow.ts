import type { LessonCalendar } from '../streaks/lesson-calendar.js';
import { registerCompletion, type Streak, streakNote } from '../streaks/streak.js';
import {
  applyChallengeReport,
  applyPracticeReview,
  canRetryPractice,
  type ChallengeOutcome,
  InvalidTransitionError,
  type LessonAttempt,
  type OutgoingMessage,
} from './lesson-attempt.js';
import type { Lesson } from './lesson.schema.js';
import type { Tutor } from './tutor.js';

export interface LessonTurnResult {
  attempt: LessonAttempt;
  streak: Streak;
  messages: OutgoingMessage[];
}

// Conecta el motor con el tutor y la racha. No sabe de WhatsApp ni de la base de datos.
export async function handleUserMessage(input: {
  attempt: LessonAttempt;
  lesson: Lesson;
  text: string;
  streak: Streak;
  tutor: Tutor;
  calendar: LessonCalendar;
  now: Date;
}): Promise<LessonTurnResult> {
  const { attempt, lesson, text, streak, tutor, calendar, now } = input;

  switch (attempt.state) {
    case 'awaiting_practice': {
      const review = await tutor.review({
        lesson,
        userText: text,
        retryAllowed: canRetryPractice(attempt),
      });

      return { ...applyPracticeReview(attempt, lesson, review), streak };
    }

    case 'awaiting_challenge_report': {
      const update = registerCompletion(streak, now, calendar);
      const result = applyChallengeReport(attempt, lesson, {
        outcome: classifyChallengeReport(text),
        now,
        streakNote: streakNote(update),
      });

      return { ...result, streak: update.streak };
    }

    default:
      throw new InvalidTransitionError(attempt.state, 'responder');
  }
}

// Un "no" suelto cuenta, pero no uno que arranca otra frase, como "no sabía que se podía".
const COULD_NOT_DO_IT =
  /^no\s*($|[,.!;])|\bno (pude|puedo|me salio|me sale|lo hice|lo logre|lo encontre|encontre|entendi|entiendo|supe|se)\b|\b(todavia|aun) no\b/;

// El paso con la IA real es autorreportado. Ante la duda se toma como hecho, para no desanimar.
export function classifyChallengeReport(text: string): ChallengeOutcome {
  const normalized = text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

  return COULD_NOT_DO_IT.test(normalized) ? 'not_done' : 'done';
}
