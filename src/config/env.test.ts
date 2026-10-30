import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

const databaseUrl = 'postgres://usuario:clave-secreta@localhost:5433/charla';

describe('parseEnv', () => {
  it('aplica los valores por defecto', () => {
    const env = parseEnv({ DATABASE_URL: databaseUrl });

    expect(env).toMatchObject({ APP_ENV: 'local', PORT: 3000, LOG_LEVEL: 'info' });
  });

  it('convierte el puerto a número', () => {
    expect(parseEnv({ DATABASE_URL: databaseUrl, PORT: '8080' }).PORT).toBe(8080);
  });

  it('rechaza una base que no sea Postgres', () => {
    expect(() => parseEnv({ DATABASE_URL: 'mysql://localhost/charla' })).toThrow('DATABASE_URL');
  });

  it('avisa qué variable falta', () => {
    expect(() => parseEnv({})).toThrow('DATABASE_URL');
  });

  it('no filtra el valor de las variables en el error', () => {
    expect(() => parseEnv({ DATABASE_URL: databaseUrl, APP_ENV: 'clave-secreta' })).toThrow(
      /^(?!.*clave-secreta).*APP_ENV/,
    );
  });
});
