import type { PracticeOutcome } from './lesson-attempt.js';
import type { Lesson } from './lesson.schema.js';

export interface PracticeReviewRequest {
  lesson: Lesson;
  userText: string;
  retryAllowed: boolean;
}

export interface PracticeReview {
  outcome: PracticeOutcome;
  feedback: string;
}

// La Fase 2 agrega una implementación con un modelo de lenguaje real detrás de esta interfaz.
export interface Tutor {
  review(request: PracticeReviewRequest): Promise<PracticeReview>;
}

const MIN_WORDS_FOR_CLEAR_REQUEST = 6;

// Tutor de mentira para desarrollar y testear sin gastar en IA: solo mira el largo del pedido.
export class SimulatedTutor implements Tutor {
  async review({ lesson, userText, retryAllowed }: PracticeReviewRequest): Promise<PracticeReview> {
    const example = `"${lesson.improvedExample}"`;
    const words = userText.trim().split(/\s+/).filter(Boolean).length;

    if (words >= MIN_WORDS_FOR_CLEAR_REQUEST) {
      return {
        outcome: 'good',
        feedback: `¡Muy bien! Se entiende lo que pedís. Otra forma: ${example}`,
      };
    }

    if (retryAllowed) {
      return {
        outcome: 'needs_retry',
        feedback: `Vas bien. Probemos con más detalle, por ejemplo: ${example}. Probá de nuevo.`,
      };
    }

    return { outcome: 'good', feedback: `Vas bien. Con más detalle queda mejor: ${example}` };
  }
}
