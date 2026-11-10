import { buildApp } from './app.js';
import { buildServices } from './composition.js';
import { loadEnv } from './config/env.js';
import { createDatabase, createOrm, pingDatabase } from './shared/db/database.js';

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL);
const services = buildServices(env, createOrm(database));

const app = buildApp({
  logLevel: env.LOG_LEVEL,
  checkDatabase: () => pingDatabase(database),
  // El simulador no tiene login: solo existe en local.
  simulator:
    env.APP_ENV === 'local'
      ? { router: services.router, audioStore: services.audioStore }
      : undefined,
});

async function shutdown(): Promise<void> {
  await app.close();
  await database.end();
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());

await app.listen({ host: '0.0.0.0', port: env.PORT });

if (env.APP_ENV === 'local') {
  app.log.info(`Simulador en http://localhost:${env.PORT}/simulador`);
}
