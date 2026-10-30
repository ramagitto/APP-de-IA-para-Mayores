# Historial de cambios

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Se actualiza al cerrar cada fase.

## [Sin publicar]

### Fase 1: dominio y contenido

#### Agregado

- Motor de lecciones como máquina de estados: intro, práctica, desafío y cierre, con tope de 5 mensajes pagos.
- Rachas sin castigo, sobre lecciones de lunes a viernes, con feriados y hora de Buenos Aires.
- Progreso por nivel y selección de la próxima lección.
- Formato de lección en YAML, con validador y control en la CI.
- 10 lecciones en borrador: 8 regulares y 2 antiestafas.
- Tablas `users`, `consents`, `lesson_attempts` y `streaks`, con migración y datos de prueba.
- Teléfonos cifrados con AES-256-GCM y búsqueda por HMAC.
- Recorrido de una lección por consola, con un tutor simulado.
- Registro de horas, checklist del trámite de Meta y guía para revisar lecciones.
- ADR de los recortes del MVP y del motor de lecciones.

#### Cambiado

- `npm run dev` aplica las migraciones al arrancar.
- `APP_ENV` admite solo `local` y `production`, porque no hay staging.

### Fase 0: esqueleto

#### Agregado

- Servidor Fastify con `GET /health`, que informa si llega a la base de datos.
- Validación de variables de entorno con Zod.
- Postgres local con Docker y arranque con `npm run dev`.
- ESLint, Prettier, TypeScript estricto y Vitest.
- CI en GitHub Actions: formato, lint, tipos, tests, build y arranque local.
- ADRs de stack, base de datos y cola, proveedores de IA, hosting y WhatsApp.
- Documentación de arquitectura, modelo de datos, tarifas de WhatsApp y costos.
