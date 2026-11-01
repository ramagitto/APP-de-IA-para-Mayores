import { describe, expect, it } from 'vitest';
import { decryptPhone, encryptPhone, hashPhone, normalizePhone, type PhoneKeys } from './phone.js';

const keys: PhoneKeys = { encryptionKey: Buffer.alloc(32, 'a'), hashKey: Buffer.alloc(32, 'b') };
const otherKeys: PhoneKeys = {
  encryptionKey: Buffer.alloc(32, 'c'),
  hashKey: Buffer.alloc(32, 'd'),
};
const phone = '+5491100000001';

describe('normalizePhone', () => {
  it('saca espacios, guiones y paréntesis', () => {
    expect(normalizePhone('+54 9 (11) 0000-0001')).toBe(phone);
  });

  it('agrega el signo más que falta', () => {
    expect(normalizePhone('5491100000001')).toBe(phone);
  });

  it.each(['', 'hola', '123', '+0123456789', '+1234567890123456'])('rechaza "%s"', (invalid) => {
    expect(() => normalizePhone(invalid)).toThrow('formato válido');
  });
});

describe('hashPhone', () => {
  it('da siempre lo mismo para el mismo teléfono, para poder buscarlo', () => {
    expect(hashPhone(phone, keys)).toBe(hashPhone(phone, keys));
  });

  it('cambia con la clave', () => {
    expect(hashPhone(phone, keys)).not.toBe(hashPhone(phone, otherKeys));
  });

  it('no contiene el teléfono', () => {
    expect(hashPhone(phone, keys)).not.toContain('5491100000001');
  });
});

describe('cifrado del teléfono', () => {
  it('recupera el teléfono original', () => {
    expect(decryptPhone(encryptPhone(phone, keys), keys)).toBe(phone);
  });

  it('cifra distinto cada vez', () => {
    expect(encryptPhone(phone, keys)).not.toBe(encryptPhone(phone, keys));
  });

  it('no deja el teléfono a la vista', () => {
    expect(encryptPhone(phone, keys)).not.toContain('5491100000001');
  });

  it('no descifra con otra clave', () => {
    expect(() => decryptPhone(encryptPhone(phone, keys), otherKeys)).toThrow();
  });

  it('detecta si alguien modificó el dato', () => {
    const parts = encryptPhone(phone, keys).split('.');
    const tampered = Buffer.from(parts[3] ?? '', 'base64url');
    tampered[0] = (tampered[0] ?? 0) ^ 1;
    parts[3] = tampered.toString('base64url');

    expect(() => decryptPhone(parts.join('.'), keys)).toThrow();
  });

  it('rechaza un formato desconocido', () => {
    expect(() => decryptPhone('cualquier-cosa', keys)).toThrow('formato válido');
  });
});
