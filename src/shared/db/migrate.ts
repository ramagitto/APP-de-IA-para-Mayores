import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { loadEnv } from '../../config/env.js';
import { createDatabase, createOrm } from './database.js';

const database = createDatabase(loadEnv().DATABASE_URL);

try {
  await migrate(createOrm(database), { migrationsFolder: 'drizzle' });
  console.log('Migraciones aplicadas.');
} finally {
  await database.end();
}
