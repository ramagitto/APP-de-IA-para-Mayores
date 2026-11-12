# ADR 0012: hosting gratis en Render, con la base en Neon

**Estado:** propuesto, 12/11/2026. Para el piloto web reemplaza al [ADR 0004](0004-hosting-railway.md). Precios y límites consultados en la documentación oficial el 10/11/2026: hay que confirmarlos al crear las cuentas, porque cambian seguido.

## Contexto

El piloto web es chico (10 a 30 personas) y el equipo pidió la opción más barata, gratis si alcanza. A diferencia de WhatsApp, la web no recibe webhooks: si el servidor está dormido, la persona espera a que despierte, pero no se pierde ningún mensaje. Por eso un plan que se duerme ahora sirve.

## Decisión

| Pieza         | Servicio        | Plan   | Límites que importan                                                                                                              |
| ------------- | --------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Servidor      | Render          | Gratis | Se duerme a los 15 minutos sin uso y tarda cerca de un minuto en despertar. 750 horas por mes. El disco se borra en cada reinicio |
| Base de datos | Neon (Postgres) | Gratis | 1 GB, 100 horas de cómputo por proyecto y por mes, se duerme a los 5 minutos sin uso. Historial para restaurar de 6 horas         |
| Código        | GitHub          | —      | Render despliega desde `main`                                                                                                     |

**Costo fijo: USD 0.** El costo de IA es aparte: el tutor y la voz de Azure tienen un tope de USD 0,01 por persona y por día (USD 0,30 por día con 30 personas, en el peor caso), y la voz a texto cuesta unos USD 0,14 por día con un minuto de audio por persona. En dos semanas de piloto, menos de USD 7.

Fuentes: [Render, plan gratis](https://render.com/docs/free), [Neon, planes](https://neon.com/docs/introduction/plans), [Render, blueprint](https://render.com/docs/blueprint-spec), [Render, versión de Node](https://render.com/docs/node-version).

### Por qué no la base gratis de Render

Vence a los 30 días y no tiene backups. Un piloto de dos semanas, más la preparación, ya se pasa.

### Detalles que lo hacen funcionar

- **`render.yaml`** en el repositorio: el servicio queda descripto en código y se crea con un clic. Los secretos no van ahí.
- **`npm run start:production`** aplica las migraciones y arranca. El plan gratis no tiene paso previo al despliegue.
- **`/ping`** para el chequeo de Render, sin tocar la base. Si el chequeo usara `/health`, Neon no se dormiría nunca y se pasaría de las 100 horas.
- **Región:** Render en Virginia y Neon en AWS us-east-1 (Virginia), las más cercanas a la Argentina entre las disponibles, y juntas entre sí.
- **El servidor dormido:** `npm run pilot -- recordatorios` lo despierta antes de que el equipo mande los mensajes, y la app avisa "Charlá se está despertando" si tarda.
- **Audios de Charlá:** se guardan en el disco del servidor, que se borra al dormirse. Se vuelven a generar si hace falta; con Azure gratis (0,5 millones de caracteres por mes) no cuesta nada.

## Alternativas

- **Render pago (instancia Starter):** no se duerme. Es el primer paso si el minuto de espera molesta a las personas. Precio a confirmar en la página de Render.
- **Railway (ADR 0004):** USD 5 por mes en el plan Hobby, con tope de gasto configurable (mínimo USD 10). El plan gratis da USD 1 de crédito por mes, que no alcanza para un servidor siempre encendido.
- **Mantener el servidor despierto con pings externos:** técnicamente entra en las 750 horas, pero en el foro de Render lo consideran abuso del plan gratis. No lo recomendamos.
- **Koyeb, Fly.io:** sin un plan gratis claro para servidor y base a la vez.

## Consecuencias

- Costo fijo cero, sin tarjeta para empezar _(supuesto: ninguna de las dos páginas dice si piden tarjeta para el plan gratis)_.
- La primera persona que entra después de un rato espera cerca de un minuto. Hay que avisarlo en la capacitación: "si tarda, esperá un ratito".
- Los datos quedan en Estados Unidos. El consentimiento ya avisa que se procesan fuera de la Argentina.
- La base del piloto web no tiene teléfonos ni nombres, así que un incidente expone poco. Igual, se hace un backup semanal a mano (ver la checklist).
- Mudarse es fácil: es un servidor Node común y un Postgres estándar.
