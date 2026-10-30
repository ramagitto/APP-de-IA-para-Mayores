import pg from 'pg';

export type Database = pg.Pool;

export function createDatabase(connectionString: string): Database {
  return new pg.Pool({ connectionString, max: 10, connectionTimeoutMillis: 5_000 });
}

export async function pingDatabase(database: Database): Promise<void> {
  await database.query('SELECT 1');
}
