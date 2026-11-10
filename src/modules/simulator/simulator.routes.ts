import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ConversationService } from '../conversation/conversation-service.js';
import type { AudioStore } from '../voice/audio-store.js';
import { SIMULATOR_PAGE } from './simulator-page.js';

export interface SimulatorDeps {
  conversation: Pick<ConversationService, 'handle' | 'forget'>;
  audioStore: AudioStore;
  now?: () => Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;
// Unos 4 MB de audio en base64: más que suficiente para un audio de un par de minutos.
const MAX_AUDIO_BASE64 = 5_500_000;

const messageSchema = z
  .object({
    sessionId: z.uuid(),
    text: z.string().trim().min(1).max(1000).optional(),
    audio: z
      .object({
        base64: z.string().min(1).max(MAX_AUDIO_BASE64),
        mimeType: z.string().regex(/^audio\/[a-z0-9.+-]+(;.*)?$/i),
        hintText: z.string().max(1000).optional(),
      })
      .optional(),
    // Para probar varias lecciones sin esperar días reales.
    clockOffsetDays: z.number().int().min(0).max(365).default(0),
  })
  .refine((body) => body.text || body.audio, 'Hace falta un texto o un audio');

const resetSchema = z.object({ sessionId: z.uuid() });

// Cada sesión del navegador es una persona simulada, con un teléfono inventado y fijo.
export function simulatedPhone(sessionId: string): string {
  const digits = BigInt(`0x${createHash('sha256').update(sessionId).digest('hex').slice(0, 12)}`)
    .toString()
    .slice(-7)
    .padStart(7, '0');

  return `+5491100${digits}`;
}

// Solo para desarrollo y demos. No tiene login: nunca se registra fuera de APP_ENV=local.
export function registerSimulatorRoutes(app: FastifyInstance, deps: SimulatorDeps): void {
  const now = deps.now ?? (() => new Date());

  app.get('/simulador', async (_request, reply) =>
    reply.type('text/html; charset=utf-8').send(SIMULATOR_PAGE),
  );

  app.post('/simulador/mensajes', { bodyLimit: 6 * 1024 * 1024 }, async (request, reply) => {
    const parsed = messageSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Pedido inválido' });

    const { sessionId, text, audio, clockOffsetDays } = parsed.data;
    const result = await deps.conversation.handle({
      phone: simulatedPhone(sessionId),
      now: new Date(now().getTime() + clockOffsetDays * DAY_MS),
      text,
      audio: audio && {
        data: Buffer.from(audio.base64, 'base64'),
        mimeType: audio.mimeType,
        hintText: audio.hintText,
      },
    });

    return {
      transcript: result.transcript,
      status: result.status,
      messages: result.messages.map(({ kind, format, text: messageText, audioId }) => ({
        kind,
        format,
        text: messageText,
        audioUrl: audioId ? `/simulador/audio/${audioId}` : null,
      })),
    };
  });

  app.get<{ Params: { id: string } }>('/simulador/audio/:id', async (request, reply) => {
    const audio = await deps.audioStore.get(request.params.id);
    if (!audio) return reply.code(404).send({ error: 'No existe ese audio' });

    return reply.type('audio/ogg').send(audio);
  });

  app.post('/simulador/reiniciar', async (request, reply) => {
    const parsed = resetSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Pedido inválido' });

    await deps.conversation.forget(simulatedPhone(parsed.data.sessionId));
    return { ok: true };
  });
}
