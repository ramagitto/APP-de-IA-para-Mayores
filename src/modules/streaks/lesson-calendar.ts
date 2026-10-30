import { parse } from 'yaml';
import { z } from 'zod';

const TIME_ZONE = 'America/Argentina/Buenos_Aires';

// Un día se representa como texto AAAA-MM-DD, en horario de Buenos Aires.
export type LocalDay = string;

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function toLocalDay(instant: Date): LocalDay {
  return dayFormatter.format(instant);
}

function addDays(day: LocalDay, amount: number): LocalDay {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);

  return date.toISOString().slice(0, 10);
}

export interface LessonCalendar {
  isLessonDay(day: LocalDay): boolean;
  /** El último día de lección hasta esa fecha inclusive. Un sábado corresponde al viernes. */
  lessonDayFor(day: LocalDay): LocalDay;
  previousLessonDay(day: LocalDay): LocalDay;
}

// Hay lecciones de lunes a viernes, salvo los feriados.
export function createLessonCalendar(holidays: Iterable<LocalDay> = []): LessonCalendar {
  const holidaySet = new Set(holidays);

  function isLessonDay(day: LocalDay): boolean {
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();

    return weekday >= 1 && weekday <= 5 && !holidaySet.has(day);
  }

  function lessonDayFor(day: LocalDay): LocalDay {
    let candidate = day;
    while (!isLessonDay(candidate)) candidate = addDays(candidate, -1);

    return candidate;
  }

  return {
    isLessonDay,
    lessonDayFor,
    previousLessonDay: (day) => lessonDayFor(addDays(day, -1)),
  };
}

const holidaysSchema = z.object({
  feriados: z.array(
    z.object({
      fecha: z.iso.date(),
      nombre: z.string().min(1),
    }),
  ),
});

export function parseHolidays(yamlText: string): LocalDay[] {
  return holidaysSchema.parse(parse(yamlText)).feriados.map((holiday) => holiday.fecha);
}
