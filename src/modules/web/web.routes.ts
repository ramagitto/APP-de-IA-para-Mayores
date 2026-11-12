import { readFileSync } from 'node:fs';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { RouterReply } from '../conversation/message-router.js';
import type { AudioStore } from '../voice/audio-store.js';
import { RateLimiter } from '../whatsapp/rate-limiter.js';
import { appIconPng, APP_ICON_SVG } from './icons.js';
import type { Participant } from './participants.repository.js';
import type { WebBackend, WebState } from './web-backend.js';
import { manifestFor, NOT_FOUND_PAGE, webPage } from './web-page.js';

// server: el servidor transcribe. browser: lo reconoce el navegador (solo en local, con la voz
// simulada). off: sin micrófono, porque en producción no se usa la voz del navegador.
export type VoiceInput = 'server' | 'browser' | 'off';

export interface WebDeps {
  backend: WebBackend;
  audioStore: AudioStore;
  audioMimeType: string;
  voiceInput: VoiceInput;
  now?: () => Date;
  /** Mensajes por persona por minuto. Protege el costo. */
  rateLimitPerMinute?: number;
}

// Unos 4 MB de audio en base64: alcanza para los 2 minutos que permite la página.
const MAX_AUDIO_BASE64 = 5_500_000;

const messageSchema = z
  .object({
    text: z.string().trim().min(1).max(1000).optional(),
    audio: z
      .object({
        base64: z.string().min(1).max(MAX_AUDIO_BASE64),
        mimeType: z.string().regex(/^audio\/[a-z0-9.+-]+(;.*)?$/i),
        hintText: z.string().max(1000).optional(),
      })
      .optional(),
  })
  .refine((body) => body.text || body.audio, 'Hace falta un texto o un audio');

const AUDIO_ID = /^[0-9a-f]{64}$/;

// La página solo carga lo propio: ningún script ni recurso de terceros.
const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
    "font-src 'self'; " +
    "media-src 'self' blob: data:; connect-src 'self'; manifest-src 'self'; " +
    "base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  // El link lleva el token: no se lo pasamos a ningún otro sitio.
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
  'Permissions-Policy': 'microphone=(self), camera=(), geolocation=()',
};

const STATIC_FILES: Record<string, { type: string; body: () => Buffer | string }> = {
  'charla.js': { type: 'text/javascript; charset=utf-8', body: () => readPublic('charla.js') },
  'charla.css': { type: 'text/css; charset=utf-8', body: () => readPublic('charla.css') },
  'icono.svg': { type: 'image/svg+xml', body: () => APP_ICON_SVG },
  'icono-192.png': { type: 'image/png', body: () => appIconPng(192) },
  'icono-512.png': { type: 'image/png', body: () => appIconPng(512) },
  'apple-touch-icon.png': { type: 'image/png', body: () => appIconPng(180) },
  // Fuentes servidas desde acá, sin Google: Atkinson Hyperlegible para leer (pensada para baja
  // visión) y Source Serif 4 para los títulos, como en la presentación. Ambas con licencia OFL.
  'atkinson-400.woff2': font('atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal'),
  'atkinson-700.woff2': font('atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal'),
  'serif-700.woff2': font('source-serif-4/files/source-serif-4-latin-700-normal'),
};

function font(path: string): { type: string; body: () => Buffer } {
  return { type: 'font/woff2', body: () => readFileSync(`node_modules/@fontsource/${path}.woff2`) };
}

/** Interpreta un encabezado Range de un solo tramo, como "bytes=0-1" o "bytes=100-". */
export function parseRange(
  header: string | undefined,
  size: number,
): { start: number; end: number } | 'invalid' | undefined {
  if (!header) return undefined;

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return 'invalid';

  let start: number;
  let end: number;
  if (!match[1]) {
    // "bytes=-500": los últimos 500 bytes.
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  }

  return start > end || start >= size ? 'invalid' : { start, end };
}

function readPublic(file: string): string {
  return readFileSync(`public/${file}`, 'utf8');
}

function secure(reply: FastifyReply): FastifyReply {
  return reply.headers(SECURITY_HEADERS);
}

function privateReply(reply: FastifyReply): FastifyReply {
  return secure(reply).header('Cache-Control', 'no-store');
}

