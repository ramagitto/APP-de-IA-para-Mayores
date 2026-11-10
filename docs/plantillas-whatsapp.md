# Plantillas de WhatsApp para enviar a aprobación

Las plantillas son los únicos mensajes que Charlá puede mandar fuera de la ventana de 24 horas. Meta revisa cada una antes de aprobarla, y puede tardar hasta 24 horas.

**La fuente de verdad es [`content/plantillas-whatsapp.yaml`](../content/plantillas-whatsapp.yaml).** `npm run lessons:check` la valida con las reglas de Meta. Si Meta pide un cambio, editá el YAML y este documento juntos.

Ninguna plantilla lleva el nombre de la persona: no lo guardamos, para tener los datos mínimos.

## Cómo cargarlas

En WhatsApp Manager, crear cada plantilla con:

- **Nombre:** el de la tabla, tal cual (minúsculas y guiones bajos).
- **Idioma:** Spanish (ARG), código `es_AR`.
- **Categoría:** la que figura en la tabla. Meta puede reclasificarla.
- **Cuerpo:** el texto de abajo, sin cambios.
- **Sin encabezado, sin pie y sin botones.**

## Textos

### `charla_recordatorio`

- **Categoría pedida:** Marketing. El contenido educativo no suele calificar como Utility.
- **Uso:** recordatorio del día, a la hora que eligió la persona, solo si no escribió. Máximo 1 por día (Fase 5).
- **Costo:** ARS 89,56 por envío como marketing (tarifa del 30/10/2026). Si la ventana de 24 horas sigue abierta, no hace falta plantilla.

> Hola, tu lección de hoy de Charlá te está esperando. Son unos 3 minutos. Cuando quieras, contestá este mensaje y arrancamos. Si no querés recibir más mensajes, escribí BAJA.

### `charla_repaso`

- **Categoría pedida:** Marketing.
- **Uso:** lección de repaso del día 30 (Fase 5).

> Hola, pasó un tiempo desde tu curso de Charlá. Preparamos un repaso cortito, de unos 3 minutos. Si querés hacerlo, contestá este mensaje. Si no querés recibir más mensajes, escribí BAJA.

### `charla_respuesta_equipo`

- **Categoría pedida:** Utility, porque responde a un pedido de la persona.
- **Uso:** cuando una persona del equipo responde un pedido de AYUDA y pasaron más de 24 horas desde el último mensaje. `npm run support -- responder` avisa cuándo hace falta.

> Hola, te escribe una persona del equipo de Charlá por tu pedido de ayuda. Respondé este mensaje y seguimos hablando por acá. Charlá nunca te va a pedir claves ni códigos.

## Reglas que cumplen

Las chequea `npm run lessons:check`, según la [guía de revisión de Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-review.md):

- Si hay variables, van numeradas en orden (`{{1}}`, `{{2}}`) y ninguna está al principio ni al final.
- Cada variable tiene un ejemplo.
- Ninguna pide datos sensibles.
- Las de marketing dicen cómo dejar de recibir mensajes.

**Supuesto sin verificar:** que el cuerpo admite hasta 1.024 caracteres. Los nuestros tienen menos de 250.

## Después de la aprobación

Anotá en [la checklist del trámite](tramite-meta.md) el estado y la categoría que asignó Meta. Si quedó en otra categoría, actualizá el costo en [whatsapp-y-costos.md](whatsapp-y-costos.md).
