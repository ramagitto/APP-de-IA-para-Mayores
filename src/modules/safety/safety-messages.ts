import type { RiskCategory } from './risk.js';

// Mensajes escritos por el equipo, no por la IA: en los momentos delicados no se improvisa.
// Los revisa el rol de contenidos (ver docs/decisiones-pendientes.md).
export const CARE_MESSAGES: Partial<Record<RiskCategory, string>> = {
  distress:
    'Gracias por contármelo. Lamento que estés pasando por esto. No estás en esto solo ni sola: ' +
    'te pido que hables hoy con alguien de tu familia o de confianza, o con un profesional de la salud. ' +
    'Si sentís que podés hacerte daño, llamá ya al 911. La lección puede esperar.',
  medical_emergency:
    'Esto puede ser urgente. Si te duele el pecho, te falta el aire o te sentís muy mal, ' +
    'llamá ya al 911 o pedile a alguien que esté cerca que lo haga. La lección puede esperar.',
  scam_incident:
    'Hiciste muy bien en contarlo. Mantengamos la calma y hagamos esto ahora: ' +
    '1) Llamá a tu banco al número que figura atrás de tu tarjeta o en su página oficial. ' +
    '2) Si pasaste una clave, cambiala. ' +
    '3) No le contestes más a ese mensaje. ' +
    '4) Avisale a alguien de tu familia. ' +
    'Si querés hablar con una persona del equipo, escribí AYUDA.',
};

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
