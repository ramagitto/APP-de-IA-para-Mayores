# Cómo retomar el proyecto

Guía para seguir Charlá en un chat nuevo de Claude Code, o desde otra PC. Estado al 10/11/2026.

## 1. Pegá esto en el chat nuevo

```text
Sigo el proyecto Charlá en un chat nuevo. Antes de hacer nada:
1. Leé docs/como-retomar.md, CLAUDE.md, docs/plan-de-fases.md y docs/resumen-sesion.md.
2. Revisá el estado del repo, de los PR abiertos y de la CI con gh.
3. Decime en pocas líneas dónde estamos, qué está pendiente de mi parte y qué propondrías para la Fase 5.
No escribas código ni mergees nada hasta que te dé el OK.
```

`CLAUDE.md` se carga solo en cada chat: ahí están las reglas del proyecto. Este documento agrega el estado y lo que no está en el código.

## 2. Dónde quedamos

| Fase                             | Estado                                        | Dónde                                                                                            |
| -------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 0. Esqueleto                     | Mergeada                                      | `main`                                                                                           |
| 1. Dominio y contenido           | Mergeada                                      | `main` (#2)                                                                                      |
| 2. Tutor de IA y líneas de ayuda | Mergeada                                      | `main` (#3)                                                                                      |
| 3. Simulador y voz               | Mergeada                                      | `main` (#4)                                                                                      |
| 4. WhatsApp, alta, BAJA y AYUDA  | **En revisión**, CI en verde, sin número real | [PR #5](https://github.com/ramagitto/APP-de-IA-para-Mayores/pull/5), rama `feat/fase-4-whatsapp` |
| 5. Programación y notificaciones | **Sigue esta**, espera el OK                  | —                                                                                                |
| 6 a 8                            | Pendientes                                    | [plan-de-fases.md](plan-de-fases.md)                                                             |

Al cierre había 412 tests unitarios y 40 de integración en verde, y las evals aprobadas.

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

## 5. Lo que está pendiente de la persona responsable

1. **Revisar y mergear el PR #5.**
2. **Hacer revisar textos en borrador:**
   - las 10 lecciones, por el rol de contenidos;
   - los mensajes de cuidado, por el equipo y una persona con formación en psicología;
   - el texto del consentimiento, por alguien con formación legal.
3. **Revisar las decisiones 34 a 52.**
4. **Avanzar el [trámite de Meta](tramite-meta.md)** y, después, conectar el número con la [checklist del piloto](checklist-piloto.md).
5. **Cargar claves cuando se decida gastar:** Anthropic (tutor), OpenAI (voz a texto) y Azure (texto a voz). Sin ellas, todo funciona con proveedores simulados.
6. **Anotar las horas reales** en [horas.md](horas.md): la columna "Real" sigue vacía.

## 6. Lo que sigue: Fase 5

El detalle está en [plan-de-fases.md](plan-de-fases.md). En resumen:

- **Recordatorio:** a la hora que eligió cada persona, si no escribió, uno solo por día y solo en días de lección. Va como mensaje común si la ventana de 24 horas está abierta, y si no, con la plantilla `charla_recordatorio`.
- **Repaso del día 30,** con la plantilla `charla_repaso`.
- **Abandono:** definir cuándo un intento se marca como abandonado.
- **Viene de la Fase 4:** borrar las altas sin respuesta después de 7 días (`deleteExpiredPendingSignups`) y limpiar los registros viejos de `inbound_events` y `outbound_messages`.
- **Aceptación:** tests de los trabajos programados con el tiempo simulado, sin mensajes duplicados.

Ya existen: la cola pg-boss (`src/modules/whatsapp/job-queue.ts`), `sendTemplate` en el adaptador de WhatsApp, las plantillas validadas y el calendario de días de lección.

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

Si el PR #5 sigue abierto, `git switch feat/fase-4-whatsapp`. Después, `npm run check` y `npm run test:integration`, con Docker abierto.

## 8. Cosas que conviene saber

- **Abrí Docker Desktop antes de trabajar.** Si se reinicia, el contenedor de Postgres queda apagado y los tests de integración fallan con "No test files found". Se levanta con `docker compose up -d --wait db`.
- **Procesos que quedan vivos en Windows:** detener una tarea de Claude Code no cierra el proceso de Node que lanzó. Antes de seguir, revisá con `netstat -ano | findstr :3000` y cerrá ese proceso. Un servidor olvidado puede quedarse con los trabajos de la cola.
- **El permiso `workflow` de GitHub** es necesario para pushear cambios a la CI. Si falta, `gh auth refresh -h github.com -s workflow`.
- **Datos de prueba:** los tests de integración dejan datos en la base local. Se borran con `docker compose down -v`.
- **Qué no está en el repo:** el `.env`, la base local, los audios generados (`var/`), el informe de mercado en PDF y las conversaciones anteriores con Claude. Lo importante está en los documentos.

## 9. Documentos clave

| Documento                                            | Para qué                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| [CLAUDE.md](../CLAUDE.md)                            | Reglas, comandos y decisiones vigentes                         |
| [plan-de-fases.md](plan-de-fases.md)                 | Qué falta, con criterios de aceptación                         |
| [resumen-sesion.md](resumen-sesion.md)               | Qué se hizo en la última sesión                                |
| [decisiones-pendientes.md](decisiones-pendientes.md) | Decisiones tomadas sin el equipo, con cómo revertirlas         |
| [checklist-piloto.md](checklist-piloto.md)           | Todo lo que falta antes del piloto, incluido conectar WhatsApp |
| [adr/](adr/)                                         | Decisiones de arquitectura, de la 0001 a la 0010               |
| [whatsapp-y-costos.md](whatsapp-y-costos.md)         | Tarifas y costo por persona                                    |
| [horas.md](horas.md)                                 | Horas estimadas y reales                                       |
