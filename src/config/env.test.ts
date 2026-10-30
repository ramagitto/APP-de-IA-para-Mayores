import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

const databaseUrl = 'postgres://usuario:clave-secreta@localhost:5433/charla';
const validKey = Buffer.alloc(32, 'x').toString('base64');

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

  it('usa claves de desarrollo para el teléfono solo en local', () => {
    const env = parseEnv({ DATABASE_URL: databaseUrl });

    expect(Buffer.from(env.PHONE_ENCRYPTION_KEY, 'base64')).toHaveLength(32);
    expect(Buffer.from(env.PHONE_HASH_KEY, 'base64')).toHaveLength(32);
    expect(env.PHONE_ENCRYPTION_KEY).not.toBe(env.PHONE_HASH_KEY);
  });

  it('exige las claves del teléfono en producción', () => {
    expect(() => parseEnv({ DATABASE_URL: databaseUrl, APP_ENV: 'production' })).toThrow(
      'PHONE_ENCRYPTION_KEY, PHONE_HASH_KEY',
    );
  });

  it('acepta claves válidas en producción', () => {
    const env = parseEnv({
      DATABASE_URL: databaseUrl,
      APP_ENV: 'production',
      PHONE_ENCRYPTION_KEY: validKey,
      PHONE_HASH_KEY: validKey,
    });

    expect(env.PHONE_ENCRYPTION_KEY).toBe(validKey);
  });

  it('rechaza una clave de largo incorrecto', () => {
    expect(() => parseEnv({ DATABASE_URL: databaseUrl, PHONE_HASH_KEY: 'corta' })).toThrow(
      'PHONE_HASH_KEY',
    );
  });
});
