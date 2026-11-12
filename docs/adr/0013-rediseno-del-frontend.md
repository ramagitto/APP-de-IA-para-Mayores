# ADR 0013: rediseño del frontend, de chat a curso

**Estado:** propuesto, 12/11/2026. El equipo eligió la estructura, la tipografía y que se reescriban los textos del alta. El diagnóstico previo está en [diagnostico-frontend.md](../diagnostico-frontend.md).

## Contexto

La app web del piloto ([ADR 0011](0011-piloto-web.md)) funcionaba bien, pero parecía un chat genérico y no un curso. Tenía tres problemas graves:

- los textos pedían tocar «ACEPTO», «BAJA» y «AYUDA», que son palabras de WhatsApp y no botones de la web;
- los mensajes largos se veían desde el final;
- en el desafío aparecían cinco controles a la vez.

Además, no se veía el avance ni había un cierre al terminar la lección. Para la retención a 14 días, que es la métrica principal, el progreso visible importa.

## Decisión

1. **Una pantalla por momento del curso**, en lugar de una conversación infinita:
   - **bienvenida:** qué es Charlá, en tres frases, más un botón;
   - **permiso:** el consentimiento en párrafos, con «Escuchar»;
   - **inicio:** la lección del día en una tarjeta («Lección 3 de 10»), el avance y la racha;
   - **lección:** una conversación corta, solo de esa lección, con los pasos «Practicar» y «Desafío»;
   - **festejo** al terminar, con el avance;
   - **despedida.**
2. **Una sola acción principal por paso.** En la práctica, el micrófono, o el teclado como alternativa. En el desafío, solo «Sí, lo hice» y «Todavía no pude».
3. **Los mensajes nuevos se muestran desde su primera línea.**
4. **Identidad de la presentación:** verde petróleo `#0d4d46`, naranja `#f18b38` y gris verdoso `#e6efed`. El logo es una persona que habla, igual que el ícono de la app. Hay modo oscuro.
5. **Tipografía:** Atkinson Hyperlegible para el texto, porque está diseñada para personas con baja visión, y Source Serif 4 para los títulos, como en la presentación. Las dos tienen licencia OFL y **se sirven desde nuestro servidor**, desde los paquetes de `@fontsource`. No se usa Google: la política de seguridad suma solo `font-src 'self'`.
6. **Íconos SVG propios**, al estilo de Lucide, en lugar de emojis.
7. **El servidor manda un poco más:** el avance (`progress`), el número de lección también durante la lección, y el texto del permiso en el estado. Así la pantalla de permiso se puede volver a mostrar después de recargar. El motor de lecciones no cambia.
8. **Textos del alta para la web**, versión `web-v2-borrador`: nombran los botones reales («Acepto», «No, gracias», «Pedir ayuda», «Dejar el curso»). Un test controla que no vuelvan a aparecer las palabras de WhatsApp.

Se mantiene todo lo de antes: HTML, CSS y JavaScript sin frameworks, el micrófono en Android y en iPhone, los tres tamaños de letra y el contraste AA o más.

## Consecuencias

- **El historial del navegador guarda solo la lección en curso.** Lo de días anteriores no se ve más, a propósito.
- **Las fuentes pesan unos 56 KB** y quedan en caché por 30 días.
- **Atkinson Hyperlegible dibuja el cero con una barra** ("0"), para no confundirlo con la "O". Si a las personas les resulta raro, se puede cambiar la fuente de los números.
- **Falta probar el diseño en un Android y en un iPhone reales**, y con 2 o 3 personas mayores.
- **El consentimiento cambió de versión.** Quien ya había aceptado la versión anterior conserva su registro; los textos nuevos siguen en borrador hasta la revisión legal.
