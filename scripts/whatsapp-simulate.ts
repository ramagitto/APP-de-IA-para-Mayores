// Manda al webhook local un mensaje de WhatsApp simulado y firmado, como lo haría Meta.
// Necesita el servidor corriendo con WHATSAPP_PROVIDER=fake.
//   npm run whatsapp:simulate -- "hola"
//   npm run whatsapp:simulate -- "ACEPTO" --usuario AR.1000000002
// Las respuestas quedan en var/whatsapp-salida.jsonl.
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { textPayload } from '../test/whatsapp-payloads.js';
import { loadEnv } from '../src/config/env.js';
import { FAKE_OUTBOX_FILE } from '../src/modules/whatsapp/create-whatsapp.js';
import { signPayload } from '../src/modules/whatsapp/signature.js';

const env = loadEnv();
const args = process.argv.slice(2);
const userFlag = args.indexOf('--usuario');
const userId = userFlag >= 0 ? args[userFlag + 1] : 'AR.1000000001';
const text = args.filter((_, index) => index !== userFlag && index !== userFlag + 1).join(' ');

if (env.WHATSAPP_PROVIDER !== 'fake' || !env.WHATSAPP_APP_SECRET) {
  console.error(
    'Configurá WHATSAPP_PROVIDER=fake y WHATSAPP_APP_SECRET en el .env, y reiniciá el servidor.',
  );
  process.exit(1);
}
if (!text || !userId) {
  console.error('Usá: npm run whatsapp:simulate -- "hola"');
  process.exit(1);
}

const before = await readFile(FAKE_OUTBOX_FILE, 'utf8').catch(() => '');
const body = Buffer.from(
  JSON.stringify(textPayload(text, `wamid.simulado-${randomUUID()}`, userId)),
);

const response = await fetch(`http://localhost:${env.PORT}/webhooks/whatsapp`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Hub-Signature-256': signPayload(body, env.WHATSAPP_APP_SECRET),
  },
  body,
});
console.log(`Webhook: ${response.status}`);

// El procesamiento va por la cola: esperamos un poco a que aparezcan las respuestas.
for (let attempt = 0; attempt < 20; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const after = await readFile(FAKE_OUTBOX_FILE, 'utf8').catch(() => '');
  if (after.length > before.length) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const lines = (await readFile(FAKE_OUTBOX_FILE, 'utf8'))
      .slice(before.length)
      .trim()
      .split('\n');
    for (const line of lines) {
      const message = JSON.parse(line) as { type: string; body?: string };
      console.log(`\nCharlá [${message.type}]:\n${message.body ?? ''}`);
    }
    process.exit(0);
  }
}

console.log('No llegaron respuestas. ¿El servidor está corriendo con WHATSAPP_PROVIDER=fake?');
