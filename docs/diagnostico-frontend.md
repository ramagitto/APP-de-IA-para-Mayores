# Diagnóstico del frontend del piloto web

Revisión de la app web (`/p/<token>`) del 12/11/2026, antes del rediseño. Se recorrió la app completa en local, con Chrome en vista de iPhone (390 × 844) en modo claro y oscuro: bienvenida, consentimiento, lección, respuesta del tutor, desafío, cierre y menú. También se leyó el código de [web-page.ts](../src/modules/web/web-page.ts), [charla.css](../public/charla.css) y [charla.js](../public/charla.js).

**Todavía no hay código nuevo.** Primero se acuerda el diagnóstico, después el mini plan, y recién con el OK se programa.

## Lo que está bien y hay que conservar

- **Accesibilidad de base:** letra de 22 px con tres tamaños, contraste alto, botones de 64 px o más, foco visible, `aria-live` en el chat y respeto por "reducir movimiento".
- **Pocas decisiones por paso:** en cada momento aparecen solo los botones que corresponden.
- **Lo técnico difícil ya resuelto:** micrófono en Android y en iPhone, audio en Safari, servidor que se despierta, errores con mensajes claros y en voseo.
- **Sin frameworks:** tres archivos chicos y fáciles de cambiar ([ADR 0011](adr/0011-piloto-web.md)).

El problema no es la base técnica. El problema es que **la app parece un chat genérico y no un curso**, y en varios momentos la persona no sabe qué tiene que hacer.

## Problemas, de más grave a menos grave

### 1. Los textos hablan de WhatsApp, no de la web (grave)

El consentimiento dice "tocá **ACEPTO**", "tocá **NO**", "tocá **BAJA**" y "tocá **AYUDA**", pero en pantalla los botones dicen "Acepto" y "No, gracias". "BAJA" y "AYUDA" no existen: están en el menú, con otros nombres ("Dejar el curso y borrar mis datos", "Pedir ayuda a una persona"). Una persona mayor va a buscar un botón que no está.

_Dónde:_ [consentimiento-web.yaml](../content/consentimiento-web.yaml) y los mensajes del alta. Es contenido, no diseño, pero bloquea el piloto.

### 2. Los mensajes largos se leen desde el final (grave)

Cada mensaje nuevo hace bajar la pantalla hasta su **final**. En el consentimiento y en la intro de la lección, la persona ve las últimas líneas y tiene que subir para empezar a leer. Muchas personas mayores no saben que se puede deslizar hacia arriba.

_Dónde:_ `scrollToEnd` en `charla.js`.

### 3. Demasiados controles juntos en el desafío (grave)

En el paso del desafío aparecen a la vez "Sí, lo hice", "Todavía no pude", el micrófono, "Escribí tu mensaje" y "Enviar": cinco cosas, y la zona de abajo ocupa **más de la mitad de la pantalla**. El mensaje que hay que leer queda en una franja chica. Además, si la persona escribe cualquier cosa en vez de tocar un botón, la lección se cierra igual, sin que quede claro por qué.

### 4. No se siente un curso (importante)

- No se ve en qué lección está la persona ni cuántas faltan. "Lección 1: Qué es una IA" aparece una sola vez, como texto gris arriba del botón.
- La racha es chiquita ("⭐ 1 lección") y está en el encabezado.
- Terminar la lección no tiene festejo: aparece un texto gris abajo ("Ya hiciste la lección de hoy").
- Todo es una sola conversación infinita. Al día siguiente la persona ve el historial de ayer mezclado con lo nuevo.

Para la retención a 14 días, que es la métrica principal, el progreso visible y el cierre con festejo importan mucho.

### 5. Primera pantalla vacía y poco confiable (importante)

La bienvenida es una burbuja ("Tocá el botón verde para empezar") y el resto de la pantalla en blanco. No dice qué es Charlá, quién la hace, que es gratis ni que es segura. Es la primera impresión de alguien que recibió un link por WhatsApp y tiene miedo de las estafas.

### 6. Todo pesa lo mismo visualmente (importante)

- Todas las burbujas tienen el mismo borde gris grueso. La lección, el desafío, la respuesta del tutor y los mensajes de sistema se ven iguales. Solo los distingue una etiqueta chica ("Lección", "Desafío", "Charlá").
- Dice "Charlá" arriba de cada burbuja: es ruido.
- Los párrafos largos no tienen separación entre sí: el consentimiento es un bloque de texto.
- Los íconos son emojis (🎤, 🔊, ⭐) y se ven distintos en cada celular. En Windows, el micrófono sale violeta.

### 7. El modo oscuro es chillón (menor)

El encabezado y el micrófono pasan a verde menta brillante. Se lee bien, pero encandila y no parece la misma app.

### 8. Detalles (menor)

- "Charlá está pensando…" es un texto en cursiva. Una animación simple, como tres puntitos, se entiende mejor.
- El menú empuja el contenido hacia abajo en lugar de abrirse encima.
- "Cambiar el tamaño de la letra" va pasando entre tres tamaños sin mostrar cuál está elegido.
- El botón "Escuchar" va arriba del texto y es tan grande como un botón de acción.

## Hacia dónde ir (propuesta para discutir)

1. **Que parezca un curso, no un chat.** Un inicio con la lección del día como tarjeta: "Lección 3 de 10", el título, la duración ("3 minutos") y un botón grande "Empezar". Abajo, el progreso: lecciones hechas y racha.
2. **Una lección = una pantalla.** Al empezar, la pantalla muestra solo esa lección. Al terminar, una pantalla de festejo con el progreso, y de vuelta al inicio. Ayer no se mezcla con hoy.
3. **Los mensajes nuevos se ven desde el principio.** La pantalla baja hasta el comienzo del mensaje, no hasta el final.
4. **Un solo control principal por paso.** En el desafío, los dos botones primero. Hablar o escribir, como opción secundaria.
5. **Jerarquía clara:** la lección y el desafío como tarjetas destacadas; las respuestas del tutor, como burbujas; el cuidado, en amarillo como ahora.
6. **Íconos SVG propios** en vez de emojis, y un modo oscuro más sobrio.
7. **Bienvenida con confianza:** qué es, que es gratis, que nunca pide claves ni datos, y quién está detrás (sin nombres: la universidad o la cátedra).
8. **Arreglar los textos** del consentimiento y del alta para la web. Esto lo tiene que aprobar contenidos.

Todo esto entra en el stack actual: HTML, CSS y JavaScript sin frameworks. Puede hacer falta que el servidor mande algo más de información al navegador, como el número de lecciones totales, pero el motor de lecciones no cambia.

## Preguntas para el equipo antes del plan

1. **¿Inicio con tarjeta (punto 1) o seguimos con un chat mejorado?** Es la decisión que más cambia las horas.
2. **¿Hay identidad visual** (logo, colores, tipografía) o la definimos ahora?
3. **¿Alguien del grupo puede probar un prototipo con 2 o 3 personas mayores** antes de programarlo todo?
4. **¿Para cuándo tiene que estar?** Es lo que define si se hace todo o solo los problemas graves (1 a 3).

## Cómo reproducir esta revisión

```bash
npm run dev
npm run pilot -- crear 1    # abrir el link en Chrome, F12, vista de celular
```
