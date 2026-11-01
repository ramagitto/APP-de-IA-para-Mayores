import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

export type Database = pg.Pool;
export type Orm = NodePgDatabase<typeof schema>;

export function createDatabase(connectionString: string): Database {
  return new pg.Pool({ connectionString, max: 10, connectionTimeoutMillis: 5_000 });
}

export function createOrm(database: Database): Orm {
  return drizzle({ client: database, schema });
}

export async function pingDatabase(database: Database): Promise<void> {
  await database.query('SELECT 1');
}
