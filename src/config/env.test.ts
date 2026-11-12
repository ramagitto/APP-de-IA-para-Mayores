import { describe, expect, it } from 'vitest';
import { parseEnv, parseTutorEnv } from './env.js';

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
      PUBLIC_BASE_URL: 'https://charla.example.org/',
    });

    expect(env.PHONE_ENCRYPTION_KEY).toBe(validKey);
    expect(env.PUBLIC_BASE_URL).toBe('https://charla.example.org');
  });

  it('exige HTTPS en la dirección pública fuera de local', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: databaseUrl,
        APP_ENV: 'production',
        PHONE_ENCRYPTION_KEY: validKey,
        PHONE_HASH_KEY: validKey,
        PUBLIC_BASE_URL: 'http://charla.example.org',
      }),
    ).toThrow('PUBLIC_BASE_URL');
  });

  it('en local, los links apuntan a localhost y el audio es OGG', () => {
    expect(parseEnv({ DATABASE_URL: databaseUrl })).toMatchObject({
      PUBLIC_BASE_URL: 'http://localhost:3000',
      TTS_AUDIO_FORMAT: 'ogg',
    });
  });

  it('usa el proveedor simulado por defecto', () => {
    expect(parseEnv({ DATABASE_URL: databaseUrl })).toMatchObject({
      LLM_PROVIDER: 'mock',
      TUTOR_MODEL: 'claude-haiku-5-5',
      TUTOR_DAILY_BUDGET_USD: 0.01,
    });
  });

  it('exige la clave si se elige el proveedor real', () => {
    expect(() => parseEnv({ DATABASE_URL: databaseUrl, LLM_PROVIDER: 'anthropic' })).toThrow(
      'ANTHROPIC_API_KEY',
    );
  });

  it('las variables del tutor se leen sin necesitar la base de datos', () => {
    expect(parseTutorEnv({}).LLM_PROVIDER).toBe('mock');
    expect(() => parseTutorEnv({ LLM_PROVIDER: 'anthropic' })).toThrow('ANTHROPIC_API_KEY');
  });

  it('usa proveedores de voz simulados por defecto', () => {
    expect(parseEnv({ DATABASE_URL: databaseUrl })).toMatchObject({
      STT_PROVIDER: 'mock',
      STT_MODEL: 'gpt-transcribe',
      TTS_PROVIDER: 'mock',
      TTS_VOICE: 'es-AR-ElenaNeural',
    });
  });

  it('exige las claves de cada proveedor de voz real', () => {
    expect(() => parseEnv({ DATABASE_URL: databaseUrl, STT_PROVIDER: 'openai' })).toThrow(
      'OPENAI_API_KEY',
    );
    expect(() => parseEnv({ DATABASE_URL: databaseUrl, TTS_PROVIDER: 'azure' })).toThrow(
      'AZURE_SPEECH_KEY, AZURE_SPEECH_REGION',
    );
  });

  it('WhatsApp está apagado por defecto', () => {
    expect(parseEnv({ DATABASE_URL: databaseUrl })).toMatchObject({
      WHATSAPP_PROVIDER: 'disabled',
      WHATSAPP_GRAPH_VERSION: 'v27.0',
    });
  });

  it('WhatsApp exige el secreto y el token de verificación, y en la nube también el acceso', () => {
    expect(() => parseEnv({ DATABASE_URL: databaseUrl, WHATSAPP_PROVIDER: 'fake' })).toThrow(
      'WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN',
    );
    expect(() =>
      parseEnv({
        DATABASE_URL: databaseUrl,
        WHATSAPP_PROVIDER: 'cloud',
        WHATSAPP_APP_SECRET: 'a',
        WHATSAPP_VERIFY_TOKEN: 'b',
      }),
    ).toThrow('WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID');
  });

  it('el adaptador falso de WhatsApp no se puede usar en producción', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: databaseUrl,
        APP_ENV: 'production',
        PHONE_ENCRYPTION_KEY: validKey,
        PHONE_HASH_KEY: validKey,
        WHATSAPP_PROVIDER: 'fake',
        WHATSAPP_APP_SECRET: 'a',
        WHATSAPP_VERIFY_TOKEN: 'b',
      }),
    ).toThrow('WHATSAPP_PROVIDER');
  });

  it('una variable vacía cuenta como no definida', () => {
    const env = parseEnv({ DATABASE_URL: databaseUrl, ANTHROPIC_API_KEY: '', PORT: '' });

    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(env.PORT).toBe(3000);
  });

  it('rechaza una clave de largo incorrecto', () => {
    expect(() => parseEnv({ DATABASE_URL: databaseUrl, PHONE_HASH_KEY: 'corta' })).toThrow(
      'PHONE_HASH_KEY',
    );
  });
});
