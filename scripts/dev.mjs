// Levanta todo el entorno local con un solo comando: npm run dev
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';

if (!existsSync('.env')) {
  copyFileSync('.env.example', '.env');
  console.log('Creé el archivo .env a partir de .env.example.');
}

console.log('Levantando Postgres con Docker...');
const database = spawnSync('docker', ['compose', 'up', '-d', '--wait', 'db'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (database.status !== 0) {
  console.error('\nNo pude levantar Postgres. ¿Está instalado y abierto Docker Desktop?');
  process.exit(1);
}

const server = spawn('npx', ['tsx', 'watch', 'src/server.ts'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

server.on('exit', (code) => process.exit(code ?? 0));
