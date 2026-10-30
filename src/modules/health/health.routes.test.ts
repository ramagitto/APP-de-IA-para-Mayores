import { describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';

describe('GET /health', () => {
  it('responde 200 cuando la base de datos está disponible', async () => {
    const app = buildApp({ logLevel: 'silent', checkDatabase: async () => {} });

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', database: 'ok' });
  });

  it('responde 503 sin exponer el error cuando la base de datos falla', async () => {
    const app = buildApp({
      logLevel: 'silent',
      checkDatabase: async () => {
        throw new Error('connect ECONNREFUSED usuario:clave-secreta');
      },
    });

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'degraded', database: 'unreachable' });
    expect(response.body).not.toContain('clave-secreta');
  });
});
