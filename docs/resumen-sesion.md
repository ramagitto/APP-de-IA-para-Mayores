# Resumen de la sesión autónoma del 10/11/2026 (segunda parte)

La primera parte de la sesión (Fase 2) quedó en el historial de git de este archivo.

## En una línea

**Las líneas de ayuda están sumadas y la Fase 3 está hecha y en revisión, con la CI en verde.** El rebase del #3 sobre `main` sigue pendiente, porque el #2 todavía no está mergeado. No mergeé nada, no gasté plata, no creé cuentas y no toqué secretos ni permisos.

## Pull requests

| PR                                                               | Fase                             | Base                  | CI       | Estado                                |
| ---------------------------------------------------------------- | -------------------------------- | --------------------- | -------- | ------------------------------------- |
| [#2](https://github.com/ramagitto/APP-de-IA-para-Mayores/pull/2) | 1. Dominio y contenido           | `main`                | En verde | Abierto, para que lo mergees vos      |
| [#3](https://github.com/ramagitto/APP-de-IA-para-Mayores/pull/3) | 2. Tutor de IA y líneas de ayuda | `feat/fase-1-dominio` | En verde | Abierto. Falta el rebase sobre `main` |
| [#4](https://github.com/ramagitto/APP-de-IA-para-Mayores/pull/4) | 3. Simulador y voz               | `feat/fase-2-tutor`   | En verde | Abierto, espera tu OK                 |

**Orden para mergear:** #2, después #3 y después #4.

## Lo que pediste sobre las líneas de ayuda

Hecho, en el PR #3:

- Los mensajes de cuidado suman el **135** (gratis, CABA y GBA) y el **(011) 5275-1135** (todo el país), del Centro de Asistencia al Suicida.
- Si no atienden en el 135, derivan al **0800-999-0091**, la línea de salud mental del Ministerio de Salud.
- Para emergencias, **911 o 107**. Ojo: el 107 depende de cada jurisdicción (es el SAME en CABA y el servicio local en varias provincias).
- **Sin horarios** en los mensajes.
- Los números viven en [`content/lineas-de-ayuda.yaml`](../content/lineas-de-ayuda.yaml), con la fuente y la fecha de verificación de cada uno. `npm run lessons:check` avisa si pasaron más de 90 días.
- Nueva [checklist del piloto](checklist-piloto.md), que incluye "reverificar las líneas de ayuda".
- Los mensajes de cuidado quedaron marcados como **borrador** en el código (`CARE_MESSAGES_REVIEW`) y en [decisiones-pendientes.md](decisiones-pendientes.md). `npm run lessons:check` también lo avisa.

## Qué quedó hecho en la Fase 3

- **Voz:** interfaces de voz a texto y texto a voz. Por defecto son simuladas; los adaptadores reales son OpenAI (`gpt-transcribe`) y Azure (`es-AR-ElenaNeural`, en nota de voz OGG/Opus). Hay caché de audios y el costo de voz se registra por persona y por día.
- **Servicio de conversación independiente del canal:** transcribe, cuida a la persona, sigue o arranca la lección (una por día de lección), guarda el estado y agrega audio a las respuestas. WhatsApp lo va a reutilizar en la Fase 4.
- **Simulador web** en `/simulador`, solo con `APP_ENV=local`: se puede escribir o hablar, pasar al día siguiente y empezar de nuevo.
- **Seguridad:** un manejador de errores general, que nunca muestra detalles internos.
- **Documentación:** [ADR 0009](adr/0009-voz-y-simulador.md), decisiones 19 a 33, `CHANGELOG`, horas, plan de fases, `README` y `CLAUDE.md`.

## Verificación

| Control                                           | Resultado                                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Tests unitarios                                   | 358 de 358                                                                               |
| Tests de integración (Postgres)                   | 24 de 24                                                                                 |
| Evals con el proveedor simulado                   | Aprobadas                                                                                |
| Lección completa por HTTP contra el servidor real | Funcionó: arranque, audio, cierre, racha, una por día, día siguiente, cuidado y reinicio |
| Micrófono y voz en un navegador real              | **Sin verificar:** desde acá no puedo usar un navegador                                  |
| CI de los PR #3 y #4                              | En verde                                                                                 |

## Hallazgo importante

**OpenAI da de baja `gpt-4o-mini-transcribe` el 26/2/2027**, antes del piloto. Es el modelo de voz a texto que elegimos en el ADR 0003. Cambié a `gpt-transcribe`, que es el reemplazo que recomienda OpenAI: el proveedor es el mismo, así que el stack no cambia. Cuesta unos USD 0,0045 por minuto, un 50% más, pero el monto sigue siendo muy chico.

## Decisiones tomadas sin vos

Están las 15 nuevas (de la 19 a la 33) en [decisiones-pendientes.md](decisiones-pendientes.md). Las que más importan:

- **26. El servicio de conversación crea a la persona con su primer mensaje, sin consentimiento.** Alcanza para el simulador, pero en la Fase 4 el alta con opt-in tiene que ir primero.
- **22. Con los proveedores simulados, el simulador usa la voz del navegador**, que en Chrome manda el audio a Google. Solo sirve para demos locales, y la página lo avisa.
- **23. Cuándo va audio:** la intro siempre; el resto, solo si la persona habló; el cuidado, siempre en texto.
- **20. La cola con pg-boss pasó a la Fase 4.**

## Qué quedó bloqueado

| Qué                                 | Por qué                              | Qué hace falta                                                                           |
| ----------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------- |
| Rebase del #3 sobre `main`          | El #2 no está mergeado               | Mergear el #2. Después, el rebase son estos tres comandos, y lo hago yo cuando me avises |
| Probar la voz real                  | No hay claves de OpenAI ni de Azure  | Crear las cuentas y cargar las claves en el `.env`                                       |
| Probar el tutor con un modelo real  | No hay clave de Anthropic            | Lo mismo                                                                                 |
| Probar el micrófono en un navegador | No puedo usar un navegador desde acá | Abrir el simulador en Chrome                                                             |

Los comandos del rebase, para cuando el #2 esté mergeado:

```bash
git fetch origin
git switch feat/fase-2-tutor
git rebase --onto origin/main origin/feat/fase-1-dominio
git push --force-with-lease
```

Después, si GitHub no lo hace solo, hay que cambiar la base del PR #3 a `main`.

## Qué necesito que revises

1. **Mergear el #2,** para hacer el rebase del #3.
2. **Probar el simulador en Chrome:** `npm run dev` y abrir <http://localhost:3000/simulador>. Hacé una lección hablando y escuchando.
3. **Las decisiones 19 a 33** de [decisiones-pendientes.md](decisiones-pendientes.md), en especial la 22, la 23 y la 26.
4. **Los PR #3 y #4.**

Después de esto, la Fase 4 (WhatsApp) espera tu OK. Necesita el trámite de Meta avanzado y saber quién es el titular y quién atiende `AYUDA`.
