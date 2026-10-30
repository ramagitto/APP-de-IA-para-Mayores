import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { loadEnv } from '../src/config/env.js';
import { createDatabase, createOrm } from '../src/shared/db/database.js';

// Los tests de integración siempre corren contra el esquema actualizado.
export async function setup(): Promise<void> {
  const database = createDatabase(loadEnv().DATABASE_URL);

  try {
    await migrate(createOrm(database), { migrationsFolder: 'drizzle' });
  } finally {
    await database.end();
  }
}
