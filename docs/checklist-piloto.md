# Checklist de salida para el piloto

El piloto va **por la web**, con un link personal para cada persona ([ADR 0011](adr/0011-piloto-web.md)). La app se publica gratis en Render, con la base en Neon ([ADR 0012](adr/0012-hosting-gratis-render-y-neon.md)). WhatsApp Business queda para después: sus pasos están al final.

Lo marcado como _(supuesto)_ no lo pude confirmar en la documentación oficial: los nombres de los menús cambian seguido. Todo lo demás se consultó entre el 10 y el 12/11/2026.

**Orden recomendado:** 1, publicar la app (sección 2); 2, probarla en celulares con proveedores simulados, que no gastan (sección 3); 3, cargar las claves con tope de gasto (sección 4); 4, cerrar lo de la sección 1 y dar los links.

## Estado de la publicación (12/11/2026)

La app está publicada **gratis**, con proveedores simulados: se usa escribiendo, con todos los botones, pero todavía sin micrófono ni tutor con IA real. La publicó Claude con autorización para crear recursos gratuitos; no se usó nada pago.

| Pieza                  | Estado                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base de datos (Neon)   | ✅ Proyecto `charla-piloto`, plan Free, región `aws-us-east-1` (no hay región en Sudamérica). Conexión directa, sin pooler, con `sslmode=verify-full`. Migraciones aplicadas |
| Servidor (Render)      | ✅ Servicio `charla-piloto`, plan Free, región Virginia, en <https://charla-piloto.onrender.com>. `/ping` y `/health` responden 200                                          |
| Participante de prueba | ✅ P00 creado. Su link quedó solo en la PC, en `var/link-p00.txt` (fuera del repositorio). También sale con `npm run pilot -- listar`                                        |
| Voz de Charlá (Azure)  | ❌ No se creó: la cuenta de Azure no tiene suscripción, y activarla pide tarjeta. Charlá habla con la voz del celular (`TTS_PROVIDER=mock`)                                  |
| Tutor (Anthropic)      | ⏸️ Sin clave: hace falta cargar crédito, que es pago. El tutor responde por reglas (`LLM_PROVIDER=mock`)                                                                     |
| Micrófono (OpenAI)     | ⏸️ Sin clave, por lo mismo. Sin ella, en producción la app funciona solo con texto (`STT_PROVIDER=mock`)                                                                     |
| Secretos               | En `.env.produccion` de la PC que publicó (Git lo ignora) y en las variables del servicio en Render. Ninguno en el repositorio                                               |

**Diferencias con la sección 2:**

- **El servicio se creó con la API de Render, no con el blueprint.** Usa la URL pública del repositorio, sin conectar GitHub, así que **no se despliega solo** cuando cambia `main`. Para publicar cambios: en el panel de Render, **Manual Deploy > Deploy latest commit**.
- Las variables son las de `.env.example` con valores de producción, salvo `PORT`, que la asigna Render.

**Pendiente:**

1. [ ] **Anular la clave de API de Render** que se usó para publicar (pasó por el chat): en **Account Settings > API Keys**, borrarla y, si hace falta, crear otra. El servicio sigue funcionando sin ella.
2. [ ] Probar el link de P00 en un Android y un iPhone (sección 3).
3. [ ] Si se decide pagar la IA: cargar crédito con tope en Anthropic y OpenAI (sección 4), agregar en **Environment** del servicio `LLM_PROVIDER=anthropic` con `ANTHROPIC_API_KEY`, y `STT_PROVIDER=openai` con `OPENAI_API_KEY`, y guardar con nuevo despliegue. Con eso aparece el micrófono.

## 1. Antes de dar el primer link

### Seguridad de las personas

- [ ] **Reverificar las líneas de ayuda** de [`content/lineas-de-ayuda.yaml`](../content/lineas-de-ayuda.yaml): llamar o consultar cada fuente, confirmar el número y actualizar la fecha de `verificado`. `npm run lessons:check` avisa si pasaron más de 90 días.
- [ ] **Revisar los mensajes de cuidado** (`src/modules/safety/safety-messages.ts`) con el equipo y con una persona con formación en psicología. Después, cambiar `CARE_MESSAGES_REVIEW` a `'revisado'`.
- [ ] **Definir quién atiende `AYUDA`** y los mensajes de cuidado, y cada cuánto corre `npm run support -- listar` (por lo menos dos veces por día de lección). La persona espera que le escriban por WhatsApp.
- [ ] **Correr las evals con el proveedor real** (sección 4): las categorías críticas tienen que dar 100%.
- [ ] **Probar la voz real** con audios de personas mayores: que `gpt-transcribe` entienda el habla rioplatense y que la voz de Azure suene bien.

