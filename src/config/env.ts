import { existsSync } from 'node:fs';
import { z } from 'zod';

// Solo para desarrollo local, donde los teléfonos son de prueba. No protegen nada real.
const LOCAL_ENCRYPTION_KEY = Buffer.alloc(32, 'charla-local-cifrado').toString('base64');
const LOCAL_HASH_KEY = Buffer.alloc(32, 'charla-local-hash').toString('base64');

const secretKey = z
  .string()
  .refine((value) => Buffer.from(value, 'base64').length === 32, 'Debe tener 32 bytes en base64');

const envSchema = z
  .object({
    APP_ENV: z.enum(['local', 'production']).default('local'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    PHONE_ENCRYPTION_KEY: secretKey.optional(),
    PHONE_HASH_KEY: secretKey.optional(),
  })
  .superRefine((env, context) => {
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

// Los mensajes de error nombran la variable, pero nunca muestran su valor, porque puede ser un secreto.
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const invalid = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Variables de entorno inválidas o faltantes: ${invalid}`);
  }

  return result.data;
}

export function loadEnv(): Env {
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }

  return parseEnv(process.env);
}
