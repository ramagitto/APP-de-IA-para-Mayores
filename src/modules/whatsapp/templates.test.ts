import { describe, expect, it } from 'vitest';
import { loadTemplates, templateProblems } from './templates.js';

function template(
  cuerpo: string,
  ejemplos: string[] = [],
  categoria: 'marketing' | 'utility' = 'utility',
) {
  return {
    nombre: 'prueba',
    categoria_esperada: categoria,
    uso: 'Una plantilla de prueba',
    cuerpo,
    ejemplos,
  };
}

describe('plantillas de WhatsApp', () => {
  it('las plantillas reales cumplen las reglas', () => {
    const templates = loadTemplates();

    expect(templates.idioma).toBe('es_AR');
    expect(templates.plantillas.map((t) => t.nombre)).toEqual([
      'charla_recordatorio',
      'charla_repaso',
      'charla_respuesta_equipo',
    ]);
  });

  it('detecta una variable al final y acepta una bien puesta', () => {
    expect(
      templateProblems(
        template('Hola {{1}}, tu lección te espera hoy, {{2}}.', ['Marta', 'lunes']),
      ),
    ).toContain('no puede empezar ni terminar con una variable');
    expect(templateProblems(template('Hola {{1}}, tu lección te espera hoy.', ['Marta']))).toEqual(
      [],
    );
  });

  it.each([
    ['empieza con una variable', '{{1}}, tu lección te espera hoy.', ['Marta']],
    ['salta un número', 'Hola {{2}}, tu lección te espera hoy.', ['Marta']],
    ['le falta un ejemplo', 'Hola {{1}}, tu lección te espera hoy.', []],
    ['pide datos', 'Hola, para seguir pasame tu clave del banco por acá.', []],
  ])('rechaza una plantilla que %s', (_case, cuerpo, ejemplos) => {
    expect(templateProblems(template(cuerpo, ejemplos))).not.toEqual([]);
  });

  it('una plantilla de marketing tiene que explicar cómo darse de baja', () => {
    expect(
      templateProblems(template('Hola, tu lección de hoy te espera.', [], 'marketing')),
    ).toContain('una plantilla de marketing tiene que decir cómo dejar de recibir mensajes (BAJA)');
  });
});
