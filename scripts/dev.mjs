// Levanta todo el entorno local con un solo comando: npm run dev
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';

const shell = process.platform === 'win32';

if (!existsSync('.env')) {
  copyFileSync('.env.example', '.env');
  console.log('Creé el archivo .env a partir de .env.example.');
}

console.log('Levantando Postgres con Docker...');
const database = spawnSync('docker', ['compose', 'up', '-d', '--wait', 'db'], {
  stdio: 'inherit',
  shell,
});

if (database.status !== 0) {
  console.error('\nNo pude levantar Postgres. ¿Está instalado y abierto Docker Desktop?');
  process.exit(1);
}

const migrations = spawnSync('npx', ['tsx', 'src/shared/db/migrate.ts'], {
  stdio: 'inherit',
  shell,
});

if (migrations.status !== 0) {
  console.error('\nNo pude aplicar las migraciones de la base de datos.');
  process.exit(1);
}

const server = spawn('npx', ['tsx', 'watch', 'src/server.ts'], { stdio: 'inherit', shell });

server.on('exit', (code) => process.exit(code ?? 0));
