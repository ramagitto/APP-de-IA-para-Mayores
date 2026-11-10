import { type LessonCalendar, type LocalDay, toLocalDay } from './lesson-calendar.js';

export interface Streak {
  current: number;
  best: number;
  lastCompletedDay: LocalDay | null;
}

export const EMPTY_STREAK: Streak = { current: 0, best: 0, lastCompletedDay: null };

export type StreakChange = 'started' | 'continued' | 'restarted' | 'unchanged';

export interface StreakUpdate {
  streak: Streak;
  change: StreakChange;
}

// La racha cuenta lecciones programadas, así el fin de semana y los feriados no la cortan.
export function registerCompletion(
  streak: Streak,
  now: Date,
  calendar: LessonCalendar,
): StreakUpdate {
  const day = calendar.lessonDayFor(toLocalDay(now));
  const last = streak.lastCompletedDay;

  if (last !== null && last >= day) return { streak, change: 'unchanged' };

  const continued = last === calendar.previousLessonDay(day);
  const current = continued ? streak.current + 1 : 1;

  return {
    streak: { current, best: Math.max(streak.best, current), lastCompletedDay: day },
    change: last === null ? 'started' : continued ? 'continued' : 'restarted',
  };
}

// Lo que se le muestra al usuario hoy: si faltó a una lección programada, la racha vuelve a cero.
export function currentStreak(streak: Streak, now: Date, calendar: LessonCalendar): number {
  if (streak.lastCompletedDay === null) return 0;

  const day = calendar.lessonDayFor(toLocalDay(now));
  const stillActive =
    streak.lastCompletedDay >= day || streak.lastCompletedDay === calendar.previousLessonDay(day);

  return stillActive ? streak.current : 0;
}

export function canStartLesson(streak: Streak, now: Date, calendar: LessonCalendar): boolean {
  const day = calendar.lessonDayFor(toLocalDay(now));

  return streak.lastCompletedDay === null || streak.lastCompletedDay < day;
}

// Nunca reta: si la racha se cortó, celebra que volvió. Lo aprendido no se pierde.
export function streakNote({ streak, change }: StreakUpdate): string {
  switch (change) {
    case 'started':
      return '¡Arrancaste tu racha!';
    case 'continued':
      return `Ya son ${streak.current} lecciones seguidas. ¡Qué bien!`;
    case 'restarted':
      return 'Qué bueno que volviste. Todo lo que aprendiste sigue con vos.';
    case 'unchanged':
      return '';
  }
}
