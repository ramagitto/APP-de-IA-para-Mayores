# ADR 0005: WhatsApp con inicio por el usuario y tutor cerrado

**Estado:** aceptado, 30/10/2026.

## Contexto

Dos hallazgos de la Fase 0 cambian el diseño:

1. **Costo.** Desde el 1/10/2026 Meta cobra los mensajes de servicio, con 1.000 gratis por número por mes. A ARS 37,68 por mensaje, la meta original de ARS 500 por usuario solo alcanzaba para unos 13 mensajes por mes.
2. **Política.** Los [términos de Meta](https://www.facebook.com/legal/Meta-Terms-for-WhatsApp-Business-Platform) prohíben ofrecer IA como funcionalidad principal, y Meta decide a su exclusivo criterio qué entra ahí.

## Decisión

**Sobre el costo:**

- 5 lecciones por semana, con un máximo de 5 mensajes pagos por lección, contando audios y el recordatorio.
- La meta de ARS 500 aplica solo a la IA. La mensajería se mide aparte y va al VAN.
- **La lección arranca cuando el usuario escribe.** Cualquier mensaje la dispara, no solo "HOLA", para que nadie falle por escribir otra cosa.
- **A la hora elegida, un solo recordatorio por día,** y solo si no escribió. Dentro de una ventana abierta va como mensaje común; si no, como plantilla.
- Integración directa con Meta, sin intermediarios que cobren por mensaje.
- Los avisos al padrino van por email, porque por WhatsApp cada uno se cobra como plantilla.

**Sobre la política:**

- Charlá es un curso guionado. El tutor solo trabaja sobre la lección y redirige cualquier otra pregunta. Nunca funciona como asistente abierto.
- La palabra `AYUDA` deriva a una persona del equipo, como exige la política de WhatsApp.
- El simulador web y la separación por adaptadores dejan abierto un canal alternativo.

**Sobre la cuenta:**

- En el piloto, el titular es un integrante del equipo. Su nombre no va en este repositorio, que es público.
- El diseño permite migrar el número a una cuenta institucional. No asumimos que la USAL califique como organización sin fines de lucro.

## Alternativas

- **Enviar la lección a una hora fija con plantilla:** más simple y sin depender de la memoria del usuario, pero cuesta hasta un 59% más por lección (ARS 240 contra ARS 151).
- **Meta Business Agent:** descartado, 4 a 5 centavos de dólar por mensaje y poco control.
- **Otro canal, como Telegram:** eliminaría ese costo, pero contradice la decisión central de usar la app que el usuario ya tiene.

## Consecuencias

- El ahorro máximo es del 37%, y no resuelve solo el VAN: el 63% del costo son mensajes de servicio.
- Algunos mayores pueden olvidarse de escribir, y eso puede afectar la retención. Lo medimos en la prueba con 10 usuarios y en el piloto.
- Aparece una métrica nueva: **porcentaje de lecciones iniciadas por el usuario**, que mide directamente el hábito.
- La Fase 5 cambia: a la hora elegida ya no se envía la lección, sino el recordatorio.
- Queda un riesgo que no controlamos: Meta podría interpretar la cláusula de IA de otra manera.
