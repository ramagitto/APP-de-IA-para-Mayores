# Charlá: guía del proyecto

Curso de IA para personas de 65+ por WhatsApp. MVP para un piloto de 30 usuarios, escalable a 100. El equipo es junior: las decisiones se explican en lenguaje simple porque hay que defenderlas ante la cátedra.

## Cómo trabajamos

- **Por fases (0 a 8).** Antes de cada fase: mini plan con tareas, horas y criterios de aceptación. Al terminarla: frenar, resumir, comparar las horas de `docs/horas.md` con lo estimado y esperar el OK. No se avanza de fase sin OK.
- **Una sola persona desarrolla,** unas 10 horas por semana. El resto del grupo toma lo que no es código: contenidos, pruebas con usuarios y el trámite de Meta.
- **Código en `main` vía PR**, con commits chicos en Conventional Commits y CI en verde.
- **No inventar detalles de APIs externas.** Confirmar en la documentación oficial o marcarlo como supuesto.
- **Si algo es inviable, caro o hay una alternativa mejor, avisar antes de implementarlo.**
- **Cada decisión importante lleva un ADR** en `docs/adr/`. Al cerrar una fase se actualiza `CHANGELOG.md`.

## Comandos

- `npm run dev`: levanta Postgres en Docker y el servidor.
- `npm run check`: formato, lint, tipos, tests unitarios y build. Correrlo antes de abrir un PR.
- `npm run test:integration`: tests contra Postgres real.
- `npm run lessons:check`: valida lecciones y feriados.
- `npm run lesson:play -- n1-l01`: recorre una lección por consola, sin base de datos.
- `npm run db:generate -- --name <nombre>` y `npm run db:migrate`: crean y aplican migraciones.
- `npm run evals`: evals del tutor con el proveedor de `LLM_PROVIDER` (simulado por defecto, gratis).
- `npm run whatsapp:simulate -- "hola"`: manda al webhook local un mensaje firmado, con `WHATSAPP_PROVIDER=fake`.
- `npm run support -- listar`: pedidos de AYUDA y avisos de cuidado (también `responder <id> "texto"` y `cerrar <id>`).
- Con `npm run dev`, el simulador está en `http://localhost:3000/simulador` (solo con `APP_ENV=local`).

## Convenciones de código

- TypeScript estricto en ESM. Los imports relativos llevan extensión `.js`.
- Monolito modular: cada tema vive en `src/modules/<tema>/` y lo compartido en `src/shared/`.
- El núcleo del producto no conoce WhatsApp: los canales son adaptadores.
- `buildApp` no abre puertos ni crea conexiones: recibe sus dependencias para poder testearlo.
- El motor de lecciones y las rachas son funciones puras: la fecha entra como parámetro y no tocan la base de datos.
- Las lecciones viven en `content/lessons/`. Sus claves están en español, porque las edita el rol de contenidos.
- Las entradas externas se validan con Zod. Las variables de entorno se leen solo en `src/config/env.ts`.
- Los tests van junto al código (`*.test.ts`). Los que usan Postgres se llaman `*.integration.test.ts`.
- Textos para usuarios: español rioplatense, con voseo, cálido, frases cortas y sin tecnicismos.
- Nombres de código en inglés; comentarios y documentación en español.

## Reglas que no se negocian

- **El repositorio es público.** Ni secretos, ni teléfonos, ni nombres de usuarios o del titular de la cuenta de Meta.
- **Sin datos personales en los logs.**
- **Charlá nunca pide datos personales, claves ni códigos.**
- **El tutor es un curso cerrado, no un asistente general.** Solo trabaja sobre la lección. Esto es clave para cumplir los términos de Meta ([ADR 0005](docs/adr/0005-whatsapp-inicio-por-usuario-y-curso-cerrado.md)).
- **El tutor no da consejos médicos, legales ni financieros concretos:** deriva al profesional.
- **La seguridad no depende solo del modelo.** Los mensajes de cuidado, el ocultado de datos, los controles de salida y las notas de derivación son reglas nuestras, en `src/modules/safety/` y `src/modules/tutor/` ([ADR 0008](docs/adr/0008-tutor-guardrails-y-evals.md)). Todo cambio en el tutor tiene que mantener las evals críticas al 100%.
- **Nunca se escribe el texto del usuario en los logs** ni se manda al proveedor sin pasar por `redactSensitiveData`.
- **Máximo 5 mensajes pagos por lección**, contando audios y el recordatorio.
- **Retención de datos:** audios borrados al transcribirlos; transcripciones borradas a los 30 días.
- **La cuenta de Meta tiene que poder migrarse:** identificadores en variables de entorno y plantillas versionadas en el repositorio.

