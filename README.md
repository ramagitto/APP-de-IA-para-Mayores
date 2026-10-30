# Charlá

Charlá enseña a personas de 65 años o más a usar la inteligencia artificial para resolver cosas del día a día, con lecciones cortas por WhatsApp. No hace falta instalar ninguna app. Es un MVP para un piloto de 30 personas, desarrollado en la materia Dirección de Proyectos Informáticos (Ingeniería en Informática, USAL).

**Estado:** Fase 1. Ya se puede recorrer una lección por consola, con un tutor simulado. Todavía no hay IA real ni integración con WhatsApp.

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

## Probar una lección

Esto no necesita Docker ni base de datos:

```bash
npm run lesson:play
npm run lesson:play -- n1-l01
npm run lesson:play -- n1-l01 --recordatorio
```

## Comandos

| Comando                    | Qué hace                                                 |
| -------------------------- | -------------------------------------------------------- |
| `npm run dev`              | Levanta todo el entorno local y reinicia al guardar      |
| `npm test`                 | Corre los tests unitarios                                |
| `npm run test:integration` | Corre los tests contra Postgres (necesita la base local) |
| `npm run check`            | Corre formato, lint, tipos, tests unitarios y build      |
| `npm run lessons:check`    | Valida las lecciones y los feriados                      |
| `npm run lesson:play`      | Recorre una lección por consola                          |
| `npm run db:generate`      | Crea una migración a partir de los cambios en el esquema |
| `npm run db:migrate`       | Aplica las migraciones pendientes                        |
| `npm run db:seed`          | Carga datos de prueba, con teléfonos inventados          |
| `npm run format`           | Corrige el formato del código                            |
| `npm run build`            | Compila a `dist/`                                        |
| `npm start`                | Arranca la versión compilada                             |
| `docker compose down`      | Apaga Postgres (agregá `-v` para borrar sus datos)       |

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

- [Arquitectura y modelo de datos](docs/arquitectura.md)
- [WhatsApp: reglas, tarifas y costos](docs/whatsapp-y-costos.md)
- [Checklist del trámite de Meta](docs/tramite-meta.md)
- [Cómo editar y revisar las lecciones](content/README.md)
- [Registro de horas](docs/horas.md)
- [Decisiones de arquitectura (ADR)](docs/adr/)
- [Convenciones del proyecto](CLAUDE.md)
- [Historial de cambios](CHANGELOG.md)
