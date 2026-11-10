# Historial de cambios

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Se actualiza al cerrar cada fase.

## [Sin publicar]

### Fase 2: tutor de IA

Hecha en una sesión autónoma. Las decisiones tomadas sin el equipo están en `docs/decisiones-pendientes.md`.

#### Agregado

- Tutor de IA con capas de seguridad: mensajes de cuidado, freno a la manipulación, ocultado de datos sensibles, tope de costo diario, controles de salida y notas obligatorias de derivación.
- Detección por reglas de angustia, emergencia médica, estafa en curso, intención riesgosa, datos sensibles, manipulación y temas de salud, plata o legales.
- Mensajes de cuidado que no avanzan la lección ni cuentan para su tope.
- Interfaz de proveedor de IA, con un proveedor simulado (por defecto) y un adaptador de Anthropic (Claude Haiku 5.5, sin probar contra la API real).
- Respaldo por reglas cuando el proveedor falla, rechaza el pedido, se pasa el tope o da una respuesta que no pasa los controles.
- Tabla `usage_costs`, con el costo de cada llamada por persona y por día.
- 43 evals en 11 categorías, con umbrales del 100% en las críticas, que se corren con `npm run evals` y en la CI.
- ADR 0008 y registro de decisiones pendientes.
- Líneas de ayuda públicas en los mensajes de cuidado (135, (011) 5275-1135, 0800-999-0091, 911 y 107), guardadas en `content/lineas-de-ayuda.yaml` con fuente y fecha de verificación.
- Checklist de salida para el piloto.

#### Cambiado

- `npm run lesson:play` usa el tutor completo, con el proveedor configurado.
- Una clave o un PIN se ocultan aunque la frase tenga más contexto, como "mi clave del banco es...".

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
- Plan de las fases que faltan y guía para seguir desde otra PC.
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
