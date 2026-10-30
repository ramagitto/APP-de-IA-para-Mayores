import { existsSync } from 'node:fs';
import { z } from 'zod';

const envSchema = z.object({
  APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
});

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
