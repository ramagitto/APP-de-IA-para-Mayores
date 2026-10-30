import { defineConfig } from 'drizzle-kit';

// Solo se usa para generar migraciones: compara el esquema con los archivos de drizzle/.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/shared/db/schema.ts',
  out: './drizzle',
});
