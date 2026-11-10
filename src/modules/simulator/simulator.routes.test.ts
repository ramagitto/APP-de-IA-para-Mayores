import { describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import type { IncomingMessage } from '../conversation/conversation-service.js';
import { InMemoryAudioStore } from '../voice/audio-store.js';
import { simulatedPhone } from './simulator.routes.js';

const sessionId = '8f14e45f-ceea-467a-a866-051c2e7f1a10';
const audioId = 'a'.repeat(64);

function setup() {
  const received: IncomingMessage[] = [];
  const forgotten: string[] = [];
  const audioStore = new InMemoryAudioStore();
  const conversation = {
    handle: async (incoming: IncomingMessage) => {
      received.push(incoming);
      return {
        transcript: incoming.audio ? 'hola' : undefined,
        status: { streak: 0 },
        messages: [
          { kind: 'intro' as const, format: 'audio' as const, text: 'Hola', audioId },
          { kind: 'info' as const, format: 'text' as const, text: 'Aviso' },
        ],
      };
    },
    forget: async (phone: string) => {
      forgotten.push(phone);
    },
  };
  const app = buildApp({
    logLevel: 'silent',
    checkDatabase: async () => {},
    simulator: { conversation, audioStore, now: () => new Date('2027-05-03T13:00:00Z') },
  });

  return { app, received, forgotten, audioStore };
}

describe('simulador', () => {
  it('sirve la página', async () => {
    const { app } = setup();

    const response = await app.inject({ method: 'GET', url: '/simulador' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('Charlá · Simulador');
  });

  it('no existe si no se configuró, como en producción', async () => {
    const app = buildApp({ logLevel: 'silent', checkDatabase: async () => {} });

    expect((await app.inject({ method: 'GET', url: '/simulador' })).statusCode).toBe(404);
  });

  it('manda el texto con un teléfono inventado y fijo para la sesión', async () => {
    const { app, received } = setup();

    const response = await app.inject({
      method: 'POST',
      url: '/simulador/mensajes',
      payload: { sessionId, text: 'hola' },
    });

    expect(response.statusCode).toBe(200);
    expect(received[0]).toMatchObject({ phone: simulatedPhone(sessionId), text: 'hola' });
    expect(response.json().messages).toEqual([
      { kind: 'intro', format: 'audio', text: 'Hola', audioUrl: `/simulador/audio/${audioId}` },
      { kind: 'info', format: 'text', text: 'Aviso', audioUrl: null },
    ]);
  });

  it('adelanta el reloj para probar varios días', async () => {
    const { app, received } = setup();

    await app.inject({
      method: 'POST',
      url: '/simulador/mensajes',
      payload: { sessionId, text: 'hola', clockOffsetDays: 2 },
    });

    expect(received[0]?.now.toISOString()).toBe('2027-05-05T13:00:00.000Z');
  });

  it('decodifica el audio', async () => {
    const { app, received } = setup();

    const response = await app.inject({
      method: 'POST',
      url: '/simulador/mensajes',
      payload: {
        sessionId,
        audio: {
          base64: Buffer.from('audio').toString('base64'),
          mimeType: 'audio/webm;codecs=opus',
          hintText: 'hola',
        },
      },
    });

    expect(response.json().transcript).toBe('hola');
    expect(received[0]?.audio?.data.toString()).toBe('audio');
  });

  it.each([
    ['sin sesión', { text: 'hola' }],
    ['sin texto ni audio', { sessionId }],
    [
      'con un tipo de audio inválido',
      { sessionId, audio: { base64: 'eA==', mimeType: 'text/html' } },
    ],
    ['con el reloj hacia atrás', { sessionId, text: 'hola', clockOffsetDays: -1 }],
  ])('rechaza un pedido %s', async (_case, payload) => {
    const { app, received } = setup();

    const response = await app.inject({ method: 'POST', url: '/simulador/mensajes', payload });

    expect(response.statusCode).toBe(400);
    expect(received).toHaveLength(0);
  });

  it('sirve un audio guardado y responde 404 si no existe', async () => {
    const { app, audioStore } = setup();
    await audioStore.put(audioId, Buffer.from('ogg'));

    const found = await app.inject({ method: 'GET', url: `/simulador/audio/${audioId}` });
    const missing = await app.inject({ method: 'GET', url: `/simulador/audio/${'b'.repeat(64)}` });

    expect(found.headers['content-type']).toBe('audio/ogg');
    expect(found.body).toBe('ogg');
    expect(missing.statusCode).toBe(404);
  });

  it('empezar de nuevo borra a la persona simulada', async () => {
    const { app, forgotten } = setup();

    await app.inject({ method: 'POST', url: '/simulador/reiniciar', payload: { sessionId } });

    expect(forgotten).toEqual([simulatedPhone(sessionId)]);
  });

  it('un error interno no muestra detalles', async () => {
    const app = buildApp({
      logLevel: 'silent',
      checkDatabase: async () => {},
      simulator: {
        conversation: {
          handle: async () => {
            throw new Error('detalle interno con datos');
          },
          forget: async () => {},
        },
        audioStore: new InMemoryAudioStore(),
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/simulador/mensajes',
      payload: { sessionId, text: 'hola' },
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('detalle interno');
  });
});

describe('simulatedPhone', () => {
  it('es fijo para la misma sesión y distinto entre sesiones', () => {
    const other = '3c59dc04-8d1e-4e5f-9b7a-2f2c3b4a5d6e';

    expect(simulatedPhone(sessionId)).toBe(simulatedPhone(sessionId));
    expect(simulatedPhone(sessionId)).not.toBe(simulatedPhone(other));
    expect(simulatedPhone(sessionId)).toMatch(/^\+5491100\d{7}$/);
  });
});
