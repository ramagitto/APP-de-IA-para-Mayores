# WhatsApp: reglas, tarifas y costos

Este documento resume lo que hay que saber de la WhatsApp Business Platform y da los números para el VAN. **Las tarifas y las reglas de Meta cambian:** revisalas antes de usar estos datos en una decisión.

## Tarifas para Argentina

Consultadas el 30/10/2026 en la [calculadora oficial de Meta](https://whatsappbusiness.com/products/platform-pricing/#rates). Meta cobra por mensaje entregado, y puede cambiar las tarifas el primer día de cada trimestre.

| Categoría                                  | ARS por mensaje | USD por mensaje |
| ------------------------------------------ | --------------- | --------------- |
| Marketing                                  | 89,562          | 0,0618          |
| Utility y autenticación                    | 37,6798         | 0,026           |
| Servicio (respuestas dentro de la ventana) | 37,6798         | 0,026           |

- Recibir mensajes del usuario es gratis.
- Cada número tiene [1.000 mensajes de servicio gratis por mes](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing). Se cobran desde el 1/10/2026; antes eran gratis.
- Sin medio de pago, no se entrega nada después del mensaje 1.000.
- Los descuentos por volumen no alcanzan a los mensajes de servicio, y en utility arrancan después de 100.000 mensajes por mes.

## Reglas principales

| Tema            | Qué implica                                                                                                                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ventana de 24 h | Se abre o se renueva con cada mensaje del usuario. Dentro de ella se puede escribir libremente; fuera, solo con plantillas                                                                                                 |
| Plantillas      | Una plantilla educativa o de recordatorio [probablemente sea marketing](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization.md)                                    |
| Opt-in          | [Debe nombrar a Charlá y aclarar qué va a recibir](https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in.md)                                                                            |
| Límite de envío | [250 usuarios únicos cada 24 h](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits) en cuentas nuevas. Alcanza para 100 usuarios                                                   |
| Verificación    | Sirve para subir el límite y no hace falta para arrancar. Sí hace falta para migrar el número (ver abajo)                                                                                                                  |
| Número          | [Propio, con código de área y fuera de la app de WhatsApp](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers.md)                                              |
| Audios          | [Nota de voz en OGG/Opus mono](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/audio-messages.md), hasta 512 KB para que muestre el botón de play                                       |
| Salida a humano | La [política de WhatsApp](https://whatsappbusiness.com/es-la/policy/) exige una vía clara. La nuestra es la palabra `AYUDA`                                                                                                |
| Bots de IA      | Los [términos de Meta](https://www.facebook.com/legal/Meta-Terms-for-WhatsApp-Business-Platform) prohíben ofrecer IA como funcionalidad principal. Ver [ADR 0005](adr/0005-whatsapp-inicio-por-usuario-y-curso-cerrado.md) |

## Costo de mensajería por usuario

Supuestos: 22 lecciones por mes, todas completas, 4 mensajes de contenido por lección y el recordatorio como quinto mensaje. No incluye los 1.000 gratis, porque a escala casi no pesan. El recordatorio se calcula como plantilla de marketing, que es el peor caso.

| Días en que el usuario escribe solo | ARS por mes | USD por mes | Ahorro |
| ----------------------------------- | ----------- | ----------- | ------ |
| 0% (recordatorio siempre)           | 5.286       | 3,65        | —      |
| 50%                                 | 4.301       | 2,97        | 19%    |
| 80%                                 | 3.710       | 2,56        | 30%    |
| 100%                                | 3.316       | 2,29        | 37%    |

Cómo se calcula: una lección sin recordatorio cuesta 4 × 37,68 = ARS 150,72, y con recordatorio suma ARS 89,56.

**Para el VAN:** con 50% a 80% de autoinicio, la mensajería representa entre el 74% y el 86% de la suscripción hipotética de $5.000 por mes. Todavía no están medidos el autoinicio real ni la cantidad de reintentos del tutor.

Cada reintento del tutor suma ARS 37,68. Si el recordatorio sale dentro de una ventana abierta, cuesta ARS 37,68 en vez de ARS 89,56.

## Costo de IA por usuario

Meta del proyecto: menos de ARS 500 por mes. Estimación con 22 lecciones, 5 turnos del tutor y 3 audios de 15 segundos por lección, al dólar oficial de $1.550.

| Concepto                                                    | USD por mes | ARS por mes |
| ----------------------------------------------------------- | ----------- | ----------- |
| Modelo de lenguaje (2.000 tokens de entrada, 150 de salida) | 0,033       | 51          |
| Voz a texto (16,5 minutos a USD 0,003)                      | 0,05        | 78          |
| **Subtotal con voz gratis (piloto)**                        | **0,083**   | **129**     |
| Texto a voz sin plan gratis (16.500 caracteres)             | 0,26        | 409         |
| **Total sin plan gratis de voz**                            | **0,347**   | **538**     |

Al escalar, la meta queda justa. La palanca principal es reutilizar frases ya generadas en lugar de sintetizar cada respuesta. El precio de voz viene de fuentes de terceros y hay que confirmarlo en la Fase 3.

## Presupuesto del piloto

30 usuarios, 10 lecciones, 3 mensajes de alta por usuario y repaso del día 30. Supone que las 2 semanas caen en un mismo mes y que se completan todas las lecciones.

| Concepto  | Costo                                        |
| --------- | -------------------------------------------- |
| WhatsApp  | ARS 19.000 (80% de autoinicio) a 40.500 (0%) |
| Hosting   | USD 10 (estimado, a confirmar)               |
| IA        | USD 2                                        |
| **Total** | **unos ARS 37.000 a 59.000**                 |

## Qué tiene que tener listo el titular de la cuenta

- [ ] Una línea nueva, que no se use en la app de WhatsApp.
- [ ] Un portafolio de Meta exclusivo para Charlá, con al menos 2 administradores.
- [ ] Una tarjeta cargada como medio de pago.
- [ ] Moneda de facturación confirmada. Recomendamos pesos: el mensaje sale un 6,5% menos que en dólares al oficial de hoy.
- [ ] Nombre visible aprobado por Meta.

## Migrar a una cuenta institucional

Según la [guía de Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/support/migrating-phone-numbers-among-solution-partners-via-embedded-signup.md), el número conserva nombre visible, calidad y límite de mensajes. Las plantillas se recrean y su calificación vuelve a cero. La guía está pensada para socios de Meta, así que falta confirmar que aplique a nuestro caso.

- **Condición que puede trabar:** la cuenta de origen tiene que estar verificada, y el número no puede ser uno de prueba.
- **Lo que dejamos preparado:** identificadores en variables de entorno, plantillas versionadas y consentimiento a nombre de Charlá.

## Sin confirmar

- Límite de destinatarios del número de prueba (de memoria, 5).
- Límites de frecuencia de las plantillas de marketing por usuario.
- Si la moneda de facturación se puede cambiar después de elegirla.
- Si Meta considera a Charlá dentro de lo que prohíbe la cláusula de IA. Decide Meta, a su exclusivo criterio.
