import { type LessonCalendar, type LocalDay, toLocalDay } from '../streaks/lesson-calendar.js';
import type { ProductEvent } from './product-events.js';

// Indicadores del piloto, calculados a partir de los eventos. Es una función pura: la fecha de
// corte entra como parámetro y no toca la base de datos.
//
// Definiciones (ver ADR 0011):
// - Retención a 14 días: de las personas con 14 días o más desde el alta, cuántas iniciaron al
//   menos una lección el día 14 o después. Quien se dio de baja cuenta como no retenida.
// - Activa en la segunda semana: inició alguna lección entre los días 7 y 13 desde el alta.
// - Activa el día 30: igual que la retención, desde el día 30 (dato complementario).
// - Autoinicio: lecciones que arrancó la persona, sin recordatorio automático.

export const RETENTION_DAY = 14;
export const REVIEW_DAY = 30;

export interface SubjectMetrics {
  /** Número correlativo por orden de alta: no identifica a nadie fuera de este archivo. */
  person: string;
  signupDay: LocalDay;
  daysSinceSignup: number;
  lessonsStarted: number;
  lessonsCompleted: number;
  selfStarted: number;
  activeDays: number;
  bestStreak: number;
  /** null: todavía no pasaron los días necesarios para medirlo. */
  retained14: boolean | null;
  activeWeek2: boolean | null;
  activeDay30: boolean | null;
  unsubscribed: boolean;
  helpRequests: number;
  careMessages: number;
  costUsd: number;
}

export interface SummaryRow {
  metric: string;
  value: number | null;
  detail: string;
}

export interface DailyRow {
  day: LocalDay;
  signups: number;
  opened: number;
  started: number;
  completed: number;
  unsubscribed: number;
}

