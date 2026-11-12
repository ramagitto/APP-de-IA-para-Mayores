# Resumen de la sesión autónoma del 12/11/2026: piloto web

Las sesiones anteriores (Fases 2 a 4) quedaron en el historial de git de este archivo.

## En una línea

**El piloto web está hecho y en `main`** ([PR #6](https://github.com/ramagitto/APP-de-IA-para-Mayores/pull/6), mergeado con la CI en verde). Falta que lo publiques, cargues las claves y lo pruebes en un Android y un iPhone. No creé cuentas, no cargué claves y no gasté nada.

## Qué pediste y qué quedó

| Pedido                                                  | Estado                                                                                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Dejar la Fase 4 como está y pausar la Fase 5            | Hecho. Ya estaba en `main` (PR #5, mergeado el 11/11) y queda apagado                                                                |
| Web app para celular, pensada para mayores              | Hecho: letra grande con tres tamaños, alto contraste, botones grandes, botón para hablar, botones por paso y PWA                     |
| Link personal con token, sin usuario ni contraseña      | Hecho. `npm run pilot -- crear 10`                                                                                                   |
| Consentimiento primero, BAJA y AYUDA como en WhatsApp   | Hecho, con el mismo `MessageRouter` y un texto de consentimiento propio para la web                                                  |
| Texto del día para los recordatorios, listo para copiar | Hecho. `npm run pilot -- recordatorios`                                                                                              |
| Métricas exportables a CSV                              | Hecho. `npm run metrics`                                                                                                             |
| Chrome de Android y Safari de iPhone, con micrófono     | Hecho en el código y probado en Chrome con vista de celular y micrófono simulado. **Falta la prueba en celulares reales**            |
| Opción de despliegue más barata, sin crear cuentas      | Gratis: Render más Neon ([ADR 0012](adr/0012-hosting-gratis-render-y-neon.md)). Pasos exactos en la [checklist](checklist-piloto.md) |
| Pasos para publicar y cargar claves con tope de gasto   | En la [checklist del piloto](checklist-piloto.md), secciones 2 a 4                                                                   |

## Lo que tenés que saber primero

1. **La Fase 4 ya estaba en `main`.** Otra persona del equipo mergeó el PR #5 el 11/11. El piloto web reutiliza su alta con consentimiento, BAJA y AYUDA, así que la rama nueva salió de ahí, y el PR #6 sumó solo el piloto. WhatsApp queda apagado (`WHATSAPP_PROVIDER=disabled`). Al principio lo describí como si el #6 trajera la Fase 4: no fue así, y lo corregí en estos documentos.
2. **Sin clave de OpenAI no hay micrófono en producción.** El reconocimiento de voz del navegador puede mandar el audio a Google o Apple, así que en producción no se usa. Sin la clave, la app funciona solo con texto (decisión 62).
3. **El servidor gratuito se duerme** a los 15 minutos sin uso y tarda cerca de un minuto en despertar. `npm run pilot -- recordatorios` lo despierta antes de que mandes los mensajes, y la app avisa "Charlá se está despertando". Si molesta, Render pago lo resuelve.
4. **El sistema no guarda nombres ni teléfonos.** Cada persona es un código (P01, P02...). Hace falta una planilla privada del equipo con código, nombre y teléfono.

## Cómo probarlo en tu PC

```bash
npm run dev
npm run pilot -- crear 1        # en otra terminal; abrí el link en Chrome (F12, vista de celular)
npm run pilot -- recordatorios
npm run support -- listar
npm run metrics
```

## Cómo funciona, en simple

- **Cada persona tiene un link** `https://<dominio>/p/<token>`. El token es un número al azar imposible de adivinar. Se guarda su hash, para reconocerlo, y una copia cifrada, para volver a armar el link de cada recordatorio.
- **La app** es una página simple, sin frameworks. Muestra, en cada paso, solo los botones que corresponden: Empezar, Acepto, Empezar la lección de hoy, el micrófono, Sí lo hice. El historial queda en el celular de la persona, no en el servidor.
- **Todo pasa por el mismo núcleo** que WhatsApp: motor de lecciones, tutor, capas de seguridad y mensajes de cuidado.
- **Las métricas** salen de una tabla de eventos que nunca guarda textos. Con la BAJA, los datos se borran y los eventos quedan sin poder relacionarse con nadie, así la retención cuenta también a quien se fue.

## Verificación

| Control                                                   | Resultado                                                                                    |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Tests unitarios                                           | 441 de 441                                                                                   |
| Tests de integración (Postgres)                           | 45 de 45                                                                                     |
| Evals con el proveedor simulado                           | Aprobadas                                                                                    |
| De punta a punta contra el servidor                       | Alta, lección, AYUDA con código en `support`, BAJA (el link pasa a 404), recordatorios y CSV |
| Arranque como en Render (`npm run start:production`)      | Migraciones aplicadas, `/ping` y `/health` en 200, sin simulador                             |
| Chrome sin ventana, vista de celular y micrófono simulado | Recorrido completo, grabación incluida, sin errores en la página                             |
| Logs                                                      | Ningún token ni texto: el link aparece como `/p/:token`                                      |
| CI del PR #6                                              | En verde                                                                                     |
| Android y iPhone reales                                   | **Sin probar.** Sección 3 de la checklist                                                    |

## Problemas encontrados y resueltos

- **Safari y el audio:** Safari no reproduce audio si el servidor no lo entrega por partes. Lo agregué, con tests.
- **iPhone y la reproducción automática:** el iPhone no deja sonar un audio que llega después de esperar al servidor. El primer toque destraba el reproductor, y siempre queda el botón "Escuchar".
- **La base gratis se quedaba despierta:** si el chequeo de Render usaba `/health`, Neon no se dormía nunca y se pasaba de sus 100 horas. Agregué `/ping`, que no toca la base.
- **Variables vacías:** los paneles de hosting las guardan vacías, y eso rompía el arranque. Ahora cuentan como no definidas.
- **Tope de OpenAI:** si la transcripción fallaba, la persona veía un error. Ahora Charlá le pide que lo repita o lo escriba.

## Decisiones tomadas sin vos

Las 20 nuevas (de la 53 a la 72) están en [decisiones-pendientes.md](decisiones-pendientes.md), con por qué y cómo se revierten. Las de importancia alta:

- **54 y 55.** Link con token; sin nombres ni teléfonos en el sistema.
- **56.** El consentimiento web está en borrador: lo escribí yo.
- **60.** Los eventos de métricas quedan, anónimos, después de la BAJA. Hay que confirmarlo en la revisión legal.
- **61.** Retención a 14 días = iniciar una lección el día 14 o después. Conviene acordarlo con la cátedra.
- **62.** Sin voz del navegador en producción.
- **67.** Hosting gratis en Render y Neon.

## Horas

Estimé el piloto web en **36 h** (43 con margen), con detalle en [horas.md](horas.md). Sumadas al plan, el total sube a 196 h. Si se descuentan la Fase 5, en pausa, y la Fase 7, que quedó en buena parte hecha, queda en unas 174 h, dentro de las 197 disponibles. Tu parte (publicar, cargar claves y probar en dos celulares) son unas 3 a 5 h.

## Qué necesito de vos

1. **Publicar la app** con la [checklist](checklist-piloto.md), secciones 2 a 4.
2. **Probar en un Android y un iPhone** (sección 3) y avisarme si algo falla, con el modelo y la versión.
3. **Revisar las decisiones 53 a 72**, sobre todo la 60 y la 61.
4. **Hacer revisar** el consentimiento web, los recordatorios, las lecciones y los mensajes de cuidado.

Freno acá, como pediste.
