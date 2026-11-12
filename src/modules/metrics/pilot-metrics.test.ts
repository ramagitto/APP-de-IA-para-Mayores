import { describe, expect, it } from 'vitest';
import { createLessonCalendar } from '../streaks/lesson-calendar.js';
import { computePilotMetrics, PEOPLE_COLUMNS, toCsv } from './pilot-metrics.js';
import type { ProductEvent } from './product-events.js';

const calendar = createLessonCalendar();
// 15:00 en Buenos Aires: el mismo día local en cualquier caso.
const at = (day: string) => new Date(`${day}T18:00:00Z`);
const ANA = '00000000-0000-4000-8000-000000000001';
const BETO = '00000000-0000-4000-8000-000000000002';
const CARLA = '00000000-0000-4000-8000-000000000003';

function event(subjectId: string, type: ProductEvent['type'], day: string): ProductEvent {
  return {
    subjectId,
    type,
    occurredAt: at(day),
    ...(type === 'lesson_started' && { trigger: 'user_message' as const }),
  };
}

function lesson(subjectId: string, day: string): ProductEvent[] {
  return [event(subjectId, 'lesson_started', day), event(subjectId, 'lesson_completed', day)];
}

// Alta el lunes 1/3/2027. Ana sigue hasta el día 15, Beto deja en la primera semana y Carla
// entra el 10/3, así que todavía no se le puede medir la retención.
const events: ProductEvent[] = [
  event(ANA, 'signup', '2027-03-01'),
  ...lesson(ANA, '2027-03-01'),
  ...lesson(ANA, '2027-03-02'),
  ...lesson(ANA, '2027-03-03'),
  ...lesson(ANA, '2027-03-08'),
  ...lesson(ANA, '2027-03-16'),
  event(BETO, 'signup', '2027-03-01'),
  ...lesson(BETO, '2027-03-01'),
  event(BETO, 'lesson_started', '2027-03-02'),
  event(BETO, 'help_requested', '2027-03-02'),
  event(BETO, 'unsubscribed', '2027-03-03'),
  event(CARLA, 'signup', '2027-03-10'),
  event(CARLA, 'app_opened', '2027-03-10'),
  // Un evento sin alta (por ejemplo, de antes de medir) no cuenta como persona.
  event('00000000-0000-4000-8000-000000000009', 'app_opened', '2027-03-10'),
];

function compute() {
  return computePilotMetrics({
    events,
    costBySubject: new Map([[ANA, 0.02]]),
    totalCostUsd: 0.03,
    asOf: at('2027-03-17'),
    calendar,
  });
}

describe('métricas del piloto', () => {
  it('numera a las personas por orden de alta, sin sus ids', () => {
    const { people } = compute();

    expect(people.map((person) => person.person)).toEqual(['p001', 'p002', 'p003']);
    expect(JSON.stringify(people)).not.toContain(ANA);
  });

  it('calcula la retención a 14 días solo sobre quienes ya pueden medirse', () => {
    const { people, summary } = compute();
    const [ana, beto, carla] = people;

    expect(ana).toMatchObject({ retained14: true, activeWeek2: true, activeDay30: null });
    expect(beto).toMatchObject({ retained14: false, activeWeek2: false, unsubscribed: true });
    expect(carla?.retained14).toBeNull();
    expect(summary.find((row) => row.metric === 'retencion_14_dias_pct')).toMatchObject({
      value: 50,
      detail: expect.stringContaining('Medible en 2 personas'),
    });
  });

  it('cuenta lecciones, completitud y la mejor racha en días de lección seguidos', () => {
    const { people, summary } = compute();
    const value = (metric: string) => summary.find((row) => row.metric === metric)?.value;

    // Lunes, martes y miércoles seguidos; el lunes siguiente no continúa la racha.
    expect(people[0]).toMatchObject({ lessonsStarted: 5, lessonsCompleted: 5, bestStreak: 3 });
    expect(value('lecciones_iniciadas')).toBe(7);
    expect(value('completitud_pct')).toBe(85.7);
    expect(value('autoinicio_pct')).toBe(100);
    expect(value('bajas')).toBe(1);
    expect(value('pedidos_de_ayuda')).toBe(1);
    expect(value('costo_ia_usd_por_persona')).toBe(0.01);
  });

  it('arma la serie por día para los gráficos', () => {
    const { daily } = compute();

    expect(daily[0]).toEqual({
      day: '2027-03-01',
      signups: 2,
      opened: 0,
      started: 2,
      completed: 2,
      unsubscribed: 0,
    });
  });

  it('exporta CSV con encabezados en español y escapa comas y comillas', () => {
    const { people } = compute();
    const csv = toCsv(people, PEOPLE_COLUMNS);

    expect(csv.split('\n')[0]).toContain('persona,dia_de_alta');
    expect(csv).toContain('p001,2027-03-01,16,5,5,5');
    expect(toCsv([{ a: 'uno, "dos"' }], [['a', 'a']])).toBe('a\n"uno, ""dos"""\n');
  });
});
