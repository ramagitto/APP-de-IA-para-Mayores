# Resumen de la sesión autónoma del 10/11/2026

## En una línea

**La Fase 2 está hecha y en revisión, con la CI en verde.** La Fase 1 ya estaba completa en lo técnico. No mergeé nada, no gasté plata, no creé cuentas y no toqué secretos ni permisos.

## Pull requests

| PR                                                               | Fase                   | Base                  | CI       | Estado                |
| ---------------------------------------------------------------- | ---------------------- | --------------------- | -------- | --------------------- |
| [#2](https://github.com/ramagitto/APP-de-IA-para-Mayores/pull/2) | 1. Dominio y contenido | `main`                | En verde | Abierto, espera tu OK |
| [#3](https://github.com/ramagitto/APP-de-IA-para-Mayores/pull/3) | 2. Tutor de IA         | `feat/fase-1-dominio` | En verde | Abierto, espera tu OK |

**Orden para mergear:** primero el #2 y después el #3. Si al mergear el #2 se borra su rama, GitHub cambia solo la base del #3 a `main`.

## Qué quedó hecho

**Fase 1:** no hubo cambios en esta sesión. Ya cumplía el plan aprobado: dominio, formato YAML, motor, rachas, 10 lecciones y recorrido por consola. Para cerrarla falta la revisión de contenidos.

**Fase 2:**

- **Capas de seguridad por reglas,** que no dependen del modelo:
  - mensajes de cuidado ante angustia, emergencia médica o estafa en curso;
  - freno a los intentos de manipular al tutor;
  - ocultado de DNI, tarjetas, claves y correos antes de mandar el texto al proveedor;
  - controles sobre la respuesta: que no pida datos, no dé dosis, no tenga links ni filtre sus instrucciones;
  - notas obligatorias de derivación al médico, al abogado o a canales oficiales.
- **Tutor con IA:** interfaz de proveedor, proveedor simulado (por defecto) y adaptador de Anthropic (Claude Haiku 5.5), con respaldo por reglas si el proveedor falla, rechaza el pedido o se pasa el tope.
- **Costos:** tope de USD 0,01 por persona y por día, y la tabla `usage_costs` con cada llamada.
- **Evals:** 43 casos en 11 categorías, con umbral del 100% en las 8 críticas y del 90% en el resto. Corren en la CI con el proveedor simulado.
- **Consola:** `npm run lesson:play` usa el tutor completo.
- **Documentación:** [ADR 0008](adr/0008-tutor-guardrails-y-evals.md), [decisiones pendientes](decisiones-pendientes.md), `CHANGELOG`, horas, plan de fases, `README` y `CLAUDE.md`.

## Verificación

| Control                         | Resultado                     |
| ------------------------------- | ----------------------------- |
| Tests unitarios                 | 321 de 321                    |
| Tests de integración (Postgres) | 16 de 16                      |
| Evals con el proveedor simulado | 43 de 43, aprobadas           |
| Lecciones                       | 10 válidas, todas en borrador |
| CI del PR #3                    | En verde                      |

Durante el trabajo aparecieron dos fallas, ya corregidas y con tests:

- "Me duele el pecho" recibía solo "consultá a tu médico". Ahora es una emergencia con mensaje para llamar al 911.
- "Mi clave del banco es..." no se ocultaba.

## Costo del tutor

| Medición                  | Resultado                                                |
| ------------------------- | -------------------------------------------------------- |
| Con el proveedor simulado | Unos ARS 0,07 por devolución y ARS 3 por persona por mes |
| Meta                      | Menos de ARS 500 por persona por mes                     |

**Ese número subestima el costo real:** el simulado no cuenta el razonamiento interno del modelo y estima los tokens por el largo del texto. Aunque el real fuera 50 veces mayor, seguiría muy por debajo de la meta. La medición real necesita una clave de Anthropic.

## Decisiones tomadas sin vos

Están las 18 en [decisiones-pendientes.md](decisiones-pendientes.md), con por qué y cómo revertirlas. Las que más importan:

1. **Los mensajes de cuidado no cuentan para el tope de 5 mensajes de la lección.** Nunca se deja de cuidar a alguien para ahorrar.
2. **La emergencia médica es una categoría crítica,** con el 911.
3. **Los mensajes de cuidado solo mencionan el 911.** No incluí la línea 135 del Centro de Asistencia al Suicida, porque tu regla prohíbe teléfonos reales en el repo. **Decidilo vos.**
4. **Umbrales de las evals:** 100% en las categorías críticas y 90% en el resto.

## Qué quedó bloqueado

| Qué                                                      | Por qué                                            | Qué hace falta                                                                                                    |
| -------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Probar el tutor con un modelo real y medir el costo real | No hay clave, y estaba prohibido pedirla o crearla | Crear una cuenta de Anthropic, cargar la clave en el `.env` y correr `npm run evals` con `LLM_PROVIDER=anthropic` |
| Comparar proveedores (ADR 0003)                          | Requiere cuentas en OpenAI y Google                | Lo mismo, con un adaptador por proveedor                                                                          |
| Cerrar la Fase 1                                         | Falta la revisión humana de las lecciones          | Que contenidos revise `content/lessons/`                                                                          |
| Mergear los PR                                           | Requiere tu OK                                     | Revisar y mergear #2 y después #3                                                                                 |

## Qué necesito que revises

1. **Los mensajes de cuidado,** en `src/modules/safety/safety-messages.ts`. Son los textos más sensibles del producto. Si es posible, que los mire alguien de salud mental.
2. **La línea 135:** ¿la incluimos?
3. **Las decisiones de [decisiones-pendientes.md](decisiones-pendientes.md),** en especial las marcadas como importancia alta.
4. **Los PR #2 y #3,** para mergearlos.
5. **Tus horas reales,** en [horas.md](horas.md).

Después de esto, la Fase 3 (simulador y voz) espera tu OK para empezar.
