# Cómo editar y revisar las lecciones

Esta guía es para el rol de contenidos. No hace falta programar. Cada lección es un archivo de texto en [`lessons/`](lessons/), que el sistema valida automáticamente.

## Probar una lección

```bash
npm install
npm run lesson:play
npm run lesson:play -- n1-l01
```

`npm run lesson:play` lista las lecciones. Con el comienzo de un id, recorre esa lección como si fuera la conversación. **El tutor de esta prueba es simulado:** solo mira el largo de lo que escribís, y sus frases no son el texto final. La respuesta del tutor real llega en la Fase 2.

Después de editar, validá el formato:

```bash
npm run lessons:check
```

Si hay un error, te dice en qué archivo y en qué campo.

## Partes de una lección

| Campo                            | Qué es                                                             | Largo máximo |
| -------------------------------- | ------------------------------------------------------------------ | ------------ |
| `titulo`                         | Nombre interno de la lección                                       | 80           |
| `logro`                          | Lo que la persona puede hacer al terminar                          | 160          |
| `intro.guion`                    | El audio, de hasta unos 40 segundos. Termina invitando a practicar | 650          |
| `practica.foco`                  | Qué mira el tutor. El usuario no lo ve                             | 300          |
| `practica.ejemplo_mejorado`      | Un buen ejemplo que el tutor puede ofrecer                         | 300          |
| `desafio.consigna`               | Qué hacer con la IA real. Termina pidiendo que cuente si pudo      | 500          |
| `desafio.recordatorio_seguridad` | Se manda siempre junto con la consigna                             | 200          |
| `cierre.si_pudo`                 | Cierre si pudo con la IA real                                      | 300          |
| `cierre.si_no_pudo`              | Cierre si no pudo. Tiene que dar aliento, nunca retar              | 300          |
| `revision`                       | `borrador` o `aprobada`                                            |              |
| `version`                        | Sumale 1 cada vez que cambies una lección ya aprobada              |              |

Una lección tiene **como máximo 5 mensajes pagos**, y por eso todo el contenido tiene que entrar en estos campos. No se puede agregar otro mensaje sin cambiar el presupuesto.

## Qué revisar en cada lección

- [ ] **Se entiende al escucharla.** Leé el guion en voz alta: tiene que durar hasta unos 40 segundos. La duración real se mide cuando esté la voz, en la Fase 3.
- [ ] **Lenguaje:** voseo rioplatense, tono cálido, frases cortas y sin tecnicismos.
- [ ] **Género neutro** cuando se le habla a la persona, porque no sabemos con quién estamos hablando.
- [ ] **Sin datos sensibles:** ni el ejemplo ni el desafío llevan a compartir claves, códigos, documentos, cuentas o salud propia.
- [ ] **Sin consejos médicos, legales o financieros concretos.** Siempre deriva al profesional.
- [ ] **Es correcto** (ver abajo).
- [ ] Al aprobarla, cambiá `revision: borrador` por `revision: aprobada`.

## Puntos para verificar en un celular real

Escribimos estas lecciones sin poder comprobarlo en todos los teléfonos. Conviene probarlos con un Android y un iPhone:

- **Lección 2:** que Meta AI aparezca en WhatsApp como un círculo azul y que no haga falta instalar nada. Es lo que dice nuestro informe, pero puede variar por versión.
- **Lección 7:** que el micrófono de dictado esté en el teclado y funcione dentro de la IA.
- **Lección 9:** que la IA recuerde lo conversado dentro de una misma charla.
- **Lecciones 3 y 10:** que los consejos antiestafas coincidan con lo que recomiendan fuentes oficiales, como ANSES y los bancos.

También falta validar el lenguaje y la duración con personas mayores, como prevé la actividad 1.2.1 del informe.

## Feriados

[`feriados.yaml`](feriados.yaml) lista los días sin lección. Hay que completarlo con los trasladables y confirmarlo en argentina.gob.ar cuando se fije la fecha del piloto.
