import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { buildApp, safeUrl } from '../../app.js';
import type { RouterReply } from '../conversation/message-router.js';
import { InMemoryAudioStore } from '../voice/audio-store.js';
import { appIconPng } from './icons.js';
import {
  generateToken,
  hashToken,
  isWellFormedToken,
  participantCode,
  type Participant,
} from './participants.repository.js';
import { buildReminders, loadReminderTexts, parseReminderTexts } from './reminders.js';
import type { WebBackend, WebMessage, WebState } from './web-backend.js';
import { parseRange, type VoiceInput } from './web.routes.js';

const token = generateToken();
const participant: Participant = { id: '6f1c0e1a-3b9e-4a59-9a6e-2d1f6f0b7a10', code: 'P01' };
const audioId = 'b'.repeat(64);

function setup(options: { reply?: Partial<RouterReply>; voiceInput?: VoiceInput } = {}) {
  const handled: WebMessage[] = [];
  const opened: boolean[] = [];
  const logs: string[] = [];
  const audioStore = new InMemoryAudioStore();
  const state: WebState = { phase: 'active', streak: 2, lesson: { kind: 'done_today' } };

  const backend: WebBackend = {
    findParticipant: async (candidate) => (candidate === token ? participant : undefined),
    state: async (_participant, _now, flags) => {
      opened.push(Boolean(flags?.opened));
      return state;
    },
    handle: async (_participant, message) => {
      handled.push(message);
      return {
        status: { streak: 2 },
        forgotten: false,
        transcript: message.audio ? 'hola' : undefined,
        messages: [{ kind: 'intro', format: 'audio', text: 'Hola', audioId }],
        ...options.reply,
      };
    },
  };

  const app = buildApp({
    logLevel: 'info',
    checkDatabase: async () => {},
    logStream: new Writable({
      write(chunk, _encoding, done) {
        logs.push(String(chunk));
        done();
      },
    }),
    web: {
      backend,
      audioStore,
      audioMimeType: 'audio/mpeg',
      voiceInput: options.voiceInput ?? 'server',
      now: () => new Date('2027-05-03T13:00:00Z'),
      rateLimitPerMinute: 3,
    },
  });

  return { app, handled, opened, logs, audioStore };
}

describe('tokens y códigos', () => {
  it('genera tokens de 43 caracteres, distintos y con hash estable', () => {
    const other = generateToken();

    expect(isWellFormedToken(token)).toBe(true);
    expect(other).not.toBe(token);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toContain(token);
    expect(isWellFormedToken('corto')).toBe(false);
    expect(isWellFormedToken(`${token.slice(0, 42)}/`)).toBe(false);
  });

  it('numera los códigos con dos dígitos', () => {
    expect(participantCode(7)).toBe('P07');
    expect(participantCode(120)).toBe('P120');
  });
});

describe('página del piloto web', () => {
  it('sirve la página con el manifiesto propio y sin guardarla en caché', async () => {
    const { app } = setup();

    const response = await app.inject({ method: 'GET', url: `/p/${token}` });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain(`/p/${token}/manifest.webmanifest`);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['content-security-policy']).toContain("script-src 'self'");
    expect(response.headers['permissions-policy']).toContain('microphone=(self)');
  });

  it('pide el estilo y el script con su versión, para no mezclarlos con archivos viejos', async () => {
    const { app } = setup();

    const page = (await app.inject({ method: 'GET', url: `/p/${token}` })).body;
    const version = /charla\.css\?v=([0-9a-f]{12})/.exec(page)?.[1];

    expect(version).toBeDefined();
    expect(page).toContain(`/app/charla.js?v=${version}`);
    const style = await app.inject({ method: 'GET', url: `/app/charla.css?v=${version}` });
    expect(style.statusCode).toBe(200);
  });

  it('un link inválido muestra una página amable con 404', async () => {
    const { app } = setup();

    const response = await app.inject({ method: 'GET', url: `/p/${generateToken()}` });

    expect(response.statusCode).toBe(404);
    expect(response.body).toContain('Este link no funciona');
  });

  it('el manifiesto abre el link de la persona', async () => {
    const { app } = setup();

    const response = await app.inject({ method: 'GET', url: `/p/${token}/manifest.webmanifest` });

    expect(response.json()).toMatchObject({ start_url: `/p/${token}`, display: 'standalone' });
  });

  it('sirve el script, el estilo y los íconos', async () => {
    const { app } = setup();

    for (const [file, type] of [
      ['charla.js', 'text/javascript'],
      ['charla.css', 'text/css'],
      ['icono-192.png', 'image/png'],
      ['apple-touch-icon.png', 'image/png'],
      ['icono.svg', 'image/svg+xml'],
      ['atkinson-400.woff2', 'font/woff2'],
      ['serif-700.woff2', 'font/woff2'],
    ]) {
      const response = await app.inject({ method: 'GET', url: `/app/${file}` });
      expect(response.statusCode, file).toBe(200);
      expect(response.headers['content-type']).toContain(type);
    }
    expect((await app.inject({ method: 'GET', url: '/app/../package.json' })).statusCode).toBe(404);
  });

  it('el ícono es un PNG válido del tamaño pedido', () => {
    const png = appIconPng(192);

    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(192);
    expect(png.readUInt32BE(20)).toBe(192);
  });
});

