// Detección de riesgos con reglas simples y auditables. Es la primera capa de defensa:
// no depende del modelo de lenguaje, así que funciona igual aunque el proveedor falle o se equivoque.

export type RiskCategory =
  | 'distress'
  | 'scam_incident'
  | 'scam_risky_intent'
  | 'sensitive_data'
  | 'prompt_injection'
  | 'medical'
  | 'financial'
  | 'legal';

// Estas categorías cortan la lección: se responde con un mensaje de cuidado escrito por el equipo.
export const CRITICAL_CATEGORIES: ReadonlySet<RiskCategory> = new Set([
  'distress',
  'scam_incident',
]);

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const RULES: Record<RiskCategory, RegExp[]> = {
  distress: [
    /\b(me quiero morir|quiero morirme|no quiero (vivir|seguir viviendo)|me quiero matar|quitarme la vida)\b/,
    /\b(no (le )?encuentro sentido|no tiene sentido (vivir|nada)|nadie me quiere|estoy (muy|tan) (sola|solo|triste|deprimida|deprimido))\b/,
    /\b(estoy desesperad[oa]|no doy mas|no aguanto mas)\b/,
  ],
  scam_incident: [
    /\b(le|les) (pase|di|mande|envie|dicte) (el|un|mi|los|mis) (codigo|clave|pin|token|numero de (la )?tarjeta|cbu)/,
    /\b(me (robaron|hackearon|vaciaron|estafaron|sacaron (la|mi) plata)|me jaquearon)\b/,
    /\b(transferi|deposite|mande plata|le mande plata|le transferi)\b.*\b(supuest[oa]|desconocid[oa]|me pidio|me pidieron|urgente)\b/,
    /\b(cai en una estafa|creo que me estafaron|fui estafad[oa])\b/,
  ],
  scam_risky_intent: [
    /\b(le|les) (mandaria|pasaria|daria|transferiria|mando|paso|doy|transfiero|deposito|depositaria)\b.*\b(plata|dinero|codigo|clave|pin|cbu|tarjeta)\b/,
  ],
  sensitive_data: [
    /\b\d{7,8}\b/, // DNI
    /\b(?:\d[ -]?){13,19}\b/, // tarjetas y CBU
    /\b(mi|la) (clave|contrasena|pin)\b.*\b(es|son)\b/,
    /\bcbu\b.*\d/,
    /[\w.+-]+@[\w-]+\.[\w.]+/, // email
  ],
  prompt_injection: [
    /\b(ignora|olvida|olvidate de|saltea|no sigas)\b.*\b(instrucciones|reglas|indicaciones|todo lo anterior)\b/,
    /\b(ignore|disregard|forget)\b.*\b(instructions|previous|above|rules)\b/,
    /\b(system prompt|prompt del sistema|prompt de sistema|tu prompt|tus instrucciones)\b/,
    /\b(a partir de ahora|desde ahora)\b.*\b(sos|eres|actua|actuas|respondes)\b/,
    /\b(actua como|hace de cuenta que sos|modo desarrollador|developer mode|jailbreak|sin restricciones|sin reglas)\b/,
    /<\/?[a-z_]+>/, // intento de cerrar o abrir las etiquetas que delimitan el texto del usuario
  ],
  medical: [
    /\b(remedio|medicamento|medicacion|pastilla|dosis|ibuprofeno|paracetamol|aspirina|antibiotico|presion|diabetes|insulina|sintoma|me duele|dolor de|receta medica)\b/,
  ],
  financial: [
    /\b(invertir|inversion|plazo fijo|dolares|comprar dolar|cripto|bitcoin|prestamo|credito|tarjeta de credito|ahorros|me conviene .*plata)\b/,
  ],
  legal: [
    /\b(abogado|juicio|demanda|testamento|herencia|sucesion|desalojo|desalojar|contrato|denuncia|divorcio)\b/,
  ],
};

// Si la frase está negada, no hay riesgo: "no le mando la plata" es justo lo que queremos enseñar.
const EXCLUSIONS: Partial<Record<RiskCategory, RegExp>> = {
  scam_risky_intent:
    /\b(no|nunca|jamas) (le|les) (mandaria|pasaria|daria|transferiria|mando|paso|doy|transfiero|deposito|depositaria)\b/,
};

export function assessRisk(text: string): Set<RiskCategory> {
  const normalized = normalizeText(text);
  const found = new Set<RiskCategory>();

  for (const [category, patterns] of Object.entries(RULES) as [RiskCategory, RegExp[]][]) {
    const excluded = EXCLUSIONS[category]?.test(normalized) ?? false;

    if (!excluded && patterns.some((pattern) => pattern.test(normalized))) found.add(category);
  }

  return found;
}

export function criticalCategory(risks: Set<RiskCategory>): RiskCategory | undefined {
  // La angustia va primero: si alguien está mal y además lo estafaron, primero lo cuidamos.
  if (risks.has('distress')) return 'distress';
  if (risks.has('scam_incident')) return 'scam_incident';
  return undefined;
}

// Detecta si un texto le pide al usuario datos sensibles. Charlá nunca lo hace.
export const ASKS_FOR_SENSITIVE_DATA =
  /\b(pasame|mandame|decime|escribime|dame|enviame|compartime|necesito|indicame) (tu|tus|el|la|los) (numero de )?(clave|claves|codigo|contrasena|tarjeta|dni|documento|cuenta|cbu|pin|token)/i;

export function asksForSensitiveData(text: string): boolean {
  // El texto entre comillas se ignora: las lecciones antiestafas citan mensajes de estafadores.
  return ASKS_FOR_SENSITIVE_DATA.test(normalizeText(text.replace(/"[^"]*"/g, '')));
}
