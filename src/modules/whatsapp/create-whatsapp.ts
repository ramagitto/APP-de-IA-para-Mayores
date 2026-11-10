import type { Env } from '../../config/env.js';
import type { Services } from '../../composition.js';
import { RateLimiter } from './rate-limiter.js';
import { CloudApi, FakeWhatsAppApi, type WhatsAppApi } from './whatsapp-api.js';
import { WhatsAppProcessor } from './whatsapp-processor.js';

// Con el adaptador falso, los envíos se guardan acá para verlos en una demo local.
export const FAKE_OUTBOX_FILE = 'var/whatsapp-salida.jsonl';

export function createWhatsAppApi(env: Env): WhatsAppApi | undefined {
  if (
    env.WHATSAPP_PROVIDER === 'cloud' &&
    env.WHATSAPP_ACCESS_TOKEN &&
    env.WHATSAPP_PHONE_NUMBER_ID
  ) {
    return new CloudApi({
      accessToken: env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
      graphVersion: env.WHATSAPP_GRAPH_VERSION,
    });
  }
  if (env.WHATSAPP_PROVIDER === 'fake') return new FakeWhatsAppApi(FAKE_OUTBOX_FILE);
  return undefined;
}

export function createWhatsAppProcessor(
  env: Env,
  services: Services,
  api: WhatsAppApi,
  onEvent?: (event: { type: string; count?: number }) => void,
): WhatsAppProcessor {
  return new WhatsAppProcessor({
    orm: services.orm,
    keys: services.keys,
    api,
    router: services.router,
    audioStore: services.audioStore,
    rateLimiter: new RateLimiter(env.WHATSAPP_RATE_LIMIT_PER_MINUTE, 60_000),
    onEvent,
  });
}
