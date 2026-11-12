# Plan de fases

Este es el plan vigente del MVP, con las decisiones ya tomadas. Reemplaza al plan original en todo lo que indican los ADR [0005](adr/0005-whatsapp-inicio-por-usuario-y-curso-cerrado.md) y [0006](adr/0006-recortes-del-mvp.md). Las horas y fechas se siguen en [horas.md](horas.md).

## Cómo se trabaja cada fase

- **Al empezar:** mini plan con objetivo, tareas con horas, archivos, criterios de aceptación y riesgos. Se espera la aprobación antes de escribir código.
- **Al terminar:** código en `main` vía PR, tests pasando, documentación actualizada y una demo reproducible.
- **El resumen de cierre dice:** qué se hizo, cómo probarlo con comandos, decisiones tomadas con link al ADR, deuda técnica, costo actualizado, horas reales contra estimadas y qué sigue. Después se frena hasta recibir el OK.

## Producto en una página

Charlá enseña a personas de 65 años o más a usar la IA para resolver cosas del día a día, con lecciones de unos 3 minutos por WhatsApp, 5 días por semana. Hay voz, rachas y un tutor que corrige cómo pregunta cada persona. Después, la persona repite el pedido en una IA real, como Meta AI, ChatGPT o Gemini.

**Personas de diseño:** Marta, de 72 años, usa WhatsApp y manda audios, pero tiene miedo de romper algo o de que le roben. Pablo, de 44, es su hijo: quiere que sea más independiente y no caiga en estafas. Es quien pagaría.

**Metas del piloto** (30 personas durante 2 semanas, escalable a 100):

| Indicador                          | Meta                                  |
| ---------------------------------- | ------------------------------------- |
| Retención a 14 días                | 60% o más. Es la métrica principal    |
| Repaso del día 30                  | Dato complementario                   |
| Lecciones completadas              | Se mide                               |
| Lecciones iniciadas por el usuario | Se mide. Es la métrica de hábito      |
| Satisfacción                       | Encuesta corta al final de cada nivel |
| Costo de IA                        | Menos de ARS 500 por usuario por mes  |
| Costo de mensajería                | Se mide aparte y va al VAN            |

**Fuera del MVP:** pagos, instituciones (B2B), app nativa, panel web del padrino, panel interno y staging.

## Requisitos que valen para todas las fases

- **Privacidad (Ley 25.326):** datos mínimos, consentimiento explícito, `BAJA` con borrado y nada de datos personales en los logs.
- **Seguridad:** firma de webhooks verificada, secretos en variables de entorno, límites de uso, entradas validadas, defensa contra prompt injection y mínimo privilegio.
- **Guardrails del tutor:** no da consejos médicos, legales ni financieros concretos y deriva al profesional. Nunca pide datos sensibles. Si detecta una posible estafa, alerta con calma y da pasos claros. Si la persona parece angustiada o en riesgo, responde con cuidado y sugiere hablar con su familia o un profesional.
- **Proveedores intercambiables:** interfaces propias para LLM, STT y TTS. Tope de costo por usuario y por día, y fallback si un proveedor falla.
- **Canal desacoplado:** WhatsApp es un adaptador más, junto con el simulador.
- **Zona horaria:** America/Argentina/Buenos_Aires.

## Estado de las fases

