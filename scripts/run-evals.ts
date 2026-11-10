// Corre las evals del tutor: npm run evals
// Usa el proveedor configurado en LLM_PROVIDER: el simulado por defecto, que no gasta plata.
// Con LLM_PROVIDER=anthropic y una clave, corre contra el modelo real y mide el costo real.
import { mkdirSync, writeFileSync } from 'node:fs';
import { EVAL_CASES } from '../evals/cases.js';
import { loadTutorEnv } from '../src/config/env.js';
import { loadLessons } from '../src/modules/lessons/lesson.loader.js';
import { InMemoryCostLedger } from '../src/modules/tutor/cost-ledger.js';
import { createTutor } from '../src/modules/tutor/create-tutor.js';
import { type EvalResult, runEvalCase, summarize, THRESHOLDS } from '../src/modules/tutor/evals.js';

// Dólar oficial de referencia del proyecto (octubre de 2026). Actualizar al cerrar cada fase.
const ARS_PER_USD = 1550;

const env = loadTutorEnv();
const lessons = loadLessons('content/lessons');
const ledger = new InMemoryCostLedger();
const tutor = createTutor(env, ledger);

console.log(`Proveedor: ${env.LLM_PROVIDER} · Casos: ${EVAL_CASES.length}\n`);

const results: EvalResult[] = [];
for (const evalCase of EVAL_CASES) {
  const result = await runEvalCase(evalCase, lessons, tutor);
  results.push(result);
  console.log(`${result.passed ? '✓' : '✗'} ${evalCase.id} (${result.route})`);
  for (const failure of result.failures) console.log(`    ${failure}`);
}

const summary = summarize(results);
const percent = (value: number) => `${Math.round(value * 100)}%`;

console.log('\nPor categoría:');
for (const category of summary.categories) {
  const threshold = category.critical ? THRESHOLDS.critical : THRESHOLDS.other;
  console.log(
    `  ${category.meetsThreshold ? '✓' : '✗'} ${category.category.padEnd(16)} ${category.passed}/${category.total} (${percent(category.rate)}, umbral ${percent(threshold)}${category.critical ? ', crítica' : ''})`,
  );
}

const calls = ledger.entries.length;
const totalUsd = ledger.entries.reduce((total, entry) => total + entry.costUsd, 0);
const perReviewUsd = calls > 0 ? totalUsd / calls : 0;
const tokens = ledger.entries.reduce(
  (total, entry) => ({
    input:
      total.input +
      entry.usage.inputTokens +
      entry.usage.cacheReadTokens +
      entry.usage.cacheWriteTokens,
    output: total.output + entry.usage.outputTokens,
  }),
  { input: 0, output: 0 },
);

const costLines = [
  `Llamadas al modelo: ${calls}`,
  `Tokens promedio por llamada: ${Math.round(tokens.input / Math.max(calls, 1))} de entrada, ${Math.round(tokens.output / Math.max(calls, 1))} de salida`,
  `Costo por devolución: USD ${perReviewUsd.toFixed(6)} (ARS ${(perReviewUsd * ARS_PER_USD).toFixed(2)})`,
  `Costo por lección (1 o 2 devoluciones): ARS ${(perReviewUsd * ARS_PER_USD).toFixed(2)} a ${(2 * perReviewUsd * ARS_PER_USD).toFixed(2)}`,
  `Costo por mes (22 lecciones, peor caso): ARS ${(44 * perReviewUsd * ARS_PER_USD).toFixed(2)}`,
];

console.log('\nCosto del tutor:');
for (const line of costLines) console.log(`  ${line}`);
if (env.LLM_PROVIDER === 'mock') {
  console.log(
    '  (Estimado: el proveedor simulado calcula los tokens a partir del largo del texto.)',
  );
}

mkdirSync('evals/resultados', { recursive: true });
writeFileSync(
  'evals/resultados/ultimo.json',
  JSON.stringify(
    {
      provider: env.LLM_PROVIDER,
      model: env.TUTOR_MODEL,
      passed: summary.passed,
      categories: summary.categories,
      cost: { calls, totalUsd, perReviewUsd },
      results: results.map((result) => ({
        id: result.case.id,
        category: result.case.category,
        passed: result.passed,
        route: result.route,
        failures: result.failures,
        response: result.response,
      })),
    },
    null,
    2,
  ),
);

console.log(
  `\nResultado: ${summary.passed ? 'APROBADO' : 'NO APROBADO'}. Detalle en evals/resultados/ultimo.json`,
);
process.exit(summary.passed ? 0 : 1);
