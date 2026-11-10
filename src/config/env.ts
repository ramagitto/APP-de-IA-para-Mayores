import { existsSync } from 'node:fs';
import { z } from 'zod';

// Solo para desarrollo local, donde los teléfonos son de prueba. No protegen nada real.
const LOCAL_ENCRYPTION_KEY = Buffer.alloc(32, 'charla-local-cifrado').toString('base64');
const LOCAL_HASH_KEY = Buffer.alloc(32, 'charla-local-hash').toString('base64');

const secretKey = z
  .string()
  .refine((value) => Buffer.from(value, 'base64').length === 32, 'Debe tener 32 bytes en base64');

// Variables del tutor. Están aparte porque las evals las usan sin necesitar la base de datos.
const tutorShape = {
  // Sin clave configurada se usa el proveedor simulado, que no gasta plata.
  LLM_PROVIDER: z.enum(['mock', 'anthropic']).default('mock'),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  TUTOR_MODEL: z.string().min(1).default('claude-haiku-5-5'),
  // Unos ARS 15 por día al dólar oficial de $1.550: entra en la meta de ARS 500 por mes.
  TUTOR_DAILY_BUDGET_USD: z.coerce.number().positive().default(0.01),
};

// Variables de voz. Sin claves, se usan proveedores simulados.
const voiceShape = {
  STT_PROVIDER: z.enum(['mock', 'openai']).default('mock'),
  OPENAI_API_KEY: z.string().min(1).optional(),
  // gpt-4o-mini-transcribe se da de baja el 26/2/2027: OpenAI recomienda gpt-transcribe.
  STT_MODEL: z.string().min(1).default('gpt-transcribe'),
  TTS_PROVIDER: z.enum(['mock', 'azure']).default('mock'),
  AZURE_SPEECH_KEY: z.string().min(1).optional(),
  AZURE_SPEECH_REGION: z
    .string()
    .regex(/^[a-z0-9]+$/, 'Una región de Azure, por ejemplo eastus')
    .optional(),
  TTS_VOICE: z.string().min(1).default('es-AR-ElenaNeural'),
  AUDIO_CACHE_DIR: z.string().min(1).default('var/audio'),
};

// Cada proveedor real necesita sus claves. Sin ellas, mejor fallar al arrancar que a mitad de una lección.
const REQUIRED_KEYS: [string, string, string[]][] = [
  ['LLM_PROVIDER', 'anthropic', ['ANTHROPIC_API_KEY']],
  ['STT_PROVIDER', 'openai', ['OPENAI_API_KEY']],
  ['TTS_PROVIDER', 'azure', ['AZURE_SPEECH_KEY', 'AZURE_SPEECH_REGION']],
];

function requireProviderKey(env: Record<string, unknown>, context: z.RefinementCtx): void {
  for (const [variable, provider, keys] of REQUIRED_KEYS) {
    if (env[variable] !== provider) continue;

    for (const key of keys) {
      if (!env[key]) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: `Obligatoria con ${variable}=${provider}`,
        });
      }
    }
  }
}

const tutorEnvSchema = z.object(tutorShape).superRefine(requireProviderKey);

const envSchema = z
  .object({
    APP_ENV: z.enum(['local', 'production']).default('local'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    PHONE_ENCRYPTION_KEY: secretKey.optional(),
    PHONE_HASH_KEY: secretKey.optional(),
    ...tutorShape,
    ...voiceShape,
  })
  .superRefine((env, context) => {
    requireProviderKey(env, context);

    if (env.APP_ENV === 'local') return;

    for (const key of ['PHONE_ENCRYPTION_KEY', 'PHONE_HASH_KEY'] as const) {
      if (!env[key]) {
        context.addIssue({ code: 'custom', path: [key], message: 'Obligatoria fuera de local' });
      }
    }
  })
  .transform((env) => ({
    ...env,
    PHONE_ENCRYPTION_KEY: env.PHONE_ENCRYPTION_KEY ?? LOCAL_ENCRYPTION_KEY,
    PHONE_HASH_KEY: env.PHONE_HASH_KEY ?? LOCAL_HASH_KEY,
  }));

export type Env = z.infer<typeof envSchema>;
export type TutorEnv = z.infer<typeof tutorEnvSchema>;

// Los mensajes de error nombran la variable, pero nunca muestran su valor, porque puede ser un secreto.
function parseWith<T>(schema: z.ZodType<T>, source: Record<string, string | undefined>): T {
  const result = schema.safeParse(source);

  if (!result.success) {
    const invalid = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Variables de entorno inválidas o faltantes: ${invalid}`);
  }

  return result.data;
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  return parseWith(envSchema, source);
}

export function parseTutorEnv(source: Record<string, string | undefined>): TutorEnv {
  return parseWith(tutorEnvSchema, source);
}

function loadEnvFile(): void {
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }
}

export function loadEnv(): Env {
  loadEnvFile();
  return parseEnv(process.env);
}

export function loadTutorEnv(): TutorEnv {
  loadEnvFile();
  return parseTutorEnv(process.env);
}