### Contenido

- [ ] Revisar y aprobar las 10 lecciones (`revision: aprobada`).
- [ ] Revisar los textos de los recordatorios ([`content/recordatorios-web.yaml`](../content/recordatorios-web.yaml)).
- [ ] Completar [`content/feriados.yaml`](../content/feriados.yaml) con el calendario oficial de 2027, si el piloto llega a 2027.

### Legal y privacidad

- [ ] Revisión legal del consentimiento web ([`content/consentimiento-web.yaml`](../content/consentimiento-web.yaml), en borrador) y del cumplimiento de la Ley 25.326. Después, cambiar `revision: borrador` por `aprobada` y subir la `version`.
- [ ] Confirmar en la revisión legal que los eventos de métricas pueden quedar, sin relación con nadie, después de la BAJA (decisión 60).
- [ ] Publicar una política de privacidad completa, con los derechos de acceso, rectificación y supresión y el rol de la Agencia de Acceso a la Información Pública como órgano de control. Sumar el link al consentimiento.

### Equipo

- [ ] **Planilla privada** con el código de cada participante (P01, P02...), su nombre y su teléfono. **Nunca** en el repositorio ni en la app.
- [ ] Explicarle a cada persona, al darle el link: que es solo suyo, que la primera vez del día puede tardar un minuto en abrir, cómo dejarlo en la pantalla de inicio y que puede tocar "Pedir ayuda" en el menú.

## 2. Publicar la app (gratis)

Necesitás una cuenta de GitHub con acceso al repositorio y unos 30 minutos. **No hace falta tarjeta** _(supuesto: ni Render ni Neon lo aclaran para el plan gratis)_.

### 2.1 Crear la base en Neon

1. [ ] Crear una cuenta en <https://neon.com>, en el plan **Free**.
2. [ ] Crear un proyecto llamado `charla`, en la región **AWS US East (N. Virginia)**, la misma zona que el servidor _(supuesto: el nombre exacto de la región en el menú)_.
3. [ ] En **Connect**, copiar la cadena de conexión **directa**, sin "connection pooling" _(supuesto: el nombre de la opción)_. Tiene que empezar con `postgresql://` y terminar con `?sslmode=require`. **Es un secreto.**

### 2.2 Generar las claves de cifrado

En tu PC, correr dos veces y guardar cada resultado (son distintos):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

- La primera es `PHONE_ENCRYPTION_KEY` y la segunda, `PHONE_HASH_KEY`.
- **Guardalas en un gestor de contraseñas.** Sin `PHONE_ENCRYPTION_KEY` no se pueden volver a armar los links.

### 2.3 Crear el servidor en Render

1. [ ] Crear una cuenta en <https://render.com> y conectar GitHub, dándole acceso **solo** a este repositorio.
2. [ ] **New > Blueprint**, elegir el repositorio y la rama `main`. Render lee [`render.yaml`](../render.yaml) y propone el servicio `charla`, plan Free, región Virginia.
3. [ ] Completar las cuatro variables que pide:
   - `DATABASE_URL`: la cadena de Neon (2.1).
   - `PHONE_ENCRYPTION_KEY` y `PHONE_HASH_KEY`: las de 2.2.
   - `PUBLIC_BASE_URL`: por ahora, `https://charla.onrender.com`. Se corrige en el paso 5.
4. [ ] Crear y esperar el despliegue (unos 5 minutos). En los logs tiene que aparecer "Migraciones aplicadas." y después el servidor escuchando.
5. [ ] Copiar la dirección real del servicio (arriba, en el panel; puede tener un sufijo, como `charla-ab12.onrender.com`). En **Environment**, poner esa dirección en `PUBLIC_BASE_URL`, sin barra al final, y guardar con nuevo despliegue.
6. [ ] Abrir `https://<dirección>/health`. Tiene que responder `{"status":"ok","database":"ok"}`.
7. [ ] _(Supuesto)_ En **Settings > Build & Deploy**, elegir que el despliegue automático espere a que pase la CI ("After CI checks pass"), si la opción existe.

### 2.4 Preparar tu PC para los comandos del piloto

Los comandos (`pilot`, `metrics`, `support`) corren en tu PC, conectados a la base de Neon.

