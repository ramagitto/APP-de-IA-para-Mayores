import { createHmac, timingSafeEqual } from 'node:crypto';

// Meta firma cada webhook con HMAC-SHA256 del cuerpo exacto, usando el secreto de la app.
// El encabezado X-Hub-Signature-256 trae "sha256=<hash en hexadecimal>".
export function signPayload(rawBody: Buffer, appSecret: string): string {
  return `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
}

export function isValidSignature(
  rawBody: Buffer,
  header: string | undefined,
  appSecret: string,
): boolean {
  if (!header?.startsWith('sha256=')) return false;

  const expected = Buffer.from(signPayload(rawBody, appSecret));
  const received = Buffer.from(header);

  // Comparación en tiempo constante: no revela cuántos caracteres coinciden.
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function isValidVerifyToken(received: string | undefined, expected: string): boolean {
  if (received === undefined) return false;

  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
