import { describe, expect, it } from 'vitest';
import { createLessonCalendar, parseHolidays, toLocalDay } from './lesson-calendar.js';
import {
  canStartLesson,
  currentStreak,
  EMPTY_STREAK,
  registerCompletion,
  streakNote,
  type Streak,
} from './streak.js';

// Mayo de 2027: el lunes 3 es día de lección y el martes 25 es feriado.
const calendar = createLessonCalendar(['2027-05-25']);

function at(day: string, time = '12:00'): Date {
  return new Date(`${day}T${time}:00-03:00`);
}

function complete(streak: Streak, ...days: string[]): Streak {
  return days.reduce((acc, day) => registerCompletion(acc, at(day), calendar).streak, streak);
}

describe('toLocalDay', () => {
  it('usa el día de Buenos Aires, no el de UTC', () => {
    expect(toLocalDay(new Date('2027-05-04T02:30:00Z'))).toBe('2027-05-03');
    expect(toLocalDay(new Date('2027-05-04T03:30:00Z'))).toBe('2027-05-04');
  });
});

describe('calendario de lecciones', () => {
  it('tiene lecciones de lunes a viernes', () => {
    expect(calendar.isLessonDay('2027-05-03')).toBe(true);
    expect(calendar.isLessonDay('2027-05-07')).toBe(true);
    expect(calendar.isLessonDay('2027-05-08')).toBe(false);
    expect(calendar.isLessonDay('2027-05-09')).toBe(false);
  });

  it('no tiene lección los feriados', () => {
    expect(calendar.isLessonDay('2027-05-25')).toBe(false);
  });

  it('asigna el fin de semana al viernes anterior', () => {
    expect(calendar.lessonDayFor('2027-05-08')).toBe('2027-05-07');
    expect(calendar.lessonDayFor('2027-05-09')).toBe('2027-05-07');
  });

  it('salta fines de semana y feriados hacia atrás', () => {
    expect(calendar.previousLessonDay('2027-05-10')).toBe('2027-05-07');
    expect(calendar.previousLessonDay('2027-05-26')).toBe('2027-05-24');
  });
});

describe('registerCompletion', () => {
  it('arranca en 1 la primera vez', () => {
    const update = registerCompletion(EMPTY_STREAK, at('2027-05-03'), calendar);

    expect(update.change).toBe('started');
    expect(update.streak).toEqual({ current: 1, best: 1, lastCompletedDay: '2027-05-03' });
  });

  it('suma con lecciones de días seguidos', () => {
    expect(complete(EMPTY_STREAK, '2027-05-03', '2027-05-04', '2027-05-05').current).toBe(3);
  });

  it('el fin de semana no corta la racha', () => {
    expect(complete(EMPTY_STREAK, '2027-05-07', '2027-05-10').current).toBe(2);
  });

  it('un feriado no corta la racha', () => {
    expect(complete(EMPTY_STREAK, '2027-05-24', '2027-05-26').current).toBe(2);
  });

  it('una segunda lección el mismo día no suma', () => {
    const streak = complete(EMPTY_STREAK, '2027-05-03');
    const update = registerCompletion(streak, at('2027-05-03', '18:00'), calendar);

    expect(update.change).toBe('unchanged');
    expect(update.streak.current).toBe(1);
  });

  it('hacer el sábado la lección del viernes cuenta y sigue la racha', () => {
    const streak = complete(EMPTY_STREAK, '2027-05-06', '2027-05-08');

    expect(streak).toMatchObject({ current: 2, lastCompletedDay: '2027-05-07' });
    expect(complete(streak, '2027-05-10').current).toBe(3);
  });

  it('si faltó a una lección, reinicia sin perder la mejor racha', () => {
    const streak = complete(EMPTY_STREAK, '2027-05-03', '2027-05-04');
    const update = registerCompletion(streak, at('2027-05-06'), calendar);

    expect(update.change).toBe('restarted');
    expect(update.streak).toEqual({ current: 1, best: 2, lastCompletedDay: '2027-05-06' });
  });

  it('una fecha anterior a la última no cambia nada', () => {
    const streak = complete(EMPTY_STREAK, '2027-05-05');

    expect(registerCompletion(streak, at('2027-05-04'), calendar).change).toBe('unchanged');
  });
});

describe('currentStreak', () => {
  const streak = complete(EMPTY_STREAK, '2027-05-05', '2027-05-06', '2027-05-07');

  it('vale 0 si nunca hizo una lección', () => {
    expect(currentStreak(EMPTY_STREAK, at('2027-05-03'), calendar)).toBe(0);
  });

  it('se mantiene el mismo día', () => {
    expect(currentStreak(streak, at('2027-05-07'), calendar)).toBe(3);
  });

  it('se mantiene durante el fin de semana', () => {
    expect(currentStreak(streak, at('2027-05-09'), calendar)).toBe(3);
  });

  it('se mantiene el lunes, mientras todavía puede hacer la lección', () => {
    expect(currentStreak(streak, at('2027-05-10'), calendar)).toBe(3);
  });

  it('vuelve a 0 si faltó a una lección programada', () => {
    expect(currentStreak(streak, at('2027-05-11'), calendar)).toBe(0);
  });
});

describe('canStartLesson', () => {
  it('permite la primera lección', () => {
    expect(canStartLesson(EMPTY_STREAK, at('2027-05-03'), calendar)).toBe(true);
  });

  it('permite una por día de lección', () => {
    const streak = complete(EMPTY_STREAK, '2027-05-03');

    expect(canStartLesson(streak, at('2027-05-03', '20:00'), calendar)).toBe(false);
    expect(canStartLesson(streak, at('2027-05-04'), calendar)).toBe(true);
  });

  it('el fin de semana permite recuperar la del viernes, una sola vez', () => {
    const missedFriday = complete(EMPTY_STREAK, '2027-05-06');
    const didFriday = complete(EMPTY_STREAK, '2027-05-07');

    expect(canStartLesson(missedFriday, at('2027-05-08'), calendar)).toBe(true);
    expect(canStartLesson(didFriday, at('2027-05-08'), calendar)).toBe(false);
  });
});

describe('streakNote', () => {
  it('nunca reta a quien cortó la racha', () => {
    const streak = complete(EMPTY_STREAK, '2027-05-03');
    const note = streakNote(registerCompletion(streak, at('2027-05-06'), calendar));

    expect(note).toContain('volviste');
    expect(note).not.toMatch(/perdiste|cortaste|fallaste|lástima/i);
  });

  it('celebra la continuidad con el número', () => {
    const streak = complete(EMPTY_STREAK, '2027-05-03');

    expect(streakNote(registerCompletion(streak, at('2027-05-04'), calendar))).toContain('2');
  });

  it('no agrega nada si la racha no cambió', () => {
    const streak = complete(EMPTY_STREAK, '2027-05-03');

    expect(streakNote(registerCompletion(streak, at('2027-05-03'), calendar))).toBe('');
  });
});

describe('parseHolidays', () => {
  it('lee el archivo de feriados', () => {
    const yaml = 'feriados:\n  - fecha: 2027-05-25\n    nombre: Revolución de Mayo\n';

    expect(parseHolidays(yaml)).toEqual(['2027-05-25']);
  });

  it('rechaza una fecha inválida', () => {
    expect(() => parseHolidays('feriados:\n  - fecha: mañana\n    nombre: X\n')).toThrow();
  });
});