export interface PilotMetrics {
  people: SubjectMetrics[];
  summary: SummaryRow[];
  daily: DailyRow[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from: LocalDay, to: LocalDay): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

function percent(part: number, total: number): number | null {
  return total === 0 ? null : Math.round((part / total) * 1000) / 10;
}

// La racha más larga, en días de lección seguidos con una lección completada.
function bestStreak(days: LocalDay[], calendar: LessonCalendar): number {
  const lessonDays = [...new Set(days.map((day) => calendar.lessonDayFor(day)))].sort();
  let best = 0;
  let current = 0;
  let previous: LocalDay | undefined;

  for (const day of lessonDays) {
    current =
      previous !== undefined && calendar.previousLessonDay(day) === previous ? current + 1 : 1;
    best = Math.max(best, current);
    previous = day;
  }
  return best;
}

export function computePilotMetrics(input: {
  events: ProductEvent[];
  /** Costo de IA por persona, en dólares. Lo de quienes se dieron de baja queda sin persona. */
  costBySubject: Map<string, number>;
  /** Costo total, incluido el que ya no tiene persona. */
  totalCostUsd: number;
  asOf: Date;
  calendar: LessonCalendar;
}): PilotMetrics {
  const { events, costBySubject, totalCostUsd, calendar } = input;
  const today = toLocalDay(input.asOf);
  const bySubject = new Map<string, ProductEvent[]>();

  for (const event of events) {
    const list = bySubject.get(event.subjectId) ?? [];
    list.push(event);
    bySubject.set(event.subjectId, list);
  }

  const subjects = [...bySubject.entries()]
    .map(([subjectId, list]) => ({
      subjectId,
      list,
      signup: list.find((event) => event.type === 'signup'),
    }))
    .filter((subject) => subject.signup !== undefined)
    .sort((a, b) => a.signup!.occurredAt.getTime() - b.signup!.occurredAt.getTime());

  const people: SubjectMetrics[] = subjects.map(({ subjectId, list, signup }, index) => {
    const signupDay = toLocalDay(signup!.occurredAt);
    const of = (type: ProductEvent['type']) => list.filter((event) => event.type === type);
    const started = of('lesson_started');
    const startedOffsets = started.map((event) =>
      daysBetween(signupDay, toLocalDay(event.occurredAt)),
    );
    const daysSinceSignup = daysBetween(signupDay, today);
    const measurable = (day: number, check: () => boolean) =>
      daysSinceSignup >= day ? check() : null;
    const activeDays = new Set(
      list
        .filter((event) => event.type === 'lesson_started' || event.type === 'app_opened')
        .map((event) => toLocalDay(event.occurredAt)),
    );

    return {
      person: `p${String(index + 1).padStart(3, '0')}`,
      signupDay,
      daysSinceSignup,
      lessonsStarted: started.length,
      lessonsCompleted: of('lesson_completed').length,
      selfStarted: started.filter((event) => event.trigger !== 'reminder').length,
      activeDays: activeDays.size,
      bestStreak: bestStreak(
        of('lesson_completed').map((event) => toLocalDay(event.occurredAt)),
        calendar,
      ),
      retained14: measurable(RETENTION_DAY, () => startedOffsets.some((d) => d >= RETENTION_DAY)),
      activeWeek2: measurable(RETENTION_DAY, () => startedOffsets.some((d) => d >= 7 && d < 14)),
      activeDay30: measurable(REVIEW_DAY, () => startedOffsets.some((d) => d >= REVIEW_DAY)),
      unsubscribed: of('unsubscribed').length > 0,
      helpRequests: of('help_requested').length,
      careMessages: of('care_message').length,
      costUsd: costBySubject.get(subjectId) ?? 0,
    };
  });

  return { people, summary: summarize(people, totalCostUsd), daily: daily(events) };
}

function summarize(people: SubjectMetrics[], totalCostUsd: number): SummaryRow[] {
  const sum = (pick: (person: SubjectMetrics) => number) =>
    people.reduce((total, person) => total + pick(person), 0);
  const rate = (pick: (person: SubjectMetrics) => boolean | null) => {
    const measured = people.filter((person) => pick(person) !== null);
    return {
      value: percent(measured.filter((person) => pick(person)).length, measured.length),
      measured: measured.length,
    };
  };

  const started = sum((person) => person.lessonsStarted);
  const completed = sum((person) => person.lessonsCompleted);
  const retention = rate((person) => person.retained14);
  const week2 = rate((person) => person.activeWeek2);
  const day30 = rate((person) => person.activeDay30);
  const round = (value: number) => Math.round(value * 10_000) / 10_000;

  return [
    { metric: 'personas_con_alta', value: people.length, detail: 'Aceptaron el consentimiento' },
    {
      metric: 'retencion_14_dias_pct',
      value: retention.value,
      detail: `Métrica principal. Meta: 60% o más. Medible en ${retention.measured} personas`,
    },
    {
      metric: 'activas_segunda_semana_pct',
      value: week2.value,
      detail: `Iniciaron una lección entre los días 7 y 13. Medible en ${week2.measured} personas`,
    },
    {
      metric: 'activas_dia_30_pct',
      value: day30.value,
      detail: `Dato complementario. Medible en ${day30.measured} personas`,
    },
    { metric: 'lecciones_iniciadas', value: started, detail: '' },
    { metric: 'lecciones_completadas', value: completed, detail: '' },
    {
      metric: 'completitud_pct',
      value: percent(completed, started),
      detail: 'Completadas sobre iniciadas',
    },
    {
      metric: 'autoinicio_pct',
      value: percent(
        sum((person) => person.selfStarted),
        started,
      ),
      detail: 'Métrica de hábito: lecciones que arrancó la persona',
    },
    {
      metric: 'mejor_racha_media',
      value: people.length === 0 ? null : round(sum((person) => person.bestStreak) / people.length),
      detail: 'Días de lección seguidos, promedio de la mejor racha de cada persona',
    },
    { metric: 'bajas', value: people.filter((person) => person.unsubscribed).length, detail: '' },
    { metric: 'pedidos_de_ayuda', value: sum((person) => person.helpRequests), detail: '' },
    { metric: 'mensajes_de_cuidado', value: sum((person) => person.careMessages), detail: '' },
    { metric: 'costo_ia_usd_total', value: round(totalCostUsd), detail: 'Tutor y voz' },
    {
      metric: 'costo_ia_usd_por_persona',
      value: people.length === 0 ? null : round(totalCostUsd / people.length),
      detail: 'Meta: menos de ARS 500 por persona por mes',
    },
  ];
}

function daily(events: ProductEvent[]): DailyRow[] {
  const rows = new Map<LocalDay, DailyRow>();
  const keys: Partial<Record<ProductEvent['type'], keyof Omit<DailyRow, 'day'>>> = {
    signup: 'signups',
    app_opened: 'opened',
    lesson_started: 'started',
    lesson_completed: 'completed',
    unsubscribed: 'unsubscribed',
  };

  for (const event of events) {
    const key = keys[event.type];
    if (!key) continue;
    const day = toLocalDay(event.occurredAt);
    const row = rows.get(day) ?? {
      day,
      signups: 0,
      opened: 0,
      started: 0,
      completed: 0,
      unsubscribed: 0,
    };
    row[key]++;
    rows.set(day, row);
  }

  return [...rows.values()].sort((a, b) => a.day.localeCompare(b.day));
}

function csvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'si' : 'no';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV con coma y punto decimal, como lo esperan Power BI y Looker Studio. */
export function toCsv(rows: object[], columns: [header: string, key: string][]): string {
  const lines = [columns.map(([header]) => header).join(',')];
  for (const row of rows) {
    const record = row as Record<string, unknown>;
    lines.push(columns.map(([, key]) => csvValue(record[key])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export const PEOPLE_COLUMNS: [string, string][] = [
  ['persona', 'person'],
  ['dia_de_alta', 'signupDay'],
  ['dias_desde_alta', 'daysSinceSignup'],
  ['lecciones_iniciadas', 'lessonsStarted'],
  ['lecciones_completadas', 'lessonsCompleted'],
  ['lecciones_autoiniciadas', 'selfStarted'],
  ['dias_activos', 'activeDays'],
  ['mejor_racha', 'bestStreak'],
  ['retenida_14_dias', 'retained14'],
  ['activa_segunda_semana', 'activeWeek2'],
  ['activa_dia_30', 'activeDay30'],
  ['baja', 'unsubscribed'],
  ['pedidos_de_ayuda', 'helpRequests'],
  ['mensajes_de_cuidado', 'careMessages'],
  ['costo_ia_usd', 'costUsd'],
];

export const SUMMARY_COLUMNS: [string, string][] = [
  ['indicador', 'metric'],
  ['valor', 'value'],
  ['detalle', 'detail'],
];

export const DAILY_COLUMNS: [string, string][] = [
  ['dia', 'day'],
  ['altas', 'signups'],
  ['aperturas', 'opened'],
  ['lecciones_iniciadas', 'started'],
  ['lecciones_completadas', 'completed'],
  ['bajas', 'unsubscribed'],
];
