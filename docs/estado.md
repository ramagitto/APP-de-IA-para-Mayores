# Estado del proyecto

Tablero único de avance: qué está hecho, qué falta y quién lo hace. **Actualizado el 12/11/2026.**

Se actualiza al final de cada sesión de trabajo y al cerrar cada fase. Cuando algo se termina, se marca `[x]` y se deja una semana antes de borrarlo, para que el equipo lo vea. El detalle de cada tema sigue en su documento: acá van el resumen y el link.

## En una mirada

| Parte                        | Estado                                                                   |
| ---------------------------- | ------------------------------------------------------------------------ |
| Fases 0 a 3                  | ✅ Mergeadas en `main`                                                   |
| Fase 4: WhatsApp, alta, BAJA | ✅ Mergeada, apagada y guardada para después                             |
| Piloto web (código)          | ✅ Mergeado en `main` (PR #6)                                            |
| Piloto web (publicación)     | 🟡 Publicado gratis, con IA y voz simuladas. Falta probarlo en celulares |
| **Rediseño del frontend**    | 🔴 **Nuevo (12/11).** Falta el diagnóstico y el mini plan                |
| Contenidos y textos legales  | 🔴 Todo en borrador                                                      |
| Fase 5: programación         | ⏸️ En pausa: los recordatorios van a mano                                |
| Fases 6 y 8                  | ⏳ Pendientes ([plan](plan-de-fases.md))                                 |
| Fase 7: métricas             | 🟡 En buena parte hecha con el piloto web (`npm run metrics`)            |

## La app publicada

- **Dirección:** <https://charla-piloto.onrender.com>. Cada persona entra con su link `/p/<token>`. La raíz sola no muestra la app.
- **Participante de prueba:** P00. Su link sale con `npm run pilot -- listar`, con `CHARLA_ENV_FILE=.env.produccion`.
- **Qué funciona:** la lección completa escribiendo y con botones, AYUDA y BAJA.
- **Qué no:** el micrófono y el tutor con IA real, porque faltan las claves pagas. La voz de Charlá es la del celular, porque Azure pide tarjeta.
- **No se actualiza sola:** después de mergear a `main`, hay que ir al panel de Render y tocar **Manual Deploy > Deploy latest commit**.
- **Se duerme** a los 15 minutos sin uso y tarda cerca de un minuto en despertar.

El detalle está en el [PR #8](https://github.com/ramagitto/APP-de-IA-para-Mayores/pull/8), que todavía no se mergeó.

## Pendientes

Responsables por rol, nunca por nombre, porque el repositorio es público. "Desarrollo" es la persona que programa.

### 1. Urgente

<<<<<<< HEAD
=======
- [ ] **Anular la clave de API de Render** que se usó para publicar, porque pasó por un chat. Se hace en Render, en **Account Settings > API Keys**. El servicio sigue andando sin ella. _Desarrollo._
>>>>>>> 5cc04256a0766c503469253c660c042c8731e712
- [ ] **Revisar y mergear el [PR #8](https://github.com/ramagitto/APP-de-IA-para-Mayores/pull/8)**, que deja registrado cómo quedó publicada la app. La CI está en verde. _Desarrollo._

### 2. Antes de dar el primer link

**Producto**

- [ ] **Rediseño del frontend.** Se pidió el 12/11 una mejora fuerte de la app web. Pasos: diagnóstico de la app actual, mini plan con horas y criterios, OK del equipo, y recién ahí el código. Archivos: [web-page.ts](../src/modules/web/web-page.ts), [charla.css](../public/charla.css) y [charla.js](../public/charla.js). _Desarrollo._
- [ ] **Probar el link de P00 en un Android y en un iPhone** ([checklist, sección 3](checklist-piloto.md)). Si algo falla, anotar el modelo y la versión. _Pruebas con usuarios._
- [ ] **Decidir si se paga la IA.** Sin Anthropic, el tutor responde por reglas. Sin OpenAI, no hay micrófono. Los pasos, con tope de gasto, están en la [checklist, sección 4](checklist-piloto.md). _Equipo._
- [ ] Si se paga: **correr `npm run evals` con el proveedor real.** Las categorías críticas tienen que dar 100%. _Desarrollo._

**Seguridad de las personas**

- [ ] **Reverificar las líneas de ayuda** de [lineas-de-ayuda.yaml](../content/lineas-de-ayuda.yaml) y actualizar la fecha. _Contenidos._
- [ ] **Revisar los mensajes de cuidado** con una persona con formación en psicología. Después, en [safety-messages.ts](../src/modules/safety/safety-messages.ts), cambiar `CARE_MESSAGES_REVIEW` a `'revisado'`. _Contenidos._
- [ ] **Definir quién atiende AYUDA** y cada cuánto se corre `npm run support -- listar`: por lo menos dos veces por día de lección. _Equipo._

**Contenido** (todo en `revision: borrador`)

- [ ] Aprobar las 10 lecciones de `content/lessons/`. _Contenidos._
- [ ] Aprobar los textos de los recordatorios ([recordatorios-web.yaml](../content/recordatorios-web.yaml)). _Contenidos._

**Legal y privacidad**

- [ ] Revisión legal del consentimiento web ([consentimiento-web.yaml](../content/consentimiento-web.yaml)) según la Ley 25.326. _Equipo, con asesoría legal._
- [ ] Confirmar que los eventos de métricas pueden quedar anónimos después de la BAJA (decisión 60). _Equipo, con asesoría legal._
- [ ] Publicar una política de privacidad completa y sumar su link al consentimiento. _Equipo._

**Operación**

- [ ] Armar la **planilla privada** con código, nombre y teléfono de cada participante. **Nunca** va en el repositorio. _Equipo._
- [ ] Acordar con la cátedra la definición de retención a 14 días (decisión 61). _Equipo._

### 3. Revisar sin urgencia

- [ ] **Decisiones 34 a 72** de [decisiones-pendientes.md](decisiones-pendientes.md), sobre todo la 53, la 60, la 61 y la 62. _Equipo._
- [ ] **Anotar las horas reales** en [horas.md](horas.md): el registro semanal sigue vacío y es un indicador del informe. _Desarrollo y resto del grupo._
- [ ] Completar [feriados.yaml](../content/feriados.yaml) con 2027, si el piloto llega a 2027. _Contenidos._

### 4. Técnico, sin urgencia para el piloto

- [ ] Limpiar las altas sin respuesta (`deleteExpiredPendingSignups`) y los registros viejos de WhatsApp. Era parte de la Fase 5. _Desarrollo._
- [ ] Conectar Render con GitHub para que publique solo al mergear, o dejar escrito que se publica a mano. _Desarrollo._

### 5. Después del piloto web

- [ ] Fase 5 (programación y recordatorios automáticos), Fase 6 (padrino por email) y Fase 8 (preparación), según el [plan de fases](plan-de-fases.md).
- [ ] WhatsApp: [trámite de Meta](tramite-meta.md) y la sección 7 de la [checklist](checklist-piloto.md).

## Dónde está cada cosa

| Necesito...                                  | Documento                                            |
| -------------------------------------------- | ---------------------------------------------------- |
| Retomar en un chat nuevo o en otra PC        | [como-retomar.md](como-retomar.md)                   |
| Reglas, comandos y decisiones vigentes       | [CLAUDE.md](../CLAUDE.md)                            |
| Qué falta, con criterios de aceptación       | [plan-de-fases.md](plan-de-fases.md)                 |
| Publicar, cargar claves y operar el piloto   | [checklist-piloto.md](checklist-piloto.md)           |
| Decisiones tomadas sin el equipo             | [decisiones-pendientes.md](decisiones-pendientes.md) |
| Qué se hizo en la última sesión              | [resumen-sesion.md](resumen-sesion.md)               |
| Horas estimadas y reales                     | [horas.md](horas.md)                                 |
| Por qué se decidió cada cosa de arquitectura | [adr/](adr/)                                         |