1. [ ] En la carpeta del proyecto, crear `.env.produccion` (Git lo ignora):

   ```bash
   APP_ENV=production
   DATABASE_URL=la-cadena-de-neon
   PHONE_ENCRYPTION_KEY=la-misma-de-render
   PHONE_HASH_KEY=la-misma-de-render
   PUBLIC_BASE_URL=https://la-direccion-de-render
   ```

2. [ ] Crear los primeros links. En PowerShell:

   ```powershell
   $env:CHARLA_ENV_FILE = ".env.produccion"
   npm run pilot -- crear 3
   ```

   En Git Bash: `CHARLA_ENV_FILE=.env.produccion npm run pilot -- crear 3`. Mientras esté puesta la variable, todos los comandos van contra producción. Para volver a local, cerrá la terminal.

## 3. Probar en celulares reales

Con los proveedores simulados, la app funciona solo con texto (el micrófono aparece cuando se carga la clave de OpenAI). Hacé esta prueba en **un Android con Chrome y un iPhone con Safari**, con links de prueba, y repetí la parte del micrófono después de la sección 4.

- [ ] Abrir el link: aparece el saludo y el botón **Empezar**. La letra se lee sin anteojos de cerca.
- [ ] **Empezar**, leer el consentimiento y tocar **Acepto**.
- [ ] **Empezar la lección de hoy**: aparece la intro con el botón **Escuchar**, y suena (con el iPhone en modo silencio también).
- [ ] **Micrófono** (con la clave de OpenAI): al primer toque pide permiso; hablar 5 segundos y tocar para enviar; aparece lo que entendió. Probar también rechazando el permiso: tienen que aparecer las instrucciones.
- [ ] **Prefiero escribir**: mandar la práctica escrita.
- [ ] Desafío: **Sí, lo hice**. Aparece la racha arriba.
- [ ] **Menú > Cambiar el tamaño de la letra**, dos veces.
- [ ] **Menú > Dejar Charlá en la pantalla de inicio**: seguir las instrucciones, abrir desde el ícono y comprobar que sigue la misma persona.
- [ ] **Menú > Pedir ayuda**: verlo con `npm run support -- listar` (dice "Web: P0X").
- [ ] Esperar 20 minutos sin usar y volver a abrir: tiene que avisar "Charlá se está despertando" y responder en menos de un minuto y medio.
- [ ] **Menú > Dejar el curso** con un link de prueba: el link deja de funcionar y `npm run pilot -- listar` lo muestra dado de baja.

Si algo falla en un modelo de celular, anotá el modelo y la versión del sistema.

## 4. Cargar las claves de IA con tope de gasto

Cada clave es un **secreto**: va solo en Render (y en tu `.env` si querés probar en local), nunca en el repositorio. Además de los topes de cada proveedor, Charlá tiene los suyos:

- **Tutor y voz de Azure:** USD 0,01 por persona y por día (`TUTOR_DAILY_BUDGET_USD`). Al pasarlo, el tutor responde por reglas y los mensajes salen sin audio. Con 30 personas, el peor caso es USD 0,30 por día.
- **Voz a texto:** no tiene tope por persona, porque cortarla dejaría a alguien sin poder hablar a mitad de la lección. La limitan los audios de 2 minutos como máximo, los 20 mensajes por minuto y el tope duro de OpenAI. A USD 0,0045 por minuto, un minuto de audio por lección y 30 personas son unos USD 0,14 por día.

### 4.1 Anthropic (tutor)

1. [ ] Crear una cuenta en <https://platform.claude.com> (la consola de Anthropic) y una organización para Charlá.
2. [ ] Cargar el crédito mínimo, **sin recarga automática** _(supuesto: el uso de la API se paga por adelantado con créditos; confirmalo en Billing)_.
3. [ ] Poner un **tope mensual** de USD 5 en la configuración de la organización, en Billing > Spend limits _(supuesto: ubicación según una guía de terceros; la referencia oficial confirma que existen topes mensuales por organización y por espacio de trabajo)_.
4. [ ] Crear una clave de API y copiarla.

### 4.2 OpenAI (voz a texto: hace falta para el micrófono)

1. [ ] Crear una cuenta en <https://platform.openai.com> y un **proyecto** llamado `charla-piloto`.
2. [ ] En **Project settings > Limits > Spend > Edit spend limit**, poner USD 5 y activar **Enforce a hard limit**. Sin activarlo, es solo un aviso. Al llegar al tope, la API responde con error y Charlá le pide a la persona que escriba.
3. [ ] Cargar crédito y crear una clave de API **del proyecto**.

### 4.3 Azure (voz de Charlá, opcional)

