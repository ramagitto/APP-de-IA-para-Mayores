import Fastify, { type FastifyInstance } from 'fastify';
import { type DatabaseCheck, registerHealthRoutes } from './modules/health/health.routes.js';
import {
  registerSimulatorRoutes,
  type SimulatorDeps,
} from './modules/simulator/simulator.routes.js';
import { registerWebRoutes, type WebDeps } from './modules/web/web.routes.js';

export interface AppOptions {
  logLevel: string;
  checkDatabase: DatabaseCheck;
  /** Solo en local: el simulador no tiene login. */
  simulator?: SimulatorDeps;
  /** El piloto web, con links personales. */
  web?: WebDeps;
  /** Solo para tests: a dónde se escriben los logs. */
  logStream?: NodeJS.WritableStream;
}

// Sin la query, porque la verificación del webhook trae ahí su token, y sin el token del link
// personal de la web, que alcanza para entrar como esa persona.
export function safeUrl(url: string): string {
  return (url.split('?')[0] ?? '').replace(/^\/p\/[^/]+/, '/p/:token');
}

export function buildApp({
  logLevel,
  checkDatabase,
  simulator,
  web,
  logStream,
}: AppOptions): FastifyInstance {
  const app = Fastify({
    logger: {
      level: logLevel,
      ...(logStream && { stream: logStream }),
      // Por ley y por diseño, en los logs no van datos personales ni secretos.
      redact: ['req.headers.authorization', 'req.headers.cookie', 'req.remoteAddress'],
      serializers: {
        req: (request: { method: string; url: string }) => ({
          method: request.method,
          url: safeUrl(request.url),
        }),
      },
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
  if (web) registerWebRoutes(app, web);

  return app;
}
