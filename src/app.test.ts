import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

describe('logs', () => {
  it('no guardan la query de la URL, que puede traer secretos', async () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, done) {
        lines.push(String(chunk));
        done();
      },
    });
    const app = buildApp({ logLevel: 'info', checkDatabase: async () => {}, logStream: stream });

    await app.inject({ method: 'GET', url: '/health?hub.verify_token=secreto' });

    expect(lines.join('')).toContain('/health');
    expect(lines.join('')).not.toContain('secreto');
  });
});
