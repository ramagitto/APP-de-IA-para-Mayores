import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createDatabase, pingDatabase } from './shared/database.js';

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL);
const app = buildApp({
  logLevel: env.LOG_LEVEL,
  checkDatabase: () => pingDatabase(database),
});

async function shutdown(): Promise<void> {
  await app.close();
  await database.end();
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());

await app.listen({ host: '0.0.0.0', port: env.PORT });
