import { buildApp } from './app.js';
import { buildServices } from './composition.js';
import { loadEnv } from './config/env.js';
import { createWhatsAppApi, createWhatsAppProcessor } from './modules/whatsapp/create-whatsapp.js';
import { PgBossQueue } from './modules/whatsapp/job-queue.js';
import { createWebBackend } from './modules/web/web-backend.js';
import { registerWhatsAppWebhook } from './modules/whatsapp/webhook.routes.js';
import { createDatabase, createOrm, pingDatabase } from './shared/db/database.js';

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL);
const services = buildServices(env, createOrm(database));

const app = buildApp({
  logLevel: env.LOG_LEVEL,
  checkDatabase: () => pingDatabase(database),
  // El simulador no tiene login: solo existe en local.
  simulator:
    env.APP_ENV === 'local'
      ? { router: services.router, audioStore: services.audioStore }
      : undefined,
  web: {
    backend: createWebBackend({
      orm: services.orm,
      keys: services.keys,
      router: services.webRouter,
    }),
    audioStore: services.audioStore,
    audioMimeType: services.voice.audioMimeType,
    // En producción no se usa el reconocimiento del navegador: puede mandar la voz a terceros.
    voiceInput: services.voice.transcribesAudio
      ? 'server'
      : env.APP_ENV === 'local'
        ? 'browser'
        : 'off',
  },
});

// WhatsApp: solo si está configurado (WHATSAPP_PROVIDER distinto de disabled).
const whatsappApi = createWhatsAppApi(env);
let queue: PgBossQueue | undefined;

if (whatsappApi && env.WHATSAPP_APP_SECRET && env.WHATSAPP_VERIFY_TOKEN) {
  const processor = createWhatsAppProcessor(env, services, whatsappApi, (event) =>
    app.log.info(event, 'WhatsApp'),
  );
  queue = new PgBossQueue(env.DATABASE_URL);
  processor.useQueue(queue);
  await queue.start((eventId) => processor.process(eventId));

  registerWhatsAppWebhook(app, {
    appSecret: env.WHATSAPP_APP_SECRET,
    verifyToken: env.WHATSAPP_VERIFY_TOKEN,
    processor,
  });
}

async function shutdown(): Promise<void> {
  await app.close();
  await queue?.stop();
  await database.end();
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());

await app.listen({ host: '0.0.0.0', port: env.PORT });

if (env.APP_ENV === 'local') {
  app.log.info(`Simulador en http://localhost:${env.PORT}/simulador`);
  app.log.info('Links del piloto web: npm run pilot -- crear 1');
}
if (whatsappApi) {
  app.log.info(`Webhook de WhatsApp (${env.WHATSAPP_PROVIDER}) en /webhooks/whatsapp`);
}
