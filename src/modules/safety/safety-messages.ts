import { type Helplines, loadHelplines } from './helplines.js';
import type { RiskCategory } from './risk.js';

// BORRADOR. Antes del piloto los revisan el equipo y una persona con formación en psicología.
// No se publican en el piloto sin esa revisión (ver docs/checklist-piloto.md).
export const CARE_MESSAGES_REVIEW = 'borrador' as const;

// Mensajes escritos por el equipo, no por la IA: en los momentos delicados no se improvisa.
// Los números salen de content/lineas-de-ayuda.yaml. A pedido del equipo, sin horarios.
export function buildCareMessages(lines: Helplines): Partial<Record<RiskCategory, string>> {
  const emergencies = `al ${lines.emergencias.numero} o al ${lines.emergencias_medicas.numero}`;

  return {
    distress:
      'Gracias por contármelo. Lamento que estés pasando por esto. No estás en esto solo ni sola: ' +
      'te pido que hables hoy con alguien de tu familia o de confianza, o con un profesional de la salud. ' +
      `Para hablar con alguien ahora, llamá al ${lines.cas_amba.numero} (gratis desde CABA y Gran Buenos Aires) ` +
      `o al ${lines.cas_nacional.numero} desde todo el país. ` +
      `Si no te atienden, llamá al ${lines.salud_mental_nacional.numero}, la línea de salud mental del Ministerio de Salud. ` +
      `Si sentís que podés hacerte daño, llamá ya ${emergencies}. La lección puede esperar.`,
    medical_emergency:
      'Esto puede ser urgente. Si te duele el pecho, te falta el aire o te sentís muy mal, ' +
      `llamá ya ${emergencies}, o pedile a alguien que esté cerca que lo haga. La lección puede esperar.`,
    scam_incident:
      'Hiciste muy bien en contarlo. Mantengamos la calma y hagamos esto ahora: ' +
      '1) Llamá a tu banco al número que figura atrás de tu tarjeta o en su página oficial. ' +
      '2) Si pasaste una clave, cambiala. ' +
      '3) No le contestes más a ese mensaje. ' +
      '4) Avisale a alguien de tu familia. ' +
      'Si querés hablar con una persona del equipo, escribí AYUDA.',
  };
}

let cachedCareMessages: Partial<Record<RiskCategory, string>> | undefined;

export function careMessage(category: RiskCategory): string | undefined {
  cachedCareMessages ??= buildCareMessages(loadHelplines());
  return cachedCareMessages[category];
}

// Frases que se agregan a la devolución del tutor. Garantizan la derivación aunque la IA la olvide.
export const DERIVATION_NOTES: Partial<Record<RiskCategory, string>> = {
  medical: 'Para tu caso en particular, lo mejor es consultarlo con tu médico.',
  financial:
    'Para decisiones con tu plata, consultá en tu banco por sus canales oficiales o con un profesional.',
  legal: 'Para tu caso en particular, consultalo con un abogado o en un organismo oficial.',
};

export const SENSITIVE_DATA_NOTE =
  'Por las dudas: no hace falta compartir números de documento, de tarjeta ni claves, ni acá ni con ninguna IA.';

export const RISKY_INTENT_NOTE =
  'Ojo: ante la duda, no mandes plata ni códigos. Primero llamá a esa persona al número de siempre.';

export function injectionRedirect(improvedExample: string): string {
  return `Acá practicamos la lección de hoy, así que sigamos con eso. Probá con algo así: "${improvedExample}"`;
}
