import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

export interface PhoneKeys {
  encryptionKey: Buffer;
  hashKey: Buffer;
}

const ALGORITHM = 'aes-256-gcm';
const FORMAT_VERSION = 'v1';

export function phoneKeysFromBase64(encryptionKey: string, hashKey: string): PhoneKeys {
  return {
    encryptionKey: Buffer.from(encryptionKey, 'base64'),
    hashKey: Buffer.from(hashKey, 'base64'),
  };
}

// Formato internacional (E.164): por ejemplo, +5491100000000.
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s()-]/g, '').replace(/^\+/, '');

  if (!/^[1-9]\d{7,14}$/.test(digits)) {
    throw new Error('El teléfono no tiene un formato válido');
  }

  return `+${digits}`;
}

// Usa una clave porque hay pocos teléfonos posibles: un hash común se podría revertir probándolos todos.
export function hashPhone(phone: string, keys: PhoneKeys): string {
  return createHmac('sha256', keys.hashKey).update(phone).digest('hex');
}

export function encryptPhone(phone: string, keys: PhoneKeys): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, keys.encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(phone, 'utf8'), cipher.final()]);

  return [FORMAT_VERSION, iv, cipher.getAuthTag(), encrypted]
    .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
    .join('.');
}

export function decryptPhone(stored: string, keys: PhoneKeys): string {
  const [version, iv, authTag, encrypted] = stored.split('.');

  if (version !== FORMAT_VERSION || !iv || !authTag || !encrypted) {
    throw new Error('El teléfono cifrado no tiene un formato válido');
  }

  const decipher = createDecipheriv(ALGORITHM, keys.encryptionKey, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
