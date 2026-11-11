# Resumen de la sesión autónoma del 10/11/2026 (tercera parte)

Las partes anteriores (Fases 2 y 3) quedaron en el historial de git de este archivo.

## En una línea

**Las Fases 1 a 3 están mergeadas en `main`, y la Fase 4 está hecha y en revisión en el PR #5, con la CI en verde.** No conecté ningún número real, no creé cuentas, no pedí claves y no pusheé a `main`.

## Merges autorizados

| PR                                                               | Fase                       | Squash en `main` | CI antes de mergear          |
| ---------------------------------------------------------------- | -------------------------- | ---------------- | ---------------------------- |
| [#2](https://github.com/ramagitto/APP-de-IA-para-Mayores/pull/2) | 1. Dominio y contenido     | `04afdec`        | En verde                     |
| [#3](https://github.com/ramagitto/APP-de-IA-para-Mayores/pull/3) | 2. Tutor y líneas de ayuda | `2fb58bf`        | En verde, después del rebase |
| [#4](https://github.com/ramagitto/APP-de-IA-para-Mayores/pull/4) | 3. Simulador y voz         | `fe01dd0`        | En verde, después del rebase |

- **Rebases:** comprobé que no cambiaran el contenido; el diff contra la rama original dio vacío en los dos.
- **CI de `main`:** en verde después del último merge.
- **Ramas:** no borré ninguna, porque sigue prohibido. Las ramas viejas siguen en GitHub.

## PR abierto

| PR                                                               | Fase                            | Base   | CI       | Estado       |
| ---------------------------------------------------------------- | ------------------------------- | ------ | -------- | ------------ |
| [#5](https://github.com/ramagitto/APP-de-IA-para-Mayores/pull/5) | 4. WhatsApp, alta, BAJA y AYUDA | `main` | En verde | Espera tu OK |

## Qué quedó hecho en la Fase 4

**Decisión 26, implementada como la aprobaste:**

- nadie se crea en `users` sin un ACEPTO explícito;
- antes del ACEPTO, solo se guarda el hash del contacto, la fecha y la cantidad de pedidos;
- con NO, o después de 3 pedidos sin respuesta, se borra;
- antes de aceptar, un audio no se transcribe, porque mandarlo a un tercero ya sería tratar datos.

**BAJA y AYUDA:**

- **BAJA** borra a la persona, su avance, sus pedidos de ayuda y, después de mandar la despedida, sus mensajes en tránsito.
- **AYUDA** abre un pedido que se atiende con `npm run support -- listar | responder | cerrar`. La respuesta sale desde el número de Charlá.
- **Mensaje de cuidado:** también abre un pedido, marcado como prioridad.

**Adaptador de WhatsApp**, contra payloads armados según la documentación oficial de Meta:

- verificación del webhook y firma HMAC-SHA256 sobre el cuerpo exacto;
- idempotencia por id de mensaje y cola con pg-boss;
- respuestas guardadas antes de enviarse, así un reintento no duplica ni vuelve a correr la lección;
- contenido cifrado, que se borra apenas se procesa o se envía;
- texto, notas de voz (descarga y envío con `voice: true`) y plantillas;
- respuesta por el id por empresa de WhatsApp (BSUID), que Meta recomienda porque el teléfono puede faltar;
- límite de 20 mensajes por minuto por persona.

**Plantillas:** tres textos listos para enviar a aprobación en [plantillas-whatsapp.md](plantillas-whatsapp.md), versionados en `content/plantillas-whatsapp.yaml` y validados con las reglas de Meta.

**Pasos exactos para conectar el número:** en la [checklist del piloto](checklist-piloto.md), sección "Conectar el número de WhatsApp". Lo que no pude confirmar en la documentación está marcado como _(supuesto)_.

**Para probar sin un número:** `WHATSAPP_PROVIDER=fake` y `npm run whatsapp:simulate -- "hola"`. Está en el README.

## Verificación

| Control                                                    | Resultado                                                                                                         |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Tests unitarios                                            | 412 de 412                                                                                                        |
| Tests de integración (Postgres y pg-boss)                  | 40 de 40, en dos corridas seguidas                                                                                |
| Evals                                                      | Aprobadas                                                                                                         |
| De punta a punta contra el servidor, con webhooks firmados | Verificación OK (200), token equivocado (403), sin firma (401); consentimiento, bienvenida, lección, AYUDA y BAJA |
| Logs                                                       | Ningún id, texto ni contacto                                                                                      |
| CI del PR #5                                               | En verde                                                                                                          |

## Problemas encontrados y resueltos

- **Token en los logs:** el de verificación del webhook quedaba registrado, porque Fastify guarda la URL completa. Ahora los logs no guardan la query, y hay un test que lo controla.
- **Test inestable:** el de pg-boss falló una vez, porque un servidor de prueba que dejé corriendo se quedaba con los trabajos de la cola. Cerré ese proceso y el test ahora usa una cola propia.
- **Identidad:** Meta manda un id por empresa (BSUID) y el teléfono puede faltar. Las personas pasan a identificarse por "contacto" (`wa:` o `tel:`).

## Decisiones tomadas sin vos

Están las 19 nuevas (de la 34 a la 52) en [decisiones-pendientes.md](decisiones-pendientes.md). Las de importancia alta:

- **34. Identificar por contacto** (BSUID o teléfono).
- **37. No transcribir audios antes del consentimiento.**
- **38. El texto del consentimiento está en borrador:** lo escribí yo, y lo tiene que revisar alguien con formación legal.
- **41. AYUDA se atiende con un script** y responde desde el número de Charlá.
- **42. Un mensaje de cuidado también avisa al equipo.**

## Qué quedó bloqueado o pendiente

| Qué                                                                      | Por qué                                                        | Qué hace falta                 |
| ------------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------ |
| Probar con un número real                                                | Está prohibido sin vos, y hace falta el trámite de Meta        | Seguir la checklist del piloto |
| Constancia mínima de consentimiento y baja                               | Es una decisión legal                                          | La revisión legal              |
| Ver si WhatsApp transcribe las notas de voz                              | Solo se puede ver con un número real                           | Probarlo al conectar           |
| Que el intento, la racha y las respuestas vayan en una misma transacción | Los repositorios no aceptan transacciones (decisiones 27 y 44) | Una fase siguiente             |
| Limpiar las altas sin respuesta y los registros viejos                   | Es parte de la programación de tareas                          | Fase 5                         |

## Qué necesito que revises

1. **El PR #5,** para mergearlo.
2. **El texto del consentimiento** (`content/consentimiento.yaml`), con alguien con formación legal.
3. **Las decisiones 34 a 52.**
4. **Los pasos para conectar el número** de la checklist del piloto, cuando avance el trámite de Meta.

Freno acá, como pediste: la Fase 5 (programación y notificaciones) espera tu OK.
