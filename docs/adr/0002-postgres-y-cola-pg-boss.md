# ADR 0002: Postgres como base de datos y como cola

**Estado:** aceptado, 30/10/2026.

## Contexto

Hacen falta datos relacionales (usuarios, consentimientos, intentos, costos) y también trabajos en segundo plano con reintentos y sin duplicados: audio, envíos programados y recordatorios.

## Decisión

- **Postgres** para todos los datos, con Docker en desarrollo.
- **Drizzle** para consultas y migraciones versionadas en SQL, desde la Fase 1.
- **pg-boss** para la cola, que guarda los trabajos en el mismo Postgres.

## Alternativas

- **Redis con BullMQ:** muy popular, pero suma un servicio más para operar y pagar. A 100 usuarios no lo necesitamos.
- **Prisma:** más documentación para principiantes, pero Drizzle deja ver el SQL y tiene menos magia.
- **SQLite:** muy simple, pero complica los jobs concurrentes y el despliegue con varias instancias.

## Consecuencias

- Un solo servicio de datos, con una sola copia de seguridad.
- Datos y trabajos se pueden guardar en la misma transacción, lo que ayuda a evitar mensajes duplicados.
- La cola consulta la base todo el tiempo, así que **la base nunca queda inactiva.** Por eso descartamos planes gratuitos que cobran o limitan por horas de cómputo, como Neon (ver [ADR 0004](0004-hosting-railway.md)). Es un razonamiento nuestro, sin medir todavía.
