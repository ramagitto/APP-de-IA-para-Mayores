# Charlá

Charlá enseña a personas de 65 años o más a usar la inteligencia artificial para resolver cosas del día a día, con lecciones cortas por WhatsApp. No hace falta instalar ninguna app. Es un MVP para un piloto de 30 personas, desarrollado en la materia Dirección de Proyectos Informáticos (Ingeniería en Informática, USAL).

**Estado:** Fase 4, en revisión. Charlá ya funciona por WhatsApp de punta a punta (alta con consentimiento, lecciones, voz, AYUDA y BAJA), probado con mensajes simulados: falta conectar un número real. También se puede usar desde un simulador web. Por defecto usa proveedores de IA y de voz simulados, que no gastan plata.

## Levantar el proyecto

Necesitás [Node.js 24](https://nodejs.org/) y [Docker Desktop](https://www.docker.com/products/docker-desktop/) abierto.

```bash
npm install
npm run dev
```

`npm run dev` crea el archivo `.env` si no existe, levanta Postgres en Docker, aplica las migraciones y arranca el servidor. Para comprobar que anda, abrí <http://localhost:3000/health>. Tiene que responder:

```json
{ "status": "ok", "database": "ok" }
```

Si responde `503`, el servidor anda pero no llega a la base: revisá que Docker esté abierto.

## Probar en el simulador

Con `npm run dev` corriendo, abrí <http://localhost:3000/simulador> en **Chrome**. Escribí cualquier cosa para arrancar la lección, o tocá **🎤 Hablar**. Para probar la lección siguiente, tocá **Pasar al día siguiente**.

Con los proveedores de voz simulados, el navegador reconoce y lee la voz. Algunos navegadores mandan el audio a sus servidores para eso, así que úsenlo solo para desarrollo y demos. El simulador solo existe con `APP_ENV=local`.

## Probar WhatsApp sin un número real

Agregá al `.env` estas líneas y volvé a correr `npm run dev`:

```bash
WHATSAPP_PROVIDER=fake
WHATSAPP_APP_SECRET=secreto-solo-local
WHATSAPP_VERIFY_TOKEN=token-solo-local
```

En otra terminal, mandá mensajes como si fueras una persona en WhatsApp:

```bash
npm run whatsapp:simulate -- "hola"
npm run whatsapp:simulate -- "ACEPTO"
```

El script firma el mensaje como lo hace Meta, y muestra las respuestas, que también quedan en `var/whatsapp-salida.jsonl`. Para conectar un número real, seguí la [checklist del piloto](docs/checklist-piloto.md).

## Probar una lección por consola

Esto no necesita Docker ni base de datos:

```bash
npm run lesson:play
npm run lesson:play -- n1-l01
npm run lesson:play -- n1-l01 --recordatorio
```

## Probar el tutor con IA real

Por defecto el tutor usa un proveedor simulado. Para usar Claude, agregá al `.env`:

```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=tu-clave
```

Con eso, `npm run lesson:play` y `npm run evals` usan el modelo real. **Cada llamada cuesta plata**, aunque poco: el tope es de USD 0,01 por persona y por día.

Para la voz real, usá `STT_PROVIDER=openai` con `OPENAI_API_KEY`, y `TTS_PROVIDER=azure` con `AZURE_SPEECH_KEY` y `AZURE_SPEECH_REGION`. Están documentadas en `.env.example`.

## Comandos

| Comando                               | Qué hace                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm run dev`                         | Levanta todo el entorno local y reinicia al guardar                                  |
| `npm test`                            | Corre los tests unitarios                                                            |
| `npm run test:integration`            | Corre los tests contra Postgres (necesita la base local)                             |
| `npm run check`                       | Corre formato, lint, tipos, tests unitarios y build                                  |
| `npm run lessons:check`               | Valida las lecciones y los feriados                                                  |
| `npm run lesson:play`                 | Recorre una lección por consola                                                      |
| `npm run evals`                       | Corre las 43 evals del tutor y mide su costo                                         |
| `npm run whatsapp:simulate -- "hola"` | Manda al webhook local un mensaje de WhatsApp firmado (con `WHATSAPP_PROVIDER=fake`) |
| `npm run support -- listar`           | Lista los pedidos de AYUDA (también `responder` y `cerrar`)                          |
| `npm run db:generate`                 | Crea una migración a partir de los cambios en el esquema                             |
| `npm run db:migrate`                  | Aplica las migraciones pendientes                                                    |
| `npm run db:seed`                     | Carga datos de prueba, con teléfonos inventados                                      |
| `npm run format`                      | Corrige el formato del código                                                        |
| `npm run build`                       | Compila a `dist/`                                                                    |
| `npm start`                           | Arranca la versión compilada                                                         |
| `docker compose down`                 | Apaga Postgres (agregá `-v` para borrar sus datos)                                   |

## Estructura

```text
src/
  app.ts            Arma la aplicación (sin abrir puertos, para poder testearla)
  server.ts         Punto de entrada: conecta todo y escucha
  config/           Lectura y validación de variables de entorno
  modules/          Un módulo por tema del producto
  shared/           Lo que usan varios módulos, como la base de datos
content/            Lecciones en YAML y feriados, editables sin programar
drizzle/            Migraciones de la base de datos
scripts/            Scripts de desarrollo
test/               Datos y preparación compartidos por los tests
docs/               Arquitectura, costos y decisiones (ADR)
```

## Documentación

- [Cómo retomar en otro chat o PC](docs/como-retomar.md)
- [Plan de fases](docs/plan-de-fases.md)
- [Arquitectura y modelo de datos](docs/arquitectura.md)
- [WhatsApp: reglas, tarifas y costos](docs/whatsapp-y-costos.md)
- [Checklist del trámite de Meta](docs/tramite-meta.md)
- [Cómo editar y revisar las lecciones](content/README.md)
- [Registro de horas](docs/horas.md)
- [Decisiones de arquitectura (ADR)](docs/adr/)
- [Convenciones del proyecto](CLAUDE.md)
- [Historial de cambios](CHANGELOG.md)