describe('API del piloto web', () => {
  it('el estado anota la apertura y dice cómo se usa el micrófono', async () => {
    const { app, opened } = setup({ voiceInput: 'off' });

    const response = await app.inject({ method: 'GET', url: `/p/${token}/estado` });

    expect(response.json()).toMatchObject({ phase: 'active', streak: 2, voiceInput: 'off' });
    expect(opened).toEqual([true]);
  });

  it('manda el texto al router y devuelve los mensajes con su audio y el estado nuevo', async () => {
    const { app, handled, opened } = setup();

    const response = await app.inject({
      method: 'POST',
      url: `/p/${token}/mensajes`,
      payload: { text: 'hola' },
    });

    expect(handled[0]).toMatchObject({ text: 'hola' });
    expect(response.json()).toMatchObject({
      forgotten: false,
      state: { phase: 'active' },
      messages: [{ kind: 'intro', text: 'Hola', audioUrl: `/p/${token}/audio/${audioId}` }],
    });
    // El estado después de un mensaje no cuenta como otra apertura.
    expect(opened).toEqual([false]);
  });

  it('en producción ignora lo que reconoció el navegador', async () => {
    const { app, handled } = setup({ voiceInput: 'server' });
    const audio = { base64: Buffer.from('audio').toString('base64'), mimeType: 'audio/mp4' };

    await app.inject({
      method: 'POST',
      url: `/p/${token}/mensajes`,
      payload: { audio: { ...audio, hintText: 'texto del navegador' } },
    });

    expect(handled[0]?.audio).toMatchObject({ mimeType: 'audio/mp4', hintText: undefined });
  });

  it('en local usa lo que reconoció el navegador, con la voz simulada', async () => {
    const { app, handled } = setup({ voiceInput: 'browser' });

    await app.inject({
      method: 'POST',
      url: `/p/${token}/mensajes`,
      payload: { audio: { base64: 'YQ==', mimeType: 'audio/webm;codecs=opus', hintText: 'hola' } },
    });

    expect(handled[0]?.audio?.hintText).toBe('hola');
  });

  it('después de la BAJA no devuelve estado', async () => {
    const { app } = setup({ reply: { forgotten: true, messages: [] } });

    const response = await app.inject({
      method: 'POST',
      url: `/p/${token}/mensajes`,
      payload: { text: 'BAJA' },
    });

    expect(response.json()).toMatchObject({ forgotten: true, state: null });
  });

  it('rechaza pedidos vacíos, links inválidos y demasiados mensajes seguidos', async () => {
    const { app } = setup();
    const post = (url: string, payload: object) => app.inject({ method: 'POST', url, payload });

    expect((await post(`/p/${token}/mensajes`, {})).statusCode).toBe(400);
    expect((await post(`/p/${generateToken()}/mensajes`, { text: 'hola' })).statusCode).toBe(404);

    const codes = [];
    for (let i = 0; i < 4; i++)
      codes.push((await post(`/p/${token}/mensajes`, { text: 'a' })).statusCode);
    expect(codes).toEqual([200, 200, 200, 429]);
  });

  it('sirve el audio de Charlá por partes, como lo pide Safari', async () => {
    const { app, audioStore } = setup();
    await audioStore.put(audioId, Buffer.from('0123456789'));

    const full = await app.inject({ method: 'GET', url: `/p/${token}/audio/${audioId}` });
    const part = await app.inject({
      method: 'GET',
      url: `/p/${token}/audio/${audioId}`,
      headers: { range: 'bytes=0-1' },
    });

    expect(full.statusCode).toBe(200);
    expect(full.headers['content-type']).toBe('audio/mpeg');
    expect(full.headers['accept-ranges']).toBe('bytes');
    expect(part.statusCode).toBe(206);
    expect(part.headers['content-range']).toBe('bytes 0-1/10');
    expect(part.body).toBe('01');
    expect(
      (await app.inject({ method: 'GET', url: `/p/${token}/audio/${'c'.repeat(64)}` })).statusCode,
    ).toBe(404);
  });

  it('interpreta los rangos de bytes', () => {
    expect(parseRange(undefined, 10)).toBeUndefined();
    expect(parseRange('bytes=2-', 10)).toEqual({ start: 2, end: 9 });
    expect(parseRange('bytes=-3', 10)).toEqual({ start: 7, end: 9 });
    expect(parseRange('bytes=5-100', 10)).toEqual({ start: 5, end: 9 });
    expect(parseRange('bytes=20-30', 10)).toBe('invalid');
    expect(parseRange('bytes=0-1,4-5', 10)).toBe('invalid');
  });

  it('los logs nunca guardan el token ni el texto', async () => {
    const { app, logs } = setup();

    await app.inject({ method: 'GET', url: `/p/${token}` });
    await app.inject({
      method: 'POST',
      url: `/p/${token}/mensajes`,
      payload: { text: 'mi texto privado' },
    });

    const all = logs.join('');
    expect(all).toContain('/p/:token');
    expect(all).not.toContain(token);
    expect(all).not.toContain('mi texto privado');
    expect(safeUrl(`/p/${token}/audio/x?y=1`)).toBe('/p/:token/audio/x');
  });
});

