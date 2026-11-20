import { createHash, randomBytes } from 'node:crypto';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Orm } from '../../shared/db/database.js';
import { webParticipants } from '../../shared/db/schema.js';
import { decryptText, encryptText } from '../users/contact.js';
import type { PhoneKeys } from '../users/phone.js';

// 32 bytes al azar en base64url: 43 caracteres imposibles de adivinar.
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/;

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function isWellFormedToken(token: string): boolean {
  return TOKEN_FORMAT.test(token);
}

// Con 256 bits al azar alcanza un hash común: no hay forma práctica de probar tokens.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// P01, P02... para el piloto; D01, D02... para los participantes demo (presentaciones).
export function participantCode(number: number, demo = false): string {
  return `${demo ? 'D' : 'P'}${String(number).padStart(2, '0')}`;
}

export interface Participant {
  id: string;
  code: string;
  /** Participante para presentaciones. Se fija al crearlo; ninguna ruta lo cambia. */
  demo: boolean;
}

const participantColumns = {
  id: webParticipants.id,
  code: webParticipants.code,
  demo: webParticipants.demo,
};

export interface ParticipantWithLink extends Participant {
  /** Null si la persona pidió la BAJA: ya no tiene link. */
  token: string | null;
  createdAt: Date;
  lastSeenAt: Date | null;
  closedAt: Date | null;
}

export function participantLink(baseUrl: string, token: string): string {
  return `${baseUrl}/p/${token}`;
}

/** Crea participantes con códigos correlativos que nunca se reutilizan. */
export async function createParticipants(
  orm: Orm,
  keys: PhoneKeys,
  count: number,
  now: Date,
  options: { demo?: boolean } = {},
): Promise<(Participant & { token: string })[]> {
  const demo = options.demo ?? false;
  const prefix = demo ? 'D' : 'P';
  const existing = await orm.select({ code: webParticipants.code }).from(webParticipants);
  let last = Math.max(
    0,
    ...existing
      .filter(({ code }) => code.startsWith(prefix))
      .map(({ code }) => Number(code.slice(1)) || 0),
  );
  const created: (Participant & { token: string })[] = [];

  for (let index = 0; index < count; index++) {
    const token = generateToken();
    const [row] = await orm
      .insert(webParticipants)
      .values({
        code: participantCode(++last, demo),
        demo,
        tokenHash: hashToken(token),
        tokenEncrypted: encryptText(token, keys),
        createdAt: now,
      })
      .returning(participantColumns);

    if (!row) throw new Error('No se pudo crear el participante');
    created.push({ ...row, token });
  }

  return created;
}

export async function findParticipantByToken(
  orm: Orm,
  token: string,
): Promise<Participant | undefined> {
  if (!isWellFormedToken(token)) return undefined;

  const [row] = await orm
    .select(participantColumns)
    .from(webParticipants)
    .where(and(eq(webParticipants.tokenHash, hashToken(token)), isNull(webParticipants.closedAt)));

  return row;
}

export async function findParticipantByCode(
  orm: Orm,
  code: string,
): Promise<Participant | undefined> {
  const [row] = await orm
    .select(participantColumns)
    .from(webParticipants)
    .where(eq(webParticipants.code, code.trim().toUpperCase()));

  return row;
}

export async function listParticipants(orm: Orm, keys: PhoneKeys): Promise<ParticipantWithLink[]> {
  const rows = await orm.select().from(webParticipants).orderBy(asc(webParticipants.createdAt));

  return (
    rows
      .map((row) => ({
        id: row.id,
        code: row.code,
        demo: row.demo,
        token: row.tokenEncrypted ? decryptText(row.tokenEncrypted, keys) : null,
        createdAt: row.createdAt,
        lastSeenAt: row.lastSeenAt,
        closedAt: row.closedAt,
      }))
      // Primero el piloto, después los demo.
      .sort(
        (a, b) =>
          Number(a.demo) - Number(b.demo) || Number(a.code.slice(1)) - Number(b.code.slice(1)),
      )
  );
}

export async function markSeen(orm: Orm, participantId: string, now: Date): Promise<void> {
  await orm
    .update(webParticipants)
    .set({ lastSeenAt: now })
    .where(eq(webParticipants.id, participantId));
}

/** Un link nuevo para el mismo participante: el anterior deja de funcionar y el avance sigue. */
export async function replaceToken(
  orm: Orm,
  keys: PhoneKeys,
  participantId: string,
): Promise<string> {
  const token = generateToken();
  await orm
    .update(webParticipants)
    .set({ tokenHash: hashToken(token), tokenEncrypted: encryptText(token, keys) })
    .where(and(eq(webParticipants.id, participantId), isNull(webParticipants.closedAt)));

  return token;
}

/** BAJA: borra el token y cierra la fila. Queda solo el código, para no reutilizarlo. */
export async function closeParticipant(orm: Orm, participantId: string, now: Date): Promise<void> {
  await orm
    .update(webParticipants)
    .set({ tokenHash: null, tokenEncrypted: null, lastSeenAt: null, closedAt: now })
    .where(eq(webParticipants.id, participantId));
}
