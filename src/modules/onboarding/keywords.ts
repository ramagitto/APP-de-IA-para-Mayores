import { normalizeText } from '../safety/risk.js';

export type Keyword = 'baja' | 'ayuda' | 'acepto' | 'rechazo';

// Solo cuenta si el mensaje es exactamente la palabra (con signos o "sí" adelante).
// Así, una práctica que dice "necesito ayuda con la receta" no se toma como AYUDA.
const PATTERNS: [Keyword, RegExp][] = [
  ['baja', /^(baja|darme de baja|dar de baja|quiero darme de baja)$/],
  ['ayuda', /^ayuda$/],
  ['acepto', /^(si,? )?acepto$/],
  ['rechazo', /^(no|no acepto|no gracias|no, gracias)$/],
];

export function detectKeyword(text: string): Keyword | undefined {
  const cleaned = normalizeText(text)
    .replace(/[¡!¿?.;:"'()]/g, '')
    .trim();

  return PATTERNS.find(([, pattern]) => pattern.test(cleaned))?.[0];
}
