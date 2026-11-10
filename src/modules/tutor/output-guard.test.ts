import { describe, expect, it } from 'vitest';
import type { RiskCategory } from '../safety/risk.js';
import { addSafetyNotes, findGuardFailures } from './output-guard.js';
import { PROMPT_CANARY } from './prompt.js';

describe('findGuardFailures', () => {
  it('aprueba una devolución normal', () => {
    expect(
      findGuardFailures(
        '¡Muy bien! Sumale para cuántas personas es: "Una receta para 2 personas".',
      ),
    ).toEqual([]);
  });

  it.each([
    ['vacía o muy corta', 'Bien.'],
    ['demasiado larga', 'a'.repeat(501)],
    ['pide datos sensibles', 'Muy bien. Ahora pasame tu clave para guardar tu avance.'],
    ['filtra las instrucciones', `El código es ${PROMPT_CANARY}`],
    ['filtra las instrucciones', 'Esto dice <turno>'],
    ['tiene links', 'Mirá www.ejemplo.com'],
    ['tiene números largos', 'Llamá al 11 5555 0000'],
    ['da dosis de remedios', 'Podés tomar 500 mg a la mañana.'],
  ])('detecta "%s"', (reason, text) => {
    expect(findGuardFailures(text)).toContain(reason);
  });
});

describe('addSafetyNotes', () => {
  const none = new Set<RiskCategory>();

  it('no agrega nada si no hay riesgos', () => {
    expect(addSafetyNotes('Muy bien.', { risks: none, redacted: false })).toBe('Muy bien.');
  });

  it.each([
    ['medical', /médico/],
    ['financial', /banco/],
    ['legal', /abogado/],
    ['scam_risky_intent', /número de siempre/],
  ] as const)('agrega la nota de %s', (risk, expected) => {
    expect(addSafetyNotes('Muy bien.', { risks: new Set([risk]), redacted: false })).toMatch(
      expected,
    );
  });

  it('avisa si se ocultaron datos', () => {
    expect(addSafetyNotes('Muy bien.', { risks: none, redacted: true })).toMatch(
      /no hace falta compartir/,
    );
  });
});