// Canal web del piloto: cada persona entra con su link personal (/p/<token>), sin usuario ni
// contraseña. Todo pasa por el mismo MessageRouter que WhatsApp.
export function registerWebRoutes(app: FastifyInstance, deps: WebDeps): void {
  const now = deps.now ?? (() => new Date());
  const limiter = new RateLimiter(deps.rateLimitPerMinute ?? 20, 60_000);
  const statics = new Map(
    Object.entries(STATIC_FILES).map(([name, file]) => [name, { ...file, body: file.body() }]),
  );

  async function participantOr404(
    token: string,
    reply: FastifyReply,
  ): Promise<Participant | undefined> {
    const participant = await deps.backend.findParticipant(token);
    if (!participant) {
      privateReply(reply).code(404).send({ error: 'Este link no funciona' });
    }
    return participant;
  }

  function audioUrl(token: string, audioId: string | undefined): string | null {
    return audioId ? `/p/${token}/audio/${audioId}` : null;
  }

  function present(token: string, reply: RouterReply, state: WebState | null) {
    return {
      transcript: reply.transcript,
      forgotten: reply.forgotten,
      state,
      messages: reply.messages.map(({ kind, format, text, audioId }) => ({
        kind,
        format,
        text,
        audioUrl: audioUrl(token, audioId),
      })),
    };
  }

  app.get<{ Params: { file: string } }>('/app/:file', async (request, reply) => {
    const file = statics.get(request.params.file);
    if (!file) return secure(reply).code(404).send({ error: 'No existe' });

    return secure(reply)
      .header(
        'Cache-Control',
        `public, max-age=${file.type.startsWith('font/') ? 2_592_000 : 3600}`,
      )
      .type(file.type)
      .send(file.body);
  });

  app.get<{ Params: { token: string } }>('/p/:token', async (request, reply) => {
    const { token } = request.params;
    const participant = await deps.backend.findParticipant(token);

    if (!participant) {
      return privateReply(reply).code(404).type('text/html; charset=utf-8').send(NOT_FOUND_PAGE);
    }
    return privateReply(reply).type('text/html; charset=utf-8').send(webPage(token));
  });

  app.get<{ Params: { token: string } }>(
    '/p/:token/manifest.webmanifest',
    async (request, reply) => {
      const { token } = request.params;
      if (!(await participantOr404(token, reply))) return reply;

      return privateReply(reply)
        .type('application/manifest+json; charset=utf-8')
        .send(manifestFor(token));
    },
  );

  app.get<{ Params: { token: string } }>('/p/:token/estado', async (request, reply) => {
    const participant = await participantOr404(request.params.token, reply);
    if (!participant) return reply;

    const state = await deps.backend.state(participant, now(), { opened: true });
    return privateReply(reply).send({ ...state, voiceInput: deps.voiceInput });
  });

  app.post<{ Params: { token: string } }>(
    '/p/:token/mensajes',
    { bodyLimit: 6 * 1024 * 1024 },
    async (request, reply) => {
      const { token } = request.params;
      const participant = await participantOr404(token, reply);
      if (!participant) return reply;

      const parsed = messageSchema.safeParse(request.body);
      if (!parsed.success) return privateReply(reply).code(400).send({ error: 'Pedido inválido' });

      if (!limiter.allow(participant.id, now().getTime())) {
        return privateReply(reply).code(429).send({ error: 'Demasiados mensajes' });
      }

      const { text, audio } = parsed.data;
      const at = now();
      const result = await deps.backend.handle(participant, {
        now: at,
        text,
        audio: audio && {
          data: Buffer.from(audio.base64, 'base64'),
          mimeType: audio.mimeType,
          // Solo en local: en producción no se usa lo que reconoce el navegador.
          hintText: deps.voiceInput === 'browser' ? audio.hintText : undefined,
        },
      });
      const state = result.forgotten ? null : await deps.backend.state(participant, at);

      return privateReply(reply).send(present(token, result, state));
    },
  );

  app.get<{ Params: { token: string; id: string } }>(
    '/p/:token/audio/:id',
    async (request, reply) => {
      const { token, id } = request.params;
      if (!(await participantOr404(token, reply))) return reply;

      const audio = AUDIO_ID.test(id) ? await deps.audioStore.get(id) : undefined;
      if (!audio) return privateReply(reply).code(404).send({ error: 'No existe ese audio' });

      secure(reply)
        .header('Cache-Control', 'private, max-age=86400')
        .header('Accept-Ranges', 'bytes')
        .type(deps.audioMimeType);

      // Safari pide el audio por partes (Range) y, si el servidor no las da, no lo reproduce.
      const range = parseRange(request.headers.range, audio.length);
      if (range === 'invalid') {
        return reply.code(416).header('Content-Range', `bytes */${audio.length}`).send();
      }
      if (range) {
        return reply
          .code(206)
          .header('Content-Range', `bytes ${range.start}-${range.end}/${audio.length}`)
          .send(audio.subarray(range.start, range.end + 1));
      }
      return reply.send(audio);
    },
  );
}
