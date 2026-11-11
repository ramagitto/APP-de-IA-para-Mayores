import { decryptPhone, encryptPhone, hashPhone, normalizePhone, type PhoneKeys } from './phone.js';

// Cómo se identifica a una persona en un canal. WhatsApp manda un id por empresa (BSUID) en
// cada mensaje, y el teléfono puede faltar si la persona usa nombre de usuario: por eso el
// contacto puede ser un teléfono ("tel:") o ese id ("wa:"). Se guarda cifrado y con hash,
// igual que antes el teléfono.
export type ContactId = `tel:${string}` | `wa:${string}`;

export function phoneContact(raw: string): ContactId {
  return `tel:${normalizePhone(raw)}`;
}

export function whatsappContact(businessScopedUserId: string): ContactId {
  if (!/^[A-Za-z0-9._-]{3,100}$/.test(businessScopedUserId)) {
    throw new Error('El id de WhatsApp no tiene un formato válido');
  }
  return `wa:${businessScopedUserId}`;
}

export function parseContact(contact: string): { kind: 'phone' | 'whatsapp'; value: string } {
  if (contact.startsWith('tel:')) return { kind: 'phone', value: contact.slice(4) };
  if (contact.startsWith('wa:')) return { kind: 'whatsapp', value: contact.slice(3) };
  throw new Error('El contacto no tiene un formato válido');
}

export function hashContact(contact: ContactId, keys: PhoneKeys): string {
  return hashPhone(contact, keys);
}

export function encryptContact(contact: ContactId, keys: PhoneKeys): string {
  return encryptPhone(contact, keys);
}

// Cifrado de cualquier texto con la misma clave, para lo que hay que guardar un rato
// (por ejemplo, un mensaje entrante hasta procesarlo).
export function encryptText(text: string, keys: PhoneKeys): string {
  return encryptPhone(text, keys);
}

export function decryptText(stored: string, keys: PhoneKeys): string {
  return decryptPhone(stored, keys);
}

export function decryptContact(stored: string, keys: PhoneKeys): ContactId {
  const contact = decryptPhone(stored, keys);
  parseContact(contact);
  return contact as ContactId;
}
