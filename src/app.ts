import Fastify, { type FastifyInstance } from 'fastify';
import { type DatabaseCheck, registerHealthRoutes } from './modules/health/health.routes.js';
import {
  registerSimulatorRoutes,
  type SimulatorDeps,
} from './modules/simulator/simulator.routes.js';

export interface AppOptions {
  logLevel: string;
  checkDatabase: DatabaseCheck;
  /** Solo en local: el simulador no tiene login. */
  simulator?: SimulatorDeps;
}

export function buildApp({ logLevel, checkDatabase, simulator }: AppOptions): FastifyInstance {
  const app = Fastify({
    logger: {
      level: logLevel,
      // Por ley y por diseño, en los logs no van datos personales ni secretos.
      redact: ['req.headers.authorization', 'req.headers.cookie', 'req.remoteAddress'],
    },
  });

  // Un error nunca muestra detalles internos a quien hizo el pedido.
  app.setErrorHandler((error: { statusCode?: number }, request, reply) => {
    const status = error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
    if (status === 500) request.log.error({ err: error }, 'Error inesperado');

    return reply
      .code(status)
      .send({ error: status === 500 ? 'Algo salió mal' : 'Pedido inválido' });
  });

  registerHealthRoutes(app, checkDatabase);
  if (simulator) registerSimulatorRoutes(app, simulator);

  return app;
}
