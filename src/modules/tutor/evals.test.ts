import { describe, expect, it } from 'vitest';
import { EVAL_CASES } from '../../../evals/cases.js';
import { loadLessons } from '../lessons/lesson.loader.js';
import { InMemoryCostLedger } from './cost-ledger.js';
import { CRITICAL_EVAL_CATEGORIES, runEvalCase, summarize } from './evals.js';
import { LlmTutor } from './llm-tutor.js';
import { MockLlmProvider } from './mock-provider.js';

const lessons = loadLessons('content/lessons');

function mockTutor() {
  return new LlmTutor({
    provider: new MockLlmProvider(),
    ledger: new InMemoryCostLedger(),
    dailyBudgetUsd: 1,
  });
}

describe('set de evals', () => {
  it('tiene al menos 30 casos, con ids únicos', () => {
    expect(EVAL_CASES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(EVAL_CASES.map((evalCase) => evalCase.id)).size).toBe(EVAL_CASES.length);
  });

  it('cubre todas las categorías críticas', () => {
    const categories = new Set(EVAL_CASES.map((evalCase) => evalCase.category));

    for (const category of CRITICAL_EVAL_CATEGORIES) expect(categories).toContain(category);
  });

  it('todos los casos usan lecciones que existen', () => {
    for (const evalCase of EVAL_CASES) {
      expect(lessons.some((lesson) => lesson.id.startsWith(evalCase.lesson))).toBe(true);
    }
  });
});

// Con el proveedor simulado, las evals verifican las capas que no dependen del modelo:
// reglas, mensajes de cuidado, ocultado de datos, controles de salida y notas obligatorias.
describe('evals con el proveedor simulado', () => {
  it.each(EVAL_CASES.map((evalCase) => [evalCase.id, evalCase] as const))(
    '%s',
    async (_id, evalCase) => {
      const result = await runEvalCase(evalCase, lessons, mockTutor());

      expect(result.failures).toEqual([]);
    },
  );

  it('el resumen supera los umbrales', async () => {
    const tutor = mockTutor();
    const results = await Promise.all(
      EVAL_CASES.map((evalCase) => runEvalCase(evalCase, lessons, tutor)),
    );

    expect(summarize(results).passed).toBe(true);
  });
});

describe('summarize', () => {
  it('una sola falla en una categoría crítica no alcanza el umbral', async () => {
    const tutor = mockTutor();
    const results = await Promise.all(
      EVAL_CASES.map((evalCase) => runEvalCase(evalCase, lessons, tutor)),
    );
    const firstMedical = results.findIndex((result) => result.case.category === 'medico');
    results[firstMedical] = { ...results[firstMedical]!, passed: false };

    const summary = summarize(results);

    expect(summary.passed).toBe(false);
    expect(
      summary.categories.find((category) => category.category === 'medico')?.meetsThreshold,
    ).toBe(false);
  });
});
