import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { isValidSignature, isValidVerifyToken } from './signature.js';
import type { WhatsAppProcessor } from './whatsapp-processor.js';

export interface WhatsAppWebhookDeps {
  appSecret: string;
  verifyToken: string;
  processor: Pick<WhatsAppProcessor, 'receive'>;
}

const verifyQuerySchema = z.object({
  'hub.mode': z.string().optional(),
  'hub.verify_token': z.string().optional(),
  'hub.challenge': z.string().max(200).optional(),
});

// Webhook de WhatsApp en /webhooks/whatsapp.
export function registerWhatsAppWebhook(app: FastifyInstance, deps: WhatsAppWebhookDeps): void {
  const plugin: FastifyPluginAsync = async (scope) => {
    // La firma se calcula sobre el cuerpo exacto: hay que recibirlo sin interpretar.
    scope.addContentTypeParser(
      'application/json',
      { parseAs: 'buffer', bodyLimit: 4 * 1024 * 1024 },
      (_request, body, done) => done(null, body),
    );

    // Verificación: Meta llama una vez al configurar el webhook.
    scope.get('/webhooks/whatsapp', async (request, reply) => {
      const query = verifyQuerySchema.safeParse(request.query);
      const valid =
        query.success &&
        query.data['hub.mode'] === 'subscribe' &&
        query.data['hub.challenge'] !== undefined &&
        isValidVerifyToken(query.data['hub.verify_token'], deps.verifyToken);

      if (!valid) return reply.code(403).send({ error: 'Verificación inválida' });
      return reply.type('text/plain').send(query.data['hub.challenge']);
    });

    scope.post('/webhooks/whatsapp', async (request, reply) => {
      const rawBody = request.body as Buffer;
      const signature = request.headers['x-hub-signature-256'];

      if (
        !isValidSignature(
          rawBody,
          typeof signature === 'string' ? signature : undefined,
          deps.appSecret,
        )
      ) {
        request.log.warn('Webhook con firma inválida');
        return reply.code(401).send({ error: 'Firma inválida' });
      }

      let payload: unknown;
      try {
        payload = JSON.parse(rawBody.toString('utf8'));
      } catch {
        return reply.code(400).send({ error: 'Pedido inválido' });
      }

      const result = await deps.processor.receive(payload);
      request.log.info(result, 'Webhook de WhatsApp recibido');

      // Siempre 200 si la firma es válida: si no, Meta reintenta durante días.
      return reply.code(200).send({ ok: true });
    });
  };

  void app.register(plugin);
}
