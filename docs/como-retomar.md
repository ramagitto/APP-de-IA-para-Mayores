# Cómo retomar el proyecto

Guía para seguir Charlá en un chat nuevo de Claude Code, o desde otra PC. Estado al 12/11/2026.

## 1. Pegá esto en el chat nuevo

```text
Sigo el proyecto Charlá en un chat nuevo. Antes de hacer nada:
1. Leé docs/como-retomar.md, CLAUDE.md, docs/estado.md, docs/plan-de-fases.md y docs/resumen-sesion.md.
2. Revisá el estado del repo, de los PR abiertos y de la CI con gh.
3. Decime en pocas líneas dónde estamos y qué está pendiente de mi parte para el piloto web (sale de docs/estado.md).
No escribas código ni mergees nada hasta que te dé el OK.
```

`CLAUDE.md` se carga solo en cada chat: ahí están las reglas del proyecto. Este documento agrega cómo trabajamos y lo que no está en el código. **La lista de pendientes vive en [estado.md](estado.md).**

## 2. Dónde quedamos

**Cambio de rumbo (12/11/2026):** el piloto va por la web, con un link personal, y no por WhatsApp Business ([ADR 0011](adr/0011-piloto-web.md)).

| Parte                            | Estado                                                                                   | Dónde                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 0 a 3                            | Mergeadas                                                                                | `main`                                                                                                     |
| 4. WhatsApp, alta, BAJA y AYUDA  | Hecha y guardada para después, apagada                                                   | `main` (PR #5, mergeado el 11/11)                                                                          |
| **Piloto web**                   | **Hecho y publicado** gratis, con IA y voz simuladas. Falta probarlo en celulares reales | <https://charla-piloto.onrender.com> y [PR #8](https://github.com/ramagitto/APP-de-IA-para-Mayores/pull/8) |
| **Rediseño del frontend**        | **Nuevo (12/11).** Falta el diagnóstico y el mini plan                                   | [estado.md](estado.md)                                                                                     |
| 5. Programación y notificaciones | En pausa                                                                                 | —                                                                                                          |
| 6 a 8                            | Pendientes                                                                               | [plan-de-fases.md](plan-de-fases.md)                                                                       |

El detalle de la última sesión está en [resumen-sesion.md](resumen-sesion.md).

## 3. Cómo trabajamos (acuerdos con el equipo)

- **Por fases.** Antes de cada una: mini plan con tareas, horas y criterios de aceptación. Al terminarla: resumen y frenar hasta el OK. Las reglas completas están en `CLAUDE.md`.
- **Una sola persona desarrolla,** unas 10 horas por semana. El resto del grupo toma contenidos, pruebas con usuarios y el trámite de Meta.
- **Código en `main` solo vía PR,** con commits chicos en Conventional Commits y la CI en verde.

**Modo autónomo** (cuando se pide explícitamente):

- trabajar sin preguntar, tomar la decisión más razonable y simple, y anotarla en [decisiones-pendientes.md](decisiones-pendientes.md) con por qué y cómo se revierte; las importantes, también como ADR;
- una rama por fase, y al cerrarla, PR con la CI verificada;
- al terminar, actualizar [resumen-sesion.md](resumen-sesion.md) y frenar.

**Prohibido sin un OK explícito**, aun en modo autónomo:

- mergear PR o pushear directo a `main`. La autorización para mergear #2, #3 y #4 fue **solo para esos tres**;
- gastar plata, contratar servicios, crear cuentas o conectar un número real;
- agregar, pedir o tocar secretos, claves o permisos de GitHub;
- borrar ramas, historial o archivos fuera del repo;
- cambiar el stack o los recortes aprobados ([ADR 0006](adr/0006-recortes-del-mvp.md));
- poner nombres o teléfonos de personas en el repo. Las líneas de ayuda públicas sí están permitidas.

## 4. Decisiones ya tomadas por el equipo

- **Stack:** TypeScript, Fastify, Postgres y pg-boss ([ADR 0001](adr/0001-stack-monolito-typescript.md), [ADR 0002](adr/0002-postgres-y-cola-pg-boss.md)).
- **Recortes:** padrino por email sin panel, métricas por script, simulador simple y sin staging.
- **Ritmo:** 5 lecciones por semana, como máximo 5 mensajes pagos por lección. La lección arranca cuando la persona escribe; si no escribe, un solo recordatorio a la hora elegida.
- **Metas:** retención a 14 días como métrica principal. IA por debajo de ARS 500 por persona por mes; la mensajería se mide aparte y va al VAN.
- **Mensajes de cuidado:** no cuentan para el tope de 5. Mencionan el 135 y el (011) 5275-1135, derivan al 0800-999-0091 si no atienden en el 135, y el 911 o el 107 para emergencias, sin horarios.
- **Consentimiento primero (decisión 26):** nadie se crea sin un ACEPTO explícito.
- **Decisiones 1 a 33:** aprobadas como están. **De la 34 a la 52** (Fase 4): pendientes de revisión.

## 5. Lo que está pendiente

Todo lo pendiente, con prioridad y responsable, está en **[estado.md](estado.md)**. Lo más urgente al 12/11/2026:

1. Anular la clave de API de Render que pasó por el chat.
2. Revisar y mergear el PR #8.
3. Diagnóstico y mini plan del rediseño del frontend.
4. Probar el link de P00 en un Android y un iPhone.

## 6. Lo que sigue

- Correr el piloto: recordatorios con `npm run pilot -- recordatorios` y métricas con `npm run metrics`.
- **Pendiente técnico, sin urgencia para el piloto:** limpiar las altas sin respuesta (`deleteExpiredPendingSignups`) y los registros viejos de WhatsApp. Era parte de la Fase 5.
- **Cuando se retome WhatsApp:** Fase 5 tal como está en el [plan](plan-de-fases.md), el [trámite de Meta](tramite-meta.md) y la sección 7 de la checklist.

## 7. Preparar la PC

Solo hace falta si cambiás de computadora. En la PC de siempre ya está todo instalado.

```powershell
winget install -e --id OpenJS.NodeJS.LTS
winget install -e --id Git.Git
winget install -e --id GitHub.cli
winget install -e --id Docker.DockerDesktop
```

En una terminal **como administrador**, `wsl --install --no-distribution`. Después, reiniciar y abrir Docker Desktop.

```bash
gh auth login -s workflow
git clone https://github.com/ramagitto/APP-de-IA-para-Mayores.git
cd APP-de-IA-para-Mayores
npm install
npm run dev
```

Después, `npm run check` y `npm run test:integration`, con Docker abierto.

## 8. Cosas que conviene saber

- **Abrí Docker Desktop antes de trabajar.** Si se reinicia, el contenedor de Postgres queda apagado y los tests de integración fallan con "No test files found". Se levanta con `docker compose up -d --wait db`.
- **Procesos que quedan vivos en Windows:** detener una tarea de Claude Code no cierra el proceso de Node que lanzó. Antes de seguir, revisá con `netstat -ano | findstr :3000` y cerrá ese proceso. Un servidor olvidado puede quedarse con los trabajos de la cola.
- **El permiso `workflow` de GitHub** es necesario para pushear cambios a la CI. Si falta, `gh auth refresh -h github.com -s workflow`.
- **Datos de prueba:** los tests de integración dejan datos en la base local. Se borran con `docker compose down -v`.
- **Qué no está en el repo:** el `.env`, la base local, los audios generados (`var/`), el informe de mercado en PDF y las conversaciones anteriores con Claude. Lo importante está en los documentos.

## 9. Documentos clave

| Documento                                            | Para qué                                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------------- |
| [estado.md](estado.md)                               | **Tablero de avance: qué está hecho y qué falta**                           |
| [CLAUDE.md](../CLAUDE.md)                            | Reglas, comandos y decisiones vigentes                                      |
| [plan-de-fases.md](plan-de-fases.md)                 | Qué falta, con criterios de aceptación                                      |
| [resumen-sesion.md](resumen-sesion.md)               | Qué se hizo en la última sesión                                             |
| [decisiones-pendientes.md](decisiones-pendientes.md) | Decisiones tomadas sin el equipo, con cómo revertirlas                      |
| [checklist-piloto.md](checklist-piloto.md)           | Publicar la app, cargar claves, operar el piloto (y WhatsApp, para después) |
| [adr/](adr/)                                         | Decisiones de arquitectura, de la 0001 a la 0012                            |
| [whatsapp-y-costos.md](whatsapp-y-costos.md)         | Tarifas y costo por persona                                                 |
| [horas.md](horas.md)                                 | Horas estimadas y reales                                                    |
