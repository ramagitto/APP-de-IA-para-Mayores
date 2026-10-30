# Historial de cambios

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Se actualiza al cerrar cada fase.

## [Sin publicar]

### Fase 0: esqueleto

#### Agregado

- Servidor Fastify con `GET /health`, que informa si llega a la base de datos.
- Validación de variables de entorno con Zod.
- Postgres local con Docker y arranque con `npm run dev`.
- ESLint, Prettier, TypeScript estricto y Vitest.
- CI en GitHub Actions: formato, lint, tipos, tests, build y arranque local.
- ADRs de stack, base de datos y cola, proveedores de IA, hosting y WhatsApp.
- Documentación de arquitectura, modelo de datos, tarifas de WhatsApp y costos.
