import type { FastifyInstance } from 'fastify';

export type DatabaseCheck = () => Promise<void>;

export function registerHealthRoutes(app: FastifyInstance, checkDatabase: DatabaseCheck): void {
  app.get('/health', async (request, reply) => {
    try {
      await checkDatabase();
      return { status: 'ok', database: 'ok' };
    } catch (error) {
      request.log.error({ err: error }, 'Falló el chequeo de la base de datos');
      return reply.code(503).send({ status: 'degraded', database: 'unreachable' });
    }
  });
}
