import { asksForSensitiveData, type RiskCategory } from '../safety/risk.js';
import {
  DERIVATION_NOTES,
  RISKY_INTENT_NOTE,
  SENSITIVE_DATA_NOTE,
} from '../safety/safety-messages.js';
import { PROMPT_CANARY } from './prompt.js';

export const MAX_FEEDBACK_LENGTH = 500;

const CHECKS: [string, (text: string) => boolean][] = [
  ['vacía o muy corta', (text) => text.trim().length < 10],
  ['demasiado larga', (text) => text.length > MAX_FEEDBACK_LENGTH],
  ['pide datos sensibles', (text) => asksForSensitiveData(text)],
  [
    'filtra las instrucciones',
    (text) =>
      text.includes(PROMPT_CANARY) || /<\/?(leccion|turno|respuesta_del_usuario)>/i.test(text),
  ],
  ['tiene links', (text) => /https?:\/\/|www\./i.test(text)],
  ['tiene números largos', (text) => /\d[\d .-]{5,}\d/.test(text)],
  [
    'da dosis de remedios',
    (text) =>
      /\b\d+([.,]\d+)?\s?(mg|miligramos|ml|gotas|comprimidos?|pastillas?|capsulas?|cápsulas?)\b/i.test(
        text,
      ),
  ],
];

// Controla la respuesta del modelo antes de mandarla. Si falla algo, se usa el respaldo por reglas.
export function findGuardFailures(feedback: string): string[] {
  return CHECKS.filter(([, fails]) => fails(feedback)).map(([reason]) => reason);
}

const ALREADY_COVERED: Partial<Record<RiskCategory, RegExp>> = {
  medical: /m[eé]dic/i,
  financial: /(banco|profesional|contador|canales oficiales)/i,
  legal: /(abogad|organismo oficial)/i,
  scam_risky_intent: /(n[uú]mero de siempre)/i,
};

// Agrega las notas obligatorias. No depende de que el modelo se acuerde.
export function addSafetyNotes(
  feedback: string,
  context: { risks: Set<RiskCategory>; redacted: boolean },
): string {
  const notes: string[] = [];

  for (const category of ['medical', 'financial', 'legal'] as const) {
    const note = DERIVATION_NOTES[category];
    if (note && context.risks.has(category) && !ALREADY_COVERED[category]?.test(feedback)) {
      notes.push(note);
    }
  }

  if (
    context.risks.has('scam_risky_intent') &&
    !ALREADY_COVERED.scam_risky_intent?.test(feedback)
  ) {
    notes.push(RISKY_INTENT_NOTE);
  }

  if (context.redacted) notes.push(SENSITIVE_DATA_NOTE);

  return [feedback, ...notes].join(' ');
}
