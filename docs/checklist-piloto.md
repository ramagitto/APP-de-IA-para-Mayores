# Checklist de salida para el piloto

Todo lo que tiene que estar resuelto antes de que la primera persona reciba una lección. La Fase 8 la completa con la revisión de seguridad, el despliegue y el monitoreo.

## Seguridad de las personas

- [ ] **Reverificar las líneas de ayuda** de [`content/lineas-de-ayuda.yaml`](../content/lineas-de-ayuda.yaml): llamar o consultar cada fuente, confirmar el número y actualizar la fecha de `verificado`. `npm run lessons:check` avisa si pasaron más de 90 días.
- [ ] **Revisar los mensajes de cuidado** (`src/modules/safety/safety-messages.ts`) con el equipo y con una persona con formación en psicología. Después, cambiar `CARE_MESSAGES_REVIEW` a `'revisado'`.
- [ ] **Definir quién atiende `AYUDA`** y en qué tiempo responde.
- [ ] **Correr las evals con el proveedor real** (`LLM_PROVIDER=anthropic`): las categorías críticas tienen que dar 100%.
- [ ] **Probar la voz real** con audios de personas mayores: que `gpt-transcribe` entienda el habla rioplatense y que la voz de Azure suene bien. Medir la duración real de los guiones.
- [ ] **No usar los proveedores de voz simulados en el piloto:** usan la voz del navegador, que puede mandar el audio a terceros.

## Contenido

- [ ] Revisar y aprobar las 10 lecciones (`revision: aprobada`).
- [ ] Probar en un Android y un iPhone los puntos de [`content/README.md`](../content/README.md).
- [ ] Completar [`content/feriados.yaml`](../content/feriados.yaml) con el calendario oficial de 2027.

## Legal y privacidad

- [ ] Revisión legal del consentimiento ([`content/consentimiento.yaml`](../content/consentimiento.yaml), en borrador) y del cumplimiento de la Ley 25.326. Después, cambiar `revision: borrador` por `aprobada` y subir la `version`.
- [ ] Publicar una política de privacidad completa, con los derechos de acceso, rectificación y supresión y el rol de la Agencia de Acceso a la Información Pública como órgano de control. Sumar el link al pedido de consentimiento.
- [ ] Confirmar la política de retención: audios borrados al transcribir y transcripciones a los 30 días.

## Conectar el número de WhatsApp

**Antes:** el [trámite de Meta](tramite-meta.md) completo (línea, portafolio, nombre visible aprobado y tarjeta) y el servidor publicado con una URL HTTPS, lo que es parte de la Fase 8. Basado en la documentación de Meta consultada el 10/11/2026. Lo marcado como _(supuesto)_ no lo pude confirmar.

1. [ ] **Crear la app de Meta** en el panel de desarrolladores, asociada al portafolio de Charlá, y agregarle WhatsApp. _(Supuesto: los nombres exactos de los menús cambian seguido.)_
2. [ ] **Secreto de la app:** copiarlo de la configuración básica de la app a `WHATSAPP_APP_SECRET`. Con él se verifica la firma de cada webhook. _(Supuesto: la ubicación del secreto en el panel.)_
3. [ ] **Token permanente de un usuario del sistema** (no el token temporal del panel):
   - En la configuración del negocio, crear un usuario del sistema con rol de administrador.
   - Asignarle la app con permiso para administrarla.
   - Darle acceso a la cuenta de WhatsApp **y** a la cuenta de mensajería. Con una sola de las dos no alcanza.
   - Generar el token con los permisos `business_management`, `whatsapp_business_management` y `whatsapp_business_messaging`.
   - Copiarlo a `WHATSAPP_ACCESS_TOKEN`. **Es un secreto: nunca va al repositorio.**
4. [ ] **Id del número:** copiarlo de WhatsApp Manager a `WHATSAPP_PHONE_NUMBER_ID`.
5. [ ] **Registrar el número para la Cloud API** con un PIN de 6 dígitos, que pasa a ser el de la verificación en dos pasos. Hay como máximo 10 intentos cada 72 horas. _(Supuesto: el cuerpo exacto del pedido; confirmalo en la guía de registro antes de correrlo.)_

   ```bash
   curl -X POST "https://graph.facebook.com/v27.0/$WHATSAPP_PHONE_NUMBER_ID/register" \
     -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"messaging_product": "whatsapp", "pin": "PIN_DE_6_DIGITOS"}'
   ```

6. [ ] **Token de verificación:** inventar uno al azar y guardarlo en `WHATSAPP_VERIFY_TOKEN`.

   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```

7. [ ] **Variables en el servidor:** `WHATSAPP_PROVIDER=cloud` más las cuatro anteriores. `WHATSAPP_GRAPH_VERSION` queda en `v27.0`, salvo que Meta indique otra. Reiniciar el servidor: en el log tiene que aparecer "Webhook de WhatsApp (cloud) en /webhooks/whatsapp".
8. [ ] **Configurar el webhook:** en la configuración de WhatsApp de la app, cargar como URL de callback `https://<dominio>/webhooks/whatsapp` y el mismo token de verificación, y guardar. Meta llama al servidor para verificarlo.
9. [ ] **Suscribirse al campo `messages`,** que trae los mensajes entrantes.
10. [ ] **Pasar la app a modo Live.** En modo desarrollo, algunos webhooks no se envían.
11. [ ] **Prueba con un teléfono del equipo:**
    - mandar "hola": tiene que llegar el pedido de consentimiento;
    - responder ACEPTO y hacer una lección completa, con un audio;
    - mandar AYUDA y verlo con `npm run support -- listar`;
    - mandar BAJA y confirmar que no quedan datos.
12. [ ] **Si no llegan mensajes:**
    - en el log, "Webhook con firma inválida" indica un secreto equivocado;
    - si no hay ningún pedido, revisar la URL, el modo Live y la suscripción;
    - _(supuesto)_ confirmar que la cuenta de WhatsApp esté suscripta a la app (endpoint `subscribed_apps` de la referencia de la API).

## Meta y costos

- [ ] Completar el [trámite de Meta](tramite-meta.md).
- [ ] Enviar a aprobación las [plantillas](plantillas-whatsapp.md).
- [ ] Revisar las [tarifas de WhatsApp](whatsapp-y-costos.md) y los precios de IA, que pueden cambiar cada trimestre.
- [ ] Recalcular el VAN con los costos medidos.