## Decisiones vigentes

- **Stack:** TypeScript, Fastify, Postgres ([ADR 0001](docs/adr/0001-stack-monolito-typescript.md), [ADR 0002](docs/adr/0002-postgres-y-cola-pg-boss.md)).
- **TypeScript 6.0:** `typescript-eslint` todavía no soporta TypeScript 7. Revisar al actualizar.
- **Alcance del MVP:** padrino por email, sin panel; métricas por script; simulador en una página simple; sin staging ([ADR 0006](docs/adr/0006-recortes-del-mvp.md)).
- **Motor y rachas:** máquina de estados pura y racha sin castigo ([ADR 0007](docs/adr/0007-motor-de-lecciones.md)).
- **Tutor:** proveedor simulado por defecto; Claude Haiku 5.5 con `LLM_PROVIDER=anthropic`. Tope de USD 0,01 por persona y por día ([ADR 0008](docs/adr/0008-tutor-guardrails-y-evals.md)).
- **Voz:** proveedores simulados por defecto; `gpt-transcribe` y Azure `es-AR-ElenaNeural` con claves. La intro va siempre en audio; el resto, solo si la persona habló; el cuidado, siempre en texto ([ADR 0009](docs/adr/0009-voz-y-simulador.md)).
- **Canales:** todo mensaje entra por `MessageRouter` (`src/modules/conversation/`), con este orden: BAJA y AYUDA primero, después el alta y por último la lección. Lo usan el simulador y WhatsApp ([ADR 0010](docs/adr/0010-whatsapp-y-alta.md)).
- **Nadie se crea en `users` sin un ACEPTO explícito.** Antes, solo existe el hash del contacto en `pending_signups`. Antes de aceptar, el audio no se transcribe.
- **Las personas se identifican por contacto** (`wa:<BSUID>` o `tel:<teléfono>`, ver `users/contact.ts`), cifrado y con hash.
- **WhatsApp:** cada mensaje se guarda una vez por su id de Meta, cifrado, y se procesa por la cola de pg-boss. Las respuestas se guardan antes de enviarse y el contenido se borra al procesar o enviar.
- **El simulador no tiene login:** solo se registra con `APP_ENV=local`.
- **El audio de la persona nunca se guarda,** y la transcripción tampoco. Solo se guardan los audios que genera Charlá.
- **Dependencias por fase:** pg-boss entra cuando se use por primera vez. React queda afuera del MVP.
- **Metas del piloto:** retención a 14 días como métrica principal, repaso del día 30 como dato complementario. Menos de ARS 500 por usuario por mes para IA. La mensajería se mide aparte y va al VAN.

## Estado

- **Contenido:** las 10 lecciones, los mensajes de cuidado y el texto del consentimiento siguen en borrador.
- Decisiones a revisar en [docs/decisiones-pendientes.md](docs/decisiones-pendientes.md); resumen en [docs/resumen-sesion.md](docs/resumen-sesion.md).
- **Fases 1 a 3:** mergeadas en `main`.
- **Fase 4:** WhatsApp, alta, BAJA y AYUDA, hecha en una sesión autónoma, en revisión. Falta conectar un número real (pasos en la checklist del piloto).
- **Antes del piloto:** [docs/checklist-piloto.md](docs/checklist-piloto.md).

- **Plan de las fases que faltan, con sus criterios:** [docs/plan-de-fases.md](docs/plan-de-fases.md).
- **Dónde quedamos y qué falta decidir:** [docs/continuar-en-otra-pc.md](docs/continuar-en-otra-pc.md).
