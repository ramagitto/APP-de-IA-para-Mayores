import Fastify, { type FastifyInstance } from 'fastify';
import { type DatabaseCheck, registerHealthRoutes } from './modules/health/health.routes.js';

export interface AppOptions {
  logLevel: string;
  checkDatabase: DatabaseCheck;
}

export function buildApp({ logLevel, checkDatabase }: AppOptions): FastifyInstance {
  const app = Fastify({
    logger: {
      level: logLevel,
      // Por ley y por diseño, en los logs no van datos personales ni secretos.
      redact: ['req.headers.authorization', 'req.headers.cookie', 'req.remoteAddress'],
    },
  });

  registerHealthRoutes(app, checkDatabase);

  return app;
}
