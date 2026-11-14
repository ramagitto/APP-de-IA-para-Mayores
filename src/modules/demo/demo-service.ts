import type { Orm } from '../../shared/db/database.js';
import type { RouterReply } from '../conversation/message-router.js';
import type { MessageRouter } from '../conversation/message-router.js';
import {
  applyChallengeReport,
  applyPracticeReview,
  type LessonAttempt,
  startAttempt,
} from '../lessons/lesson-attempt.js';
import { deleteAttempts, insertAttempt } from '../lessons/lesson-attempts.repository.js';
import type { Lesson } from '../lessons/lesson.schema.js';
import { type LessonCalendar, toLocalDay } from '../streaks/lesson-calendar.js';
import type { Streak } from '../streaks/streak.js';
import { saveStreak } from '../streaks/streaks.repository.js';
import type { ContactId } from '../users/contact.js';
import type { PhoneKeys } from '../users/phone.js';
import { findUserByContact } from '../users/users.repository.js';

// Modo demo: atajos para mostrar la app en una presentación sin esperar días. Solo se usa con
// participantes demo (los crea `npm run pilot -- demo`). Las palabras AYUDA y BAJA y los
// mensajes de cuidado no pasan por acá: siguen en el MessageRouter, igual que siempre.

export const DEMO_ACTIONS = [
  'restart',
  'lesson',
  'antiscam',
  'challenge',
  'progress',
  'end',
] as const;
export type DemoAction = (typeof DEMO_ACTIONS)[number];

export interface DemoLesson {
  id: string;
  number: number;
  title: string;
  antiscam: boolean;
}

export type DemoResult = RouterReply | 'needs_consent' | 'unknown_lesson';

export interface DemoServiceDeps {
  orm: Orm;
  keys: PhoneKeys;
  /** Un router armado con `demo: true` y sin eventos de métricas. */
  router: MessageRouter;
  lessons: Lesson[];
  calendar: LessonCalendar;
}

/** Racha "de ayer": así la próxima lección la continúa. Pura: la fecha entra como parámetro. */
export function demoStreak(current: number, now: Date, calendar: LessonCalendar): Streak {
  const today = calendar.lessonDayFor(toLocalDay(now));
  return { current, best: current, lastCompletedDay: calendar.previousLessonDay(today) };
}

/** Un intento ya terminado, armado con el mismo motor que usa el curso. */
export function completedAttempt(lesson: Lesson, now: Date): LessonAttempt {
  const started = startAttempt({ lesson, trigger: 'user_message', now }).attempt;
  const reviewed = applyPracticeReview(started, lesson, { outcome: 'good', feedback: '' }).attempt;
  return applyChallengeReport(reviewed, lesson, { outcome: 'done', now, streakNote: '' }).attempt;
}

export class DemoService {
  private readonly levelOne: Lesson[];

  constructor(private readonly deps: DemoServiceDeps) {
    this.levelOne = deps.lessons.filter((lesson) => lesson.level === 1);
  }

  get router(): MessageRouter {
    return this.deps.router;
  }

  /** Las lecciones del nivel 1, para el menú "Ir a la lección...". */
  lessons(): DemoLesson[] {
    return this.levelOne.map((lesson, index) => ({
      id: lesson.id,
      number: index + 1,
      title: lesson.title,
      antiscam: lesson.kind === 'antiscam',
    }));
  }

  async run(
    contact: ContactId,
    action: DemoAction,
    now: Date,
    lessonId?: string,
  ): Promise<DemoResult> {
    const { orm, keys, router, calendar } = this.deps;

    // Volver a empezar: como una BAJA, pero el link sigue andando.
    if (action === 'restart') {
      await router.forget(contact, now);
      return { messages: [], status: { streak: 0 }, forgotten: false };
    }

    // Los atajos no saltean el consentimiento: nadie se crea en `users` sin un ACEPTO.
    const user = await findUserByContact(orm, keys, contact);
    if (!user) return 'needs_consent';

    const conversation = router.conversation;
    const reply = (result: Awaited<ReturnType<typeof conversation.startDemoLesson>>) => ({
      ...result,
      forgotten: false,
    });

    switch (action) {
      case 'lesson': {
        if (!this.levelOne.some((lesson) => lesson.id === lessonId)) return 'unknown_lesson';
        return reply(await conversation.startDemoLesson(user.id, lessonId!, now));
      }
      case 'antiscam': {
        // La última de antiestafas del nivel: "Mensajes sospechosos".
        const lesson = this.levelOne.filter((each) => each.kind === 'antiscam').at(-1);
        if (!lesson) return 'unknown_lesson';
        return reply(await conversation.startDemoLesson(user.id, lesson.id, now));
      }
      case 'challenge': {
        // La lección que sigue, ya en el desafío, con una racha de 3 que se continúa al terminar.
        const { progress } = await conversation.status(user.id, now);
        const lesson = this.levelOne[Math.min(progress.completed, this.levelOne.length - 1)]!;
        await saveStreak(orm, user.id, demoStreak(3, now, calendar), now);
        return reply(await conversation.startDemoLesson(user.id, lesson.id, now, 'challenge'));
      }
      case 'progress': {
        // Racha de 7 días y 6 lecciones hechas: el inicio muestra la lección 7.
        await this.seed(user.id, 6, 7, now);
        return { messages: [], status: { streak: 7 }, forgotten: false };
      }
      case 'end': {
        // 9 hechas y la 10 en el desafío: con "Sí, lo hice" se ve el final del nivel.
        await this.seed(user.id, this.levelOne.length - 1, this.levelOne.length - 1, now);
        const last = this.levelOne.at(-1)!;
        return reply(await conversation.startDemoLesson(user.id, last.id, now, 'challenge'));
      }
    }
  }

  private async seed(userId: string, completed: number, streak: number, now: Date) {
    const { orm, calendar } = this.deps;
    await deleteAttempts(orm, userId);
    for (const lesson of this.levelOne.slice(0, completed)) {
      await insertAttempt(orm, userId, completedAttempt(lesson, now));
    }
    await saveStreak(orm, userId, demoStreak(streak, now, calendar), now);
  }
}
