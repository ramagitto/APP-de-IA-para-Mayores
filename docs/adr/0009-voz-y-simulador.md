# ADR 0009: voz, servicio de conversación y simulador

**Estado:** propuesto, 10/11/2026. Lo tomé sin el OK del equipo, en una sesión autónoma: está anotado en [decisiones-pendientes.md](../decisiones-pendientes.md).

## Contexto

Charlá es "voz primero": la persona puede mandar audios y recibir audios. Además, hace falta un simulador para desarrollar y hacer demos sin depender de Meta. No hay claves de OpenAI ni de Azure, y estaba prohibido crearlas.

## Decisión

**Interfaces de voz con proveedores intercambiables,** como en el tutor:

| Interfaz    | Simulado (por defecto)                  | Real                                             | Variables                                                              |
| ----------- | --------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------- |
| Voz a texto | Usa el texto que reconoció el navegador | OpenAI, `gpt-transcribe`                         | `STT_PROVIDER`, `OPENAI_API_KEY`, `STT_MODEL`                          |
| Texto a voz | No genera audio: lee el navegador       | Azure, `es-AR-ElenaNeural`, nota de voz OGG/Opus | `TTS_PROVIDER`, `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `TTS_VOICE` |

**Cambio de modelo de voz a texto:** el ADR 0003 elegía `gpt-4o-mini-transcribe`, pero OpenAI lo da de baja el 26/2/2027, antes del piloto. Su reemplazo recomendado es `gpt-transcribe`, a unos USD 0,0045 por minuto.

**Servicio de conversación** (`src/modules/conversation/`). Recibe un mensaje de cualquier canal y:

1. transcribe el audio, si lo hay;
2. cuida a la persona si hace falta, haya o no lección en curso;
3. sigue la lección abierta o arranca la próxima, una por día de lección;
4. guarda el intento y la racha;
5. agrega audio a las respuestas.

Es el mismo servicio que va a usar WhatsApp en la Fase 4.

**Cuándo va audio:**

- La intro, siempre.
- El resto de los mensajes, solo si la persona habló.
- Los mensajes de cuidado, siempre en texto, para que los números se puedan leer.

Si no hay audio (proveedor simulado, tope de costo superado o falla), el mensaje sale como texto.

**Privacidad:**

- El audio de la persona solo vive en memoria mientras se transcribe.
- La transcripción no se guarda.
- Solo se guardan los audios que genera Charlá, identificados por voz y texto, para no pagar dos veces el mismo.

**Simulador** (`/simulador`): una página simple, sin frameworks, con letra grande y alto contraste. Permite:

- escribir o hablar;
- escuchar las respuestas;
- pasar al día siguiente;
- empezar de nuevo, lo que borra los datos de esa persona simulada.

**Solo existe con `APP_ENV=local`,** porque no tiene login.

## Alternativas

- **Cola de trabajos ya en esta fase:** el simulador puede esperar la respuesta. La cola entra en la Fase 4, cuando el webhook de WhatsApp tenga que contestar enseguida.
- **Subir el audio como archivo (multipart):** suma una dependencia. Mandarlo en JSON alcanza.
- **Generar audio para todos los mensajes:** más caro, y en WhatsApp cada audio es un mensaje.

## Consecuencias

- Se puede hacer una lección completa hablando y escuchando, sin claves, en Chrome.
- **Con los proveedores simulados, el navegador puede mandar el audio a servicios externos** para reconocerlo. Sirve para demos locales, no para el piloto.
- Los adaptadores de OpenAI y Azure siguen la documentación oficial y tienen tests con respuestas falsas, pero **no se probaron contra las APIs reales.**
- El servicio de conversación todavía no hace el alta con consentimiento: es tarea de la Fase 4.
