import { describe, expect, it } from 'vitest';
import { stringify } from 'yaml';
import { validateLessons } from './lesson.loader.js';

function lessonData(overrides: Record<string, unknown> = {}) {
  return {
    id: 'n1-l01-prueba',
    version: 1,
    nivel: 1,
    orden: 1,
    tipo: 'antiestafa',
    revision: 'borrador',
    titulo: 'Lección de prueba',
    logro: 'Probar el validador',
    intro: { guion: 'Hoy vamos a practicar una cosa muy simple. '.repeat(4) },
    practica: {
      foco: 'Que pida algo concreto.',
      ejemplo_mejorado: 'Explicame como si no supiera nada.',
    },
    desafio: {
      consigna: 'Ahora probá el mismo pedido en la IA que tengas en el celular.',
      recordatorio_seguridad: 'No pongas datos personales.',
    },
    cierre: { si_pudo: '¡Muy bien, lo lograste!', si_no_pudo: 'No pasa nada, mañana seguimos.' },
    ...overrides,
  };
}

function source(overrides: Record<string, unknown> = {}, fileName = 'n1-l01-prueba.yaml') {
  return { fileName, content: stringify(lessonData(overrides)) };
}

describe('validateLessons', () => {
  it('acepta una lección correcta y la traduce al dominio', () => {
    const { lessons, errors } = validateLessons([source()]);

    expect(errors).toEqual([]);
    expect(lessons[0]).toMatchObject({ level: 1, kind: 'antiscam', review: 'draft' });
  });

  it('avisa qué campo falta y en qué archivo', () => {
    const { errors } = validateLessons([source({ titulo: undefined })]);

    expect(errors[0]).toContain('n1-l01-prueba.yaml: titulo');
  });

  it('rechaza un guion que no entra en 40 segundos de audio', () => {
    const { errors } = validateLessons([source({ intro: { guion: 'x'.repeat(651) } })]);

    expect(errors[0]).toContain('intro.guion');
  });

  it('exige el recordatorio de seguridad en el desafío', () => {
    const { errors } = validateLessons([
      source({ desafio: { consigna: 'Ahora probá el mismo pedido en la IA del celular.' } }),
    ]);

    expect(errors[0]).toContain('desafio.recordatorio_seguridad');
  });

  it('rechaza campos desconocidos, que suelen ser errores de tipeo', () => {
    const { errors } = validateLessons([source({ titulos: 'mal escrito' })]);

    expect(errors[0]).toContain('titulos');
  });

  it('avisa si el YAML está mal escrito', () => {
    const { errors } = validateLessons([{ fileName: 'mal.yaml', content: 'a: [sin cerrar' }]);

    expect(errors[0]).toContain('mal.yaml: el YAML está mal escrito');
  });

  it('exige que el archivo se llame como el id', () => {
    const { errors } = validateLessons([source({}, 'otro-nombre.yaml')]);

    expect(errors[0]).toContain('n1-l01-prueba.yaml');
  });

  it('rechaza dos lecciones en la misma posición', () => {
    const { errors } = validateLessons([
      source(),
      source({ id: 'n1-l02-otra' }, 'n1-l02-otra.yaml'),
    ]);

    expect(errors[0]).toContain('nivel 1, orden 1');
  });

  it('exige una lección antiestafa en cada nivel', () => {
    const { errors } = validateLessons([source({ tipo: 'regular' })]);

    expect(errors[0]).toContain('Nivel 1: falta al menos una lección antiestafa');
  });

  it('devuelve las lecciones ordenadas por nivel y orden', () => {
    const { lessons } = validateLessons([
      source({ id: 'n1-l02-b', orden: 2 }, 'n1-l02-b.yaml'),
      source({ id: 'n1-l01-a', orden: 1 }, 'n1-l01-a.yaml'),
    ]);

    expect(lessons.map((lesson) => lesson.order)).toEqual([1, 2]);
  });

  it('junta todos los errores de una vez', () => {
    const { errors } = validateLessons([
      source({ titulo: undefined, logro: undefined }),
      { fileName: 'mal.yaml', content: 'a: [sin cerrar' },
    ]);

    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});
