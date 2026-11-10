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

- [ ] Revisión legal del consentimiento y del cumplimiento de la Ley 25.326.
- [ ] Confirmar la política de retención: audios borrados al transcribir y transcripciones a los 30 días.

## Meta y costos

- [ ] Completar el [trámite de Meta](tramite-meta.md).
- [ ] Revisar las [tarifas de WhatsApp](whatsapp-y-costos.md) y los precios de IA, que pueden cambiar cada trimestre.
- [ ] Recalcular el VAN con los costos medidos.
