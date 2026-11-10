# Registro de horas

Sirve para saber si llegamos a fines de marzo de 2027 con datos reales, no con la estimación. Alimenta el indicador "horas reales vs. planificadas" del informe, cuya meta es un desvío de 10% o menos.

## Cómo se usa

1. **Una vez por semana,** agregá una fila en [Registro semanal](#registro-semanal), con la fase y las horas reales. Si en una semana tocaste dos fases, usá dos filas.
2. **Anotá también las semanas en cero.** Son parte del dato.
3. **Contá todo lo del desarrollo:** programar, leer la documentación, probar, revisar lo que hizo Claude y hacer trámites técnicos. El trabajo del resto del grupo se anota aparte, abajo.
4. **Al cerrar cada fase,** se completa la columna "Real" y se decide si hace falta ajustar el plan.

Punto de partida: unas 197 horas disponibles entre el 2/11/2026 y el 31/3/2027, a 10 horas por semana y descontando 2 semanas de fiestas y vacaciones.

## Estimado contra real por fase

"Estimado" es la estimación con los recortes aprobados. "Con margen" le suma un 20%. Las fechas salen de trabajar 10 horas por semana desde el 2/11/2026, y son una referencia.

| Fase                      | Estimado  | Con margen | Fin previsto | Real | Desvío | Fin real |
| ------------------------- | --------- | ---------- | ------------ | ---- | ------ | -------- |
| 1. Dominio y contenido    | 24 h      | 29 h       | 22/11/2026   |      |        |          |
| 2. Tutor de IA            | 25 h      | 30 h       | 13/12/2026   |      |        |          |
| 3. Simulador y voz        | 19 h      | 23 h       | 12/1/2027    |      |        |          |
| 4. WhatsApp               | 35 h      | 42 h       | 11/2/2027    |      |        |          |
| 5. Programación           | 14 h      | 17 h       | 23/2/2027    |      |        |          |
| 6. Padrino                | 12 h      | 14 h       | 5/3/2027     |      |        |          |
| 7. Métricas               | 8 h       | 10 h       | 12/3/2027    |      |        |          |
| 8. Preparación del piloto | 23 h      | 28 h       | 31/3/2027    |      |        |          |
| **Total**                 | **160 h** | **193 h**  |              |      |        |          |

**Desvío** = (real − estimado) ÷ estimado. Por ejemplo, 30 h reales contra 24 h estimadas son +25%.

## Detalle estimado de la Fase 2

La hizo Claude en una sesión autónoma, así que estas horas **no son tuyas**. Lo que sí te toca es revisar el PR, probar con una clave real y revisar los mensajes de cuidado. Anotá ese tiempo en el registro semanal.

| Tarea                                                  | Estimado |
| ------------------------------------------------------ | -------- |
| Capa de proveedor, proveedor simulado y adaptador real | 5 h      |
| Prompt del tutor y armado del pedido                   | 4 h      |
| Capas de seguridad y mensajes de cuidado               | 6 h      |
| Control de costos y tabla `usage_costs`                | 3 h      |
| 43 evals y su comando                                  | 5 h      |
| Documentación, ADR y PR                                | 2 h      |
| **Total**                                              | **25 h** |
| Tu revisión del PR y prueba con clave real (estimado)  | 3 a 5 h  |

## Cuándo reaccionar

Si al cerrar una fase el total acumulado supera lo estimado **con margen**, el plan ya no entra. En ese caso, antes de empezar la fase siguiente, se decide entre recortar más o usar parte de abril.

## Registro semanal

Las semanas empiezan el lunes.

| Semana del | Fase | Horas | Notas (qué se hizo, qué trabó) |
| ---------- | ---- | ----- | ------------------------------ |
| 2/11/2026  | 1    |       |                                |

## Horas del resto del grupo

Sirve para el informe y para ver si hay cuellos de botella. No va ningún nombre, porque el repositorio es público: se anota el rol.

| Semana del | Rol        | Tarea                    | Horas |
| ---------- | ---------- | ------------------------ | ----- |
| 2/11/2026  | Contenidos | Revisar las 10 lecciones |       |