describe('recordatorios', () => {
  const texts = loadReminderTexts();
  const link = `https://charla.example.org/p/${token}`;

  it('el archivo real es válido y cada texto lleva el link', () => {
    expect(texts.invitacion).toContain('{link}');
    expect(() =>
      parseReminderTexts(
        'revision: borrador\ninvitacion: Un texto sin el link para nadie.\nleccion_del_dia: Hoy hay lección {link}\nleccion_sin_terminar: Seguimos con la lección {link}',
      ),
    ).toThrow('{link}');
  });

  it('arma un texto por persona y no le escribe a quien no hace falta', () => {
    const reminders = buildReminders(
      [
        { code: 'P01', link, state: { phase: 'welcome', streak: 0 } },
        {
          code: 'P02',
          link,
          state: {
            phase: 'active',
            streak: 1,
            lesson: { kind: 'ready', lessonNumber: 3, lessonTitle: 'Explicame fácil' },
          },
        },
        {
          code: 'P03',
          link,
          state: {
            phase: 'active',
            streak: 1,
            lesson: {
              kind: 'in_lesson',
              step: 'practice',
              lessonTitle: 'Repreguntar',
              lessonNumber: 9,
              prompt: '',
            },
          },
        },
        {
          code: 'P04',
          link,
          state: { phase: 'active', streak: 3, lesson: { kind: 'done_today' } },
        },
        { code: 'P05', link: null, state: null },
      ],
      texts,
    );

    expect(reminders[0]?.text).toContain(link);
    expect(reminders[1]?.text).toContain('lección 3');
    expect(reminders[1]?.text).toContain('"Explicame fácil"');
    expect(reminders[2]?.text).toContain('"Repreguntar"');
    expect(reminders[3]).toMatchObject({ text: null, note: 'Ya hizo la lección de hoy' });
    expect(reminders[4]).toMatchObject({ text: null, note: expect.stringContaining('baja') });
  });
});
