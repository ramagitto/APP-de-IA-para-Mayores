# ADR 0003: proveedores de IA intercambiables

**Estado:** aceptado como punto de partida, 30/10/2026. El modelo de lenguaje se confirma con las evals de la Fase 2.

## Contexto

El tutor necesita un modelo de lenguaje (LLM), voz a texto (STT) y texto a voz (TTS). Los precios cambian seguido, y el proyecto tiene una meta de menos de ARS 500 por usuario por mes para IA.

## Decisión

Cada capacidad tiene una interfaz propia, con un proveedor inicial:

| Capacidad | Proveedor inicial                               | Precio de referencia                            | Por qué                                                |
| --------- | ----------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------ |
| LLM       | Claude Haiku 5.5                                | USD 0,10 / 0,50 por millón de tokens            | Barato; a comparar en evals                            |
| STT       | OpenAI `gpt-4o-mini-transcribe`                 | USD 0,003 por minuto                            | Barato; a probar con audios reales de personas mayores |
| TTS       | Azure `es-AR-ElenaNeural` o `es-AR-TomasNeural` | Unos USD 16 por millón de caracteres (terceros) | Tiene voces con acento argentino                       |

En la Fase 2 las evals comparan Claude Haiku 5.5 con `gpt-5-nano` y Gemini 2.5 Flash-Lite. Decide el resultado, no la preferencia. Este proyecto se desarrolla con ayuda de un modelo de Anthropic, y por eso la comparación tiene que ser explícita.

## Reglas

- **Nada de planes gratuitos que usen los datos para entrenar.** El de Gemini queda descartado por eso. Además, los términos de Meta prohíben usar datos de la plataforma para entrenar modelos.
- **Tope de costo por usuario y por día, y un fallback** si un proveedor falla.
- **Los audios de cada lección se generan una vez y se reutilizan.**

## Consecuencias

- Cambiar de proveedor toca un solo adaptador.
- Hay que mantener una interfaz propia, aunque hoy tenga un solo proveedor activo.
- El costo del LLM es muy bajo frente a la mensajería: un mensaje de WhatsApp equivale a unos 90 turnos del tutor.
