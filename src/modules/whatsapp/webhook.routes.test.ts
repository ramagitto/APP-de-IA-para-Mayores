import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { signPayload } from './signature.js';
import { registerWhatsAppWebhook } from './webhook.routes.js';

const appSecret = 'secreto-de-prueba';
const verifyToken = 'token-de-prueba';

function setup() {
  const received: unknown[] = [];
  const app = Fastify({ logger: false });
  registerWhatsAppWebhook(app, {
    appSecret,
    verifyToken,
    processor: {
      receive: async (payload) => {
        received.push(payload);
        return { accepted: 1, duplicates: 0, limited: 0 };
      },
    },
  });
  return { app, received };
}

function post(app: ReturnType<typeof setup>['app'], body: string, signature?: string) {
  return app.inject({
    method: 'POST',
    url: '/webhooks/whatsapp',
    headers: {
      'content-type': 'application/json',
      ...(signature && { 'x-hub-signature-256': signature }),
    },
    payload: body,
  });
}

describe('verificación del webhook', () => {
  it('devuelve el desafío si el token coincide', async () => {
    const { app } = setup();

    const response = await app.inject({
      method: 'GET',
      url: `/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=12345`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('12345');
  });

  it('rechaza un token equivocado', async () => {
    const { app } = setup();

    const response = await app.inject({
      method: 'GET',
      url: '/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=12345',
    });

    expect(response.statusCode).toBe(403);
  });
});

describe('recepción de mensajes', () => {
  const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });

  it('procesa un webhook firmado', async () => {
    const { app, received } = setup();

    const response = await post(app, body, signPayload(Buffer.from(body), appSecret));

    expect(response.statusCode).toBe(200);
    expect(received).toEqual([JSON.parse(body)]);
  });

  it('rechaza un webhook sin firma o con firma falsa, sin procesarlo', async () => {
    const { app, received } = setup();

    expect((await post(app, body)).statusCode).toBe(401);
    expect((await post(app, body, signPayload(Buffer.from(body), 'otro'))).statusCode).toBe(401);
    expect(received).toEqual([]);
  });

  it('la firma se verifica sobre el cuerpo exacto', async () => {
    const { app } = setup();
    const signature = signPayload(Buffer.from(body), appSecret);

    // El mismo JSON con otro formato es otro cuerpo: la firma ya no coincide.
    const reformatted = JSON.stringify(JSON.parse(body), null, 2);

    expect((await post(app, reformatted, signature)).statusCode).toBe(401);
  });

  it('rechaza un cuerpo firmado que no es JSON', async () => {
    const { app } = setup();
    const notJson = 'esto no es json';

    expect(
      (await post(app, notJson, signPayload(Buffer.from(notJson), appSecret))).statusCode,
    ).toBe(400);
  });
});