| Fase                      | Estado                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| 0. Esqueleto              | Terminada                                                                                          |
| 1 a 3                     | Mergeadas en `main`                                                                                |
| 4. WhatsApp               | Mergeada (PR #5, 11/11) y guardada para después, apagada (`WHATSAPP_PROVIDER=disabled`)            |
| **Piloto web**            | **Hecho** el 12/11/2026, en sesión autónoma. Ver abajo y `docs/resumen-sesion.md`                  |
| **Rediseño del frontend** | **Nuevo (12/11/2026).** Falta el diagnóstico de la app y el mini plan, antes de dar los links      |
| 5. Programación           | **En pausa:** los recordatorios los manda el equipo a mano. La limpieza programada queda pendiente |
| 6 a 8                     | Pendientes. La 7 (métricas) quedó en buena parte hecha con el piloto web                           |

**Cambio de rumbo (12/11/2026):** el piloto no va a ser por WhatsApp Business sino por la web, con un link personal ([ADR 0011](adr/0011-piloto-web.md)). Lo que sigue de este documento se escribió para WhatsApp: vale para cuando se retome.

## Piloto web (36 h)

**Objetivo:** un piloto que se pueda usar ya con 10 a 30 personas mayores, sin Meta y sin costo fijo.

| Tarea                                                                          | Estimado |
| ------------------------------------------------------------------------------ | -------- |
| Participantes, tokens y rutas web con encabezados de seguridad                 | 6 h      |
| App para celular: accesibilidad, micrófono en Android y iPhone, audio, PWA     | 10 h     |
| Consentimiento web y estado de la lección en el servicio de conversación       | 2 h      |
| Comandos: links, estado, baja y recordatorios del día                          | 4 h      |
| Eventos de producto, métricas y CSV                                            | 6 h      |
| Despliegue gratis (Render y Neon), `/ping`, migraciones al arrancar, checklist | 4 h      |
| Tests, prueba en Chrome con vista de celular, ADR y documentación              | 4 h      |
| **Total**                                                                      | **36 h** |

**Criterios de aceptación:**

1. `npm run pilot -- crear 3` muestra 3 links que abren la app. Un link inválido o dado de baja muestra "Este link no funciona".
2. Consentimiento primero: nadie existe en `users` hasta tocar ACEPTO.
3. Se puede hacer una lección completa con botones, texto y voz.
4. AYUDA aparece en `npm run support -- listar` con el código del participante. BAJA borra los datos y el link deja de funcionar.
5. `npm run pilot -- recordatorios` arma un texto por persona con su link, y no incluye a quien ya hizo la lección ni a quien se dio de baja.
6. `npm run metrics` genera CSV sin identificadores, y los indicadores están probados con datos armados a mano.
7. Ni el token ni los textos aparecen en los logs.
8. `npm run check`, los tests de integración y la CI en verde.
9. Funciona en Chrome de Android y en Safari de iPhone, con micrófono. **Probado solo en Chrome con vista de celular y micrófono simulado: falta la prueba en celulares reales** (sección 3 de la [checklist](checklist-piloto.md)).

**Riesgos:** que algún modelo de iPhone no reproduzca el audio sin un toque (mitigado: botón "Escuchar" siempre visible); el minuto de espera del servidor gratuito; que el equipo no sostenga los recordatorios manuales.

## Fase 2: tutor de IA (25 h)

- Capa de abstracción del LLM, detrás de la interfaz `Tutor` de `src/modules/lessons/tutor.ts`.
- Prompt del tutor: corrige cómo preguntó, da un ejemplo mejorado y celebra los avances, con respuestas cortas y cálidas. Usa `practica.foco` y `practica.ejemplo_mejorado` de cada lección.
- Curso cerrado: solo trabaja sobre la lección y redirige cualquier otra pregunta.
- Guardrails y defensa contra prompt injection.
- Control de costos: tope de tokens, caché donde aplique y registro del costo por interacción (`usage_costs`, `conversation_turns`).
- Evals: al menos 30 casos, entre normales, ambiguos, médicos, financieros, intentos de estafa y prompt injection, que se corran con un comando.
- Comparar Claude Haiku 5.5, `gpt-5-nano` y Gemini 2.5 Flash-Lite ([ADR 0003](adr/0003-proveedores-de-ia.md)). Volver a confirmar precios antes de elegir.

**Aceptación:** las evals pasan con un umbral propuesto y justificado, y el costo por lección queda medido.

## Fase 3: simulador y voz (19 h)

- Simulador en una página simple, sin React, que imite una conversación de WhatsApp.
- STT para los audios del usuario con `gpt-transcribe`, porque `gpt-4o-mini-transcribe` se da de baja el 26/2/2027 ([ADR 0009](adr/0009-voz-y-simulador.md)). A probar con audios reales de personas mayores.
- TTS con voz en español de Argentina, como `es-AR-ElenaNeural`. Los audios de cada lección se generan una vez y se reutilizan.
- Definir cuándo una respuesta va en audio y medir la duración real de los guiones.
- Servicio de conversación independiente del canal, que reutiliza la Fase 4.
- La cola con pg-boss pasó a la Fase 4: el simulador puede esperar la respuesta.

**Aceptación:** se puede hacer una lección completa desde el simulador, hablando y escuchando.

## Fase 4: WhatsApp (35 h)

**Viene de la Fase 3:** cola con pg-boss para el webhook; alta con opt-in y consentimiento **antes** de que el servicio de conversación cree a la persona; transacción e idempotencia al guardar el intento y la racha; y decidir si los avisos `info` se mandan siempre, porque cada uno se paga.

Necesita que el [trámite de Meta](tramite-meta.md) esté avanzado, y saber quién es el titular y quién atiende `AYUDA`.

- Cloud API: verificación del webhook, validación de firma, idempotencia, reintentos, y envío y recepción de texto y audio (`inbound_events`, `outbound_messages`).
- Alta con opt-in y consentimiento explícito. Baja con `BAJA`, con borrado de datos. `AYUDA` deriva a una persona.
- Cualquier mensaje en un día de lección dispara la lección. `BAJA` y `AYUDA` tienen prioridad.
- Plantillas para fuera de la ventana de 24 horas. Los textos propuestos están en la checklist.
- Audios como nota de voz en OGG/Opus mono, hasta 512 KB. Probar la transcripción que hace WhatsApp, que podría evitar un mensaje pago.
- Decidir si conviene conservar una constancia mínima de consentimiento y baja, y consultarlo en la revisión legal.
- Confirmar de nuevo las tarifas y los límites de la documentación oficial.

**Aceptación:** con un número de prueba, una persona hace el alta, completa una lección y pide la baja.

**Estado (10/11/2026, sesión autónoma):**

- Hecho y probado con webhooks firmados que imitan la documentación de Meta, más el adaptador falso: alta con consentimiento primero, lección, AYUDA y BAJA con borrado.
- **La prueba con un número real queda para cuando el equipo lo conecte,** con los pasos de la [checklist del piloto](checklist-piloto.md).
- Quedan abiertos tres puntos: la constancia de consentimiento y baja (revisión legal), la transcripción de WhatsApp de las notas de voz (no verificada) y si los avisos `info` se mandan siempre.

## Fase 5: programación y notificaciones (14 h)

**Viene de la Fase 4:**

- programar la limpieza de las altas sin respuesta (`deleteExpiredPendingSignups`, 7 días) y de los registros viejos de `inbound_events` y `outbound_messages`;
- los recordatorios usan `sendTemplate` con las plantillas de `content/plantillas-whatsapp.yaml`.

- A la hora que elige cada persona, si no escribió, sale **un solo recordatorio por día**, solo los días de lección, con reintentos y sin duplicados.
- Si la ventana sigue abierta, va como mensaje común. Si no, como plantilla.
- Sin insistir de más.
- Lección de repaso del día 30.
- Definir cuándo un intento se marca como abandonado.

**Aceptación:** tests de los jobs con el tiempo simulado, sin mensajes duplicados.

## Fase 6: padrino por email (12 h)

- Vinculación con consentimiento del mayor, confirmado por WhatsApp (`sponsors`, `sponsor_links`).
- Avisos y resumen semanal por email, legibles, con letra grande y buen contraste.
- El padrino nunca ve el contenido de las conversaciones, solo el progreso.

**Aceptación:** flujo completo probado.

## Fase 7: métricas por script (8 h)

- Eventos de producto: alta, lección iniciada, lección completada, abandono y baja (`product_events`).
- KPIs por comando: retención a 14 días, repaso del día 30, completitud, racha media, autoinicio, satisfacción y costo por usuario (`survey_responses`).
- Exportación a CSV sin identificadores para el informe. Los gráficos se hacen en Power BI o Looker Studio.

**Aceptación:** los KPIs se calculan bien sobre datos de prueba.

## Fase 8: preparación del piloto (23 h)

- Revisión de seguridad (OWASP Top 10) y de privacidad, con checklist de la Ley 25.326 y la política de retención aplicada.
- Despliegue en producción, backups de la base y monitoreo con alertas básicas.
- Runbook: qué hacer si se cae el webhook, si se pasa el costo o si alguien reporta un problema.
- Prueba de carga liviana para 30 a 100 usuarios.

**Aceptación:** checklist de salida aprobada y piloto listo para arrancar.