Sin Azure, la app lee las respuestas con la voz del celular, que suena menos natural.

1. [ ] Crear una cuenta en <https://portal.azure.com> _(supuesto: Azure pide tarjeta para crear la cuenta)_.
2. [ ] Crear un recurso **Speech** con el plan de precios **Free F0** (0,5 millones de caracteres por mes de voz neuronal). El plan gratuito no cobra: al pasar el límite deja de responder hasta el mes siguiente, y Charlá manda el texto sin audio.
3. [ ] Copiar la **Key 1** y la **región** (por ejemplo, `eastus`).

### 4.4 Activarlas en Render

En **Environment** del servicio, agregar y guardar con nuevo despliegue:

| Variable              | Valor              |
| --------------------- | ------------------ |
| `LLM_PROVIDER`        | `anthropic`        |
| `ANTHROPIC_API_KEY`   | la clave de 4.1    |
| `STT_PROVIDER`        | `openai`           |
| `OPENAI_API_KEY`      | la clave de 4.2    |
| `TTS_PROVIDER`        | `azure` (opcional) |
| `AZURE_SPEECH_KEY`    | la clave de 4.3    |
| `AZURE_SPEECH_REGION` | la región de 4.3   |

Si falta una clave para el proveedor elegido, el servidor no arranca y el log dice cuál falta (sin mostrar ningún valor).

### 4.5 Comprobar

- [ ] En tu PC, con `LLM_PROVIDER=anthropic` y la clave en tu `.env` (no en `.env.produccion`), correr `npm run evals`: las críticas tienen que dar 100%.
- [ ] Repetir la prueba del micrófono de la sección 3 en los dos celulares.
- [ ] Al día siguiente, revisar el gasto en cada consola.

## 5. Durante el piloto

**Cada día de lección** (lunes a viernes, salvo feriados):

1. [ ] `npm run pilot -- recordatorios` (con `CHARLA_ENV_FILE=.env.produccion`). Despierta el servidor y arma un texto por persona, con su link. No incluye a quien ya hizo la lección ni a quien se dio de baja.
2. [ ] Copiar cada texto y mandarlo por WhatsApp común al teléfono de la planilla. También queda en `var/recordatorios/`.
3. [ ] Dos veces por día, `npm run support -- listar`. Escribirle por WhatsApp a quien pidió ayuda y después `npm run support -- cerrar <id>`. Los mensajes de cuidado son prioridad.

**Otros comandos:**

| Comando                           | Para qué                                                 |
| --------------------------------- | -------------------------------------------------------- |
| `npm run pilot -- listar`         | Estado de cada participante, último ingreso y link       |
| `npm run pilot -- crear 5`        | Más participantes                                        |
| `npm run pilot -- nuevo-link P07` | Si un link se filtró o se perdió: el viejo deja de andar |
| `npm run pilot -- baja P07`       | Si la persona pide la baja por otra vía: borra sus datos |
| `npm run metrics`                 | Indicadores y CSV en `var/metricas/`                     |

**Cada semana:** backup de la base, guardado fuera del repositorio (por ejemplo, en el Drive privado del equipo). La base del piloto no tiene nombres ni teléfonos, pero sí los links cifrados. Con Docker abierto:

```bash
docker run --rm postgres:18-alpine pg_dump "LA-CADENA-DE-NEON" > var/backup-AAAA-MM-DD.sql
```

## 6. Si algo falla

| Qué pasa                                     | Qué hacer                                                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| La app tarda en abrir                        | Es el servidor gratuito despertando: hasta un minuto. Si molesta, pasar a una instancia paga de Render (ADR 0012)           |
| "Este link no funciona"                      | Revisar con `npm run pilot -- listar`. Si la persona no pidió la baja, darle un `nuevo-link`                                |
| No aparece el micrófono                      | Falta `STT_PROVIDER=openai` con su clave, o se llegó al tope de gasto de OpenAI                                             |
| El micrófono no pide permiso o falla         | En el celular, revisar los permisos del sitio. El menú de la app tiene las instrucciones                                    |
| Charlá responde siempre con frases genéricas | Llegó al tope diario de la persona o al tope de Anthropic: el tutor responde por reglas. Revisar el gasto                   |
| `/health` responde 503                       | El servidor no llega a la base: revisar `DATABASE_URL` y el estado de Neon. Neon guarda 6 horas de historial para restaurar |
| Se perdió `PHONE_ENCRYPTION_KEY`             | Los links no se pueden volver a armar: crear links nuevos (`nuevo-link`) para cada persona. El avance se conserva           |

