import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';

export const CONSENT_FILE = 'content/consentimiento.yaml';
// El piloto web tiene su propio texto: no menciona WhatsApp y explica el link personal.
export const WEB_CONSENT_FILE = 'content/consentimiento-web.yaml';

const consentSchema = z.strictObject({
  version: z.string().min(1).max(40),
  revision: z.enum(['borrador', 'aprobada']),
  pedido: z.string().min(100).max(1200),
  recordatorio: z.string().min(20).max(300),
  bienvenida: z.string().min(20).max(400),
  rechazo: z.string().min(20).max(300),
  baja: z.string().min(20).max(300),
  ayuda: z.string().min(20).max(300),
});

export type ConsentContent = z.infer<typeof consentSchema>;

export function parseConsentContent(yamlText: string): ConsentContent {
  const content = consentSchema.parse(parse(yamlText));

  // El pedido tiene que nombrar las palabras clave: si no, la persona no sabe cómo responder.
  for (const word of ['ACEPTO', 'NO', 'BAJA', 'AYUDA']) {
    if (!content.pedido.includes(word)) {
      throw new Error(`El pedido de consentimiento tiene que mencionar ${word}`);
    }
  }

  return content;
}

const cache = new Map<string, ConsentContent>();

export function loadConsentContent(file: string = CONSENT_FILE): ConsentContent {
  let content = cache.get(file);
  if (!content) {
    content = parseConsentContent(readFileSync(file, 'utf8'));
    cache.set(file, content);
  }
  return content;
}
