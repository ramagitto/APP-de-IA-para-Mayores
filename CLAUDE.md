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
- **Máximo 5 mensajes pagos por lección**, contando audios y el recordatorio.
- **Retención de datos:** audios borrados al transcribirlos; transcripciones borradas a los 30 días.
- **La cuenta de Meta tiene que poder migrarse:** identificadores en variables de entorno y plantillas versionadas en el repositorio.

## Decisiones vigentes

- **Stack:** TypeScript, Fastify, Postgres ([ADR 0001](docs/adr/0001-stack-monolito-typescript.md), [ADR 0002](docs/adr/0002-postgres-y-cola-pg-boss.md)).
- **TypeScript 6.0:** `typescript-eslint` todavía no soporta TypeScript 7. Revisar al actualizar.
- **Alcance del MVP:** padrino por email, sin panel; métricas por script; simulador en una página simple; sin staging ([ADR 0006](docs/adr/0006-recortes-del-mvp.md)).
- **Motor y rachas:** máquina de estados pura y racha sin castigo ([ADR 0007](docs/adr/0007-motor-de-lecciones.md)).
- **Dependencias por fase:** pg-boss entra cuando se use por primera vez. React queda afuera del MVP.
- **Metas del piloto:** retención a 14 días como métrica principal, repaso del día 30 como dato complementario. Menos de ARS 500 por usuario por mes para IA. La mensajería se mide aparte y va al VAN.

## Estado

Fase 1: dominio y contenido, en revisión. Las 10 lecciones están en borrador, a la espera del rol de contenidos.
