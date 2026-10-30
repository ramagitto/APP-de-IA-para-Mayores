# ADR 0006: recortes para llegar al MVP

**Estado:** aceptado, 30/10/2026. Modifica en parte los ADR [0001](0001-stack-monolito-typescript.md) y [0004](0004-hosting-railway.md).

## Contexto

Una sola persona desarrolla, unas 10 horas por semana. Entre el 2/11/2026 y el 31/3/2027 hay unas 197 horas disponibles. El alcance original lleva unas 194 horas, o 233 con un 20% de margen, así que no entraba.

## Decisión

| Recorte                                   | Ahorro | Qué queda                                                                 |
| ----------------------------------------- | ------ | ------------------------------------------------------------------------- |
| Padrino por email, sin panel web ni login | 16 h   | Vinculación con consentimiento por WhatsApp, avisos y resumen semanal     |
| Métricas por script, sin panel interno    | 10 h   | KPIs por comando y CSV. Los gráficos se hacen en Power BI o Looker Studio |
| Simulador en una página simple, sin React | 6 h    | Sirve para desarrollar y hacer demos con voz                              |
| Sin entorno de staging                    | 2 h    | Local y producción. Se prueba con un número de prueba                     |

Queda en 160 horas, o 193 con margen.

**No se recorta:** guardrails y evals, consentimiento, `BAJA` con borrado, `AYUDA`, firma de webhooks ni backups. Protegen a personas mayores y sus datos.

## Alternativas

- **Mantener todo y usar abril:** el Gantt ubica el piloto después, pero abril es la única red de seguridad, y no conviene gastarla por adelantado.
- **Una página de lectura para el padrino:** suma unas 6 horas. Queda para después del piloto.

## Consecuencias

- El PDF define el MVP con "resumen semanal para el padrino", así que sigue dentro de lo prometido, pero se pierde el panel web de la especificación.
- Sin panel, no aplica la revisión con Lighthouse y axe. El email tiene que ser legible, con letra grande y buen contraste.
- React y las tablas `magic_links` salen del MVP.
- Sin staging, un error de configuración recién se ve en producción. Por eso los cambios de riesgo se prueban con el número de prueba antes del piloto.
- El margen es justo. A 8 horas por semana ya no entra. Las horas reales se siguen en [horas.md](../horas.md).
