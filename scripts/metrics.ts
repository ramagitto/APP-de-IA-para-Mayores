// Métricas del piloto en CSV, sin identificadores. Los gráficos se hacen en Power BI o Looker
// Studio (ADR 0006).
//   npm run metrics                     al día de hoy, en var/metricas/
//   npm run metrics -- 2027-03-31       con otra fecha de corte
// Contra producción: CHARLA_ENV_FILE=.env.produccion npm run metrics
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { loadEnv } from '../src/config/env.js';
import { loadCosts, loadEvents } from '../src/modules/metrics/metrics.repository.js';
import {
  computePilotMetrics,
  DAILY_COLUMNS,
  PEOPLE_COLUMNS,
  SUMMARY_COLUMNS,
  toCsv,
} from '../src/modules/metrics/pilot-metrics.js';
import {
  createLessonCalendar,
  parseHolidays,
  toLocalDay,
} from '../src/modules/streaks/lesson-calendar.js';
import { createDatabase, createOrm } from '../src/shared/db/database.js';

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL);
const orm = createOrm(database);
const [dayArgument] = process.argv.slice(2);

try {
  // Al final del día de corte, en horario de Buenos Aires.
  const asOf = dayArgument ? new Date(`${dayArgument}T23:59:00-03:00`) : new Date();
  if (Number.isNaN(asOf.getTime())) throw new Error('La fecha va como AAAA-MM-DD.');

  const costs = await loadCosts(orm);
  const metrics = computePilotMetrics({
    events: await loadEvents(orm),
    costBySubject: costs.bySubject,
    totalCostUsd: costs.totalUsd,
    asOf,
    calendar: createLessonCalendar(parseHolidays(readFileSync('content/feriados.yaml', 'utf8'))),
  });

  const folder = 'var/metricas';
  mkdirSync(folder, { recursive: true });
  writeFileSync(`${folder}/resumen.csv`, toCsv(metrics.summary, SUMMARY_COLUMNS));
  writeFileSync(`${folder}/personas.csv`, toCsv(metrics.people, PEOPLE_COLUMNS));
  writeFileSync(`${folder}/por-dia.csv`, toCsv(metrics.daily, DAILY_COLUMNS));

  console.log(`Métricas al ${toLocalDay(asOf)}:\n`);
  for (const row of metrics.summary) {
    console.log(`  ${row.metric}: ${row.value ?? '—'}${row.detail ? `  (${row.detail})` : ''}`);
  }
  console.log(
    `\nCSV en ${folder}/: resumen.csv, personas.csv y por-dia.csv (fuera del repositorio).`,
  );
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  await database.end();
}