## 7. Para después: WhatsApp Business

Esto quedó listo en la Fase 4 y no se usa en el piloto web. Además de estos pasos, hace falta un servidor que no se duerma (Render pago o Railway, [ADR 0004](adr/0004-hosting-railway.md)), porque Meta manda los webhooks en cualquier momento.

### 7.1 Conectar el número de WhatsApp

**Antes:** el [trámite de Meta](tramite-meta.md) completo (línea, portafolio, nombre visible aprobado y tarjeta) y el servidor publicado con una URL HTTPS, lo que es parte de la Fase 8. Basado en la documentación de Meta consultada el 10/11/2026. Lo marcado como _(supuesto)_ no lo pude confirmar.

1. [ ] **Crear la app de Meta** en el panel de desarrolladores, asociada al portafolio de Charlá, y agregarle WhatsApp. _(Supuesto: los nombres exactos de los menús cambian seguido.)_
2. [ ] **Secreto de la app:** copiarlo de la configuración básica de la app a `WHATSAPP_APP_SECRET`. Con él se verifica la firma de cada webhook. _(Supuesto: la ubicación del secreto en el panel.)_
3. [ ] **Token permanente de un usuario del sistema** (no el token temporal del panel):
   - En la configuración del negocio, crear un usuario del sistema con rol de administrador.
   - Asignarle la app con permiso para administrarla.
   - Darle acceso a la cuenta de WhatsApp **y** a la cuenta de mensajería. Con una sola de las dos no alcanza.
   - Generar el token con los permisos `business_management`, `whatsapp_business_management` y `whatsapp_business_messaging`.
   - Copiarlo a `WHATSAPP_ACCESS_TOKEN`. **Es un secreto: nunca va al repositorio.**
4. [ ] **Id del número:** copiarlo de WhatsApp Manager a `WHATSAPP_PHONE_NUMBER_ID`.
5. [ ] **Registrar el número para la Cloud API** con un PIN de 6 dígitos, que pasa a ser el de la verificación en dos pasos. Hay como máximo 10 intentos cada 72 horas. _(Supuesto: el cuerpo exacto del pedido; confirmalo en la guía de registro antes de correrlo.)_

   ```bash
   curl -X POST "https://graph.facebook.com/v27.0/$WHATSAPP_PHONE_NUMBER_ID/register" \
     -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"messaging_product": "whatsapp", "pin": "PIN_DE_6_DIGITOS"}'
   ```

6. [ ] **Token de verificación:** inventar uno al azar y guardarlo en `WHATSAPP_VERIFY_TOKEN`.

   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```

7. [ ] **Variables en el servidor:** `WHATSAPP_PROVIDER=cloud` más las cuatro anteriores. `WHATSAPP_GRAPH_VERSION` queda en `v27.0`, salvo que Meta indique otra. Reiniciar el servidor: en el log tiene que aparecer "Webhook de WhatsApp (cloud) en /webhooks/whatsapp".
8. [ ] **Configurar el webhook:** en la configuración de WhatsApp de la app, cargar como URL de callback `https://<dominio>/webhooks/whatsapp` y el mismo token de verificación, y guardar. Meta llama al servidor para verificarlo.
9. [ ] **Suscribirse al campo `messages`,** que trae los mensajes entrantes.
10. [ ] **Pasar la app a modo Live.** En modo desarrollo, algunos webhooks no se envían.
11. [ ] **Prueba con un teléfono del equipo:**
    - mandar "hola": tiene que llegar el pedido de consentimiento;
    - responder ACEPTO y hacer una lección completa, con un audio;
    - mandar AYUDA y verlo con `npm run support -- listar`;
    - mandar BAJA y confirmar que no quedan datos.
12. [ ] **Si no llegan mensajes:**
    - en el log, "Webhook con firma inválida" indica un secreto equivocado;
    - si no hay ningún pedido, revisar la URL, el modo Live y la suscripción;
    - _(supuesto)_ confirmar que la cuenta de WhatsApp esté suscripta a la app (endpoint `subscribed_apps` de la referencia de la API).

### 7.2 Meta y costos

- [ ] Completar el [trámite de Meta](tramite-meta.md).
- [ ] Enviar a aprobación las [plantillas](plantillas-whatsapp.md).
- [ ] Revisar las [tarifas de WhatsApp](whatsapp-y-costos.md) y los precios de IA, que pueden cambiar cada trimestre.
- [ ] Recalcular el VAN con los costos medidos.
