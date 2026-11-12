# Historial de cambios

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Se actualiza al cerrar cada fase.

## [Sin publicar]

### Rediseño del frontend

De chat a curso ([ADR 0013](docs/adr/0013-rediseno-del-frontend.md)), a partir del [diagnóstico](docs/diagnostico-frontend.md).

#### Cambiado

- Una pantalla por momento: bienvenida, permiso, inicio con la lección del día y el avance, lección, festejo al terminar y despedida.
- Colores, logo e ícono de la presentación. Letra Atkinson Hyperlegible y títulos en Source Serif 4, servidas desde el propio servidor. Íconos SVG en lugar de emojis. Modo oscuro más sobrio.
- Una sola acción principal por paso. Los mensajes nuevos se ven desde su primera línea. Menú como hoja que sube desde abajo, con selector de tamaño de letra.
- Textos del alta para la web (`web-v2-borrador`): nombran los botones reales y no las palabras de WhatsApp.
- El estado de la web suma el avance del curso, el número de lección y el texto del permiso.

#### Corregido

- Después de publicar una versión nueva, el navegador podía mezclar la página nueva con el estilo y el script viejos que tenía guardados, y la app quedaba trabada en "Abriendo Charlá…". Ahora cada archivo se pide con una versión que cambia con su contenido.

### Piloto web

Cambio de rumbo: el piloto va por la web, con un link personal, en lugar de WhatsApp Business ([ADR 0011](docs/adr/0011-piloto-web.md)). Hecho en una sesión autónoma; las decisiones tomadas sin el equipo están en `docs/decisiones-pendientes.md` (números 53 a 72).

#### Agregado

- App web para celular en `/p/<token>`: letra grande con tres tamaños, alto contraste, botones grandes, botón para hablar, botones para cada paso y menú con ayuda, baja y cómo dejarla en la pantalla de inicio. Funciona como PWA, con un manifiesto por persona.
- Micrófono para Chrome de Android y Safari de iPhone: graba en WebM/Opus o MP4/AAC, destraba el audio del iPhone con el primer toque y sirve el audio por partes, como lo pide Safari.
- Link personal con un token de 256 bits, guardado con hash y cifrado. Sin nombres ni teléfonos: cada persona es un código (P01, P02...).
- Consentimiento web propio (`content/consentimiento-web.yaml`), con BAJA y AYUDA por el mismo `MessageRouter` que WhatsApp.
- `npm run pilot`: crear links, listar participantes, recordatorios del día listos para copiar, cambiar un link y dar de baja.
- `npm run metrics`: retención a 14 días, segunda semana, día 30, completitud, autoinicio, racha y costo, en tres CSV sin identificadores.
- Tabla `product_events`, que queda anónima después de la BAJA, y tabla `web_participants`.
- Despliegue gratis: `render.yaml` para Render, base en Neon, `npm run start:production` y `/ping`. Pasos en la checklist del piloto.
- Audio MP3 de Azure para la web (`TTS_AUDIO_FORMAT`), `PUBLIC_BASE_URL` y `CHARLA_ENV_FILE` para correr los comandos contra producción.
- ADR 0011 y 0012.

#### Cambiado

- `npm run support` muestra el código del participante web y no intenta responderle por WhatsApp.
- Si falla la transcripción, Charlá pide repetir o escribir, en lugar de dar un error.
- Una variable de entorno vacía cuenta como no definida.
- Los logs reemplazan el token del link por `/p/:token`.
- La Fase 5 queda en pausa; la checklist del piloto pasa a ser la del piloto web, con WhatsApp al final.

### Fase 4: WhatsApp, alta, BAJA y AYUDA

Hecha en una sesión autónoma. Las decisiones tomadas sin el equipo están en `docs/decisiones-pendientes.md` (números 34 a 52).

#### Agregado

- Alta con consentimiento primero: nadie se crea sin un ACEPTO explícito. Antes, solo se guarda el hash del contacto, y se borra si no acepta.
- BAJA, que borra todos los datos de la persona, y AYUDA, que abre un pedido para una persona del equipo. Los mensajes de cuidado también abren uno.
- `npm run support` para listar, responder y cerrar pedidos desde el número de Charlá.
- Webhook de WhatsApp con verificación, firma HMAC-SHA256, idempotencia por id de mensaje y cola con pg-boss.
- Adaptador de la Cloud API: texto, notas de voz (descarga y envío), plantillas y respuesta por id de WhatsApp o teléfono. Sin probar con un número real.
- Respuestas guardadas antes de enviarse, para reintentar sin duplicar, y contenido cifrado que se borra al procesar o enviar.
- Límite de mensajes por persona por minuto.
- Plantillas versionadas en `content/plantillas-whatsapp.yaml`, validadas con las reglas de Meta, y su documento para enviarlas a aprobación.
- Pasos exactos para conectar el número, en la checklist del piloto.
- `npm run whatsapp:simulate` para probar el webhook local con mensajes firmados.
- Tablas `pending_signups`, `support_requests`, `inbound_events` y `outbound_messages`.
- ADR 0010.

#### Cambiado

- Las personas se identifican por contacto: el id por empresa de WhatsApp o el teléfono.
- El simulador pasa por el mismo alta con consentimiento.
- Los logs ya no guardan la query de las URL.

### Fase 3: simulador y voz

Hecha en una sesión autónoma. Las decisiones tomadas sin el equipo están en `docs/decisiones-pendientes.md`.

#### Agregado

- Interfaces de voz a texto y texto a voz, con proveedores simulados (por defecto) y adaptadores de OpenAI (`gpt-transcribe`) y Azure (`es-AR-ElenaNeural`, nota de voz OGG/Opus), sin probar contra las APIs reales.
- Caché de los audios que genera Charlá, y costo de voz registrado por persona y por día.
- Servicio de conversación independiente del canal: transcribe, cuida, sigue o arranca la lección, guarda el estado y agrega audio a las respuestas.
- Simulador web en `/simulador`, solo con `APP_ENV=local`: texto o voz, pasar al día siguiente y empezar de nuevo.
- Manejador de errores general que no muestra detalles internos.
- ADR 0009.

#### Cambiado

- Voz a texto con `gpt-transcribe`, porque `gpt-4o-mini-transcribe` se da de baja el 26/2/2027.
- La cola con pg-boss pasa a la Fase 4.

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
