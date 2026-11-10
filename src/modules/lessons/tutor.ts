import type { PracticeOutcome } from './lesson-attempt.js';
import type { Lesson } from './lesson.schema.js';

export interface PracticeReviewRequest {
  lesson: Lesson;
  userText: string;
  retryAllowed: boolean;
  /** Para el tope de costo diario por persona. Sin él, el gasto se cuenta como anónimo. */
  userId?: string;
}

export interface PracticeReview {
  outcome: PracticeOutcome;
  feedback: string;
}

// La implementación con modelo de lenguaje está en src/modules/tutor/llm-tutor.ts.
export interface Tutor {
  review(request: PracticeReviewRequest): Promise<PracticeReview>;
}

const MIN_WORDS_FOR_CLEAR_REQUEST = 6;

// Tutor por reglas: solo mira el largo del pedido. Sirve para tests y como respaldo cuando el
// proveedor de IA falla, se pasa del tope de costo o devuelve una respuesta que no pasa los controles.
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
