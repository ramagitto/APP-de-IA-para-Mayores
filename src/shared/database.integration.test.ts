import { afterAll, describe, expect, it } from 'vitest';
import { loadEnv } from '../config/env.js';
import { createDatabase, pingDatabase } from './database.js';

describe('conexión a Postgres', () => {
  const database = createDatabase(loadEnv().DATABASE_URL);

  afterAll(() => database.end());

  it('responde al ping', async () => {
    await expect(pingDatabase(database)).resolves.toBeUndefined();
  });
});
