import { describe, expect, it } from 'vitest';
import { sampleLesson } from '../../../test/fixtures.js';
import { nextLesson, progressByLevel } from './progress.js';

const lessons = [
  { ...sampleLesson, id: 'n1-l01-a', level: 1, order: 1 },
  { ...sampleLesson, id: 'n1-l02-b', level: 1, order: 2 },
  { ...sampleLesson, id: 'n2-l01-c', level: 2, order: 1 },
];

describe('nextLesson', () => {
  it('arranca por la primera', () => {
    expect(nextLesson(lessons, [])?.id).toBe('n1-l01-a');
  });

  it('sigue por la primera que falta', () => {
    expect(nextLesson(lessons, ['n1-l01-a'])?.id).toBe('n1-l02-b');
  });

  it('vuelve a una que quedó sin hacer', () => {
    expect(nextLesson(lessons, ['n1-l02-b'])?.id).toBe('n1-l01-a');
  });

  it('no devuelve nada si terminó todas', () => {
    expect(nextLesson(lessons, ['n1-l01-a', 'n1-l02-b', 'n2-l01-c'])).toBeUndefined();
  });
});

describe('progressByLevel', () => {
  it('cuenta lo completado por nivel', () => {
    expect(progressByLevel(lessons, ['n1-l01-a'])).toEqual([
      { level: 1, completed: 1, total: 2 },
      { level: 2, completed: 0, total: 1 },
    ]);
  });

  it('ignora lecciones que ya no existen', () => {
    expect(progressByLevel(lessons, ['n9-l01-vieja'])[0]?.completed).toBe(0);
  });
});
