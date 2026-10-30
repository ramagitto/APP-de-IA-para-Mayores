# ADR 0004: hosting en Railway

**Estado:** aceptado como punto de partida, 30/10/2026. Precios a confirmar en el despliegue de la Fase 8. El [ADR 0006](0006-recortes-del-mvp.md) saca el entorno de staging.

## Contexto

Hace falta un servidor siempre encendido, porque Meta entrega los webhooks en cualquier momento, y un Postgres que no se duerma. El equipo tiene poca experiencia operando servidores.

## Decisión

Railway, con la aplicación y Postgres en la misma cuenta, y entornos separados para staging y producción. Estimamos USD 5 a 10 por mes, con precios de fuentes de terceros que no coinciden del todo.

## Alternativas

- **Render:** precios predecibles, pero el plan gratis se duerme y pierde webhooks. Es la primera alternativa si Railway no conviene.
- **Fly.io:** más control, pero más configuración y costos adicionales de red y snapshots.
- **Neon como base gratuita:** se limita por horas de cómputo, y la cola no la deja dormir (ver [ADR 0002](0002-postgres-y-cola-pg-boss.md)).

## Consecuencias

- Despliegue simple y una sola factura. Requiere tarjeta.
- Los datos quedan fuera de Argentina, y el consentimiento tiene que avisarlo.
- La aplicación es un servidor Node común, así que mudarla a otro proveedor es sencillo.
