# Cómo seguir desde otra PC

Guía para retomar el proyecto en una computadora nueva, con Windows. Estado al 1/11/2026.

## Dónde quedamos

- **Fase 0:** terminada y en `main`.
- **Fase 1:** terminada en lo técnico, en la rama `feat/fase-1-dominio`. El [PR #2](https://github.com/ramagitto/APP-de-IA-para-Mayores/pull/2) está abierto, con la CI en verde, **sin mergear**.
- **Las 10 lecciones están en `borrador`.** Falta la revisión del rol de contenidos, que es parte del criterio de aceptación de la Fase 1.

## 1. Preparar la PC

Instalá lo que falte. En una terminal común:

```powershell
winget install -e --id OpenJS.NodeJS.LTS
winget install -e --id Git.Git
winget install -e --id GitHub.cli
winget install -e --id Docker.DockerDesktop
```

Docker Desktop necesita WSL. **Abrí una terminal como administrador** y corré:

```powershell
wsl --install --no-distribution
```

Después:

1. **Reiniciá la PC.**
2. Abrí Docker Desktop, aceptá los términos y esperá a que indique que está corriendo.
3. Comprobá que Node sea la versión 24 o superior, con `node --version`.

## 2. Bajar el proyecto

```bash
gh auth login -s workflow
git clone https://github.com/ramagitto/APP-de-IA-para-Mayores.git
cd APP-de-IA-para-Mayores
git switch feat/fase-1-dominio
npm install
```

**El permiso `workflow` es necesario:** sin él, GitHub rechaza cualquier push que toque la CI. Si ya tenías `gh` iniciado, corré `gh auth refresh -h github.com -s workflow`.

Si el PR #2 ya está mergeado, quedate en `main` y no hagas el `git switch`.

## 3. Comprobar que anda

```bash
npm run check
npm run lesson:play -- n1-l01
npm run dev
```

Con `npm run dev` corriendo, abrí <http://localhost:3000/health>. Tiene que responder `{"status":"ok","database":"ok"}`. En otra terminal:

```bash
npm run test:integration
```

Tienen que pasar los 175 tests unitarios y los 13 de integración, según lo verificado al 30/10/2026.

## 4. Retomar con Claude Code

La memoria de Claude Code queda en la PC anterior, pero lo importante está en el repositorio: `CLAUDE.md` se carga solo. Abrí Claude Code en la carpeta del proyecto y pegá esto:

```text
Sigo el proyecto Charlá desde otra PC. Leé docs/continuar-en-otra-pc.md y docs/plan-de-fases.md,
revisá el estado del repo y del PR #2, y decime dónde estamos y qué necesitás de mí.
Todavía no empieces la Fase 2: se trabaja por fases y cada una necesita mi OK.
```

## Qué no está en GitHub

| Qué                      | Qué hacer                                                                   |
| ------------------------ | --------------------------------------------------------------------------- |
| `.env`                   | `npm run dev` lo crea solo. Por ahora no tiene ningún secreto real          |
| Base de datos local      | Solo tiene datos de prueba. Se recrea con `npm run dev` y `npm run db:seed` |
| Claves de IA y de Meta   | Todavía no existen. Se cargan en el `.env` cuando lleguen esas fases        |
| Informe de mercado (PDF) | No está en el repositorio. Llevate una copia. Lo clave ya está en `docs/`   |
| Conversación con Claude  | No se traslada. Sus decisiones están en los ADR y en el plan de fases       |

**Si en la PC anterior hay algo sin subir,** en la carpeta del proyecto, `git status` lo muestra. Lo único que quedó ahí a propósito es el `.env`.

## Qué falta decidir o hacer

**Para cerrar la Fase 1:**

1. **Mergear el PR #2.** Espera tu OK. Recomiendo mergear aunque falte la revisión de lecciones: el código ya pasó la CI y las correcciones de contenido pueden ir en otro PR. La fase queda abierta hasta que las lecciones estén aprobadas.
2. **Revisar las 10 lecciones.** Le toca al rol de contenidos, con la guía de [`content/README.md`](../content/README.md). Incluye probar en un Android y un iPhone que Meta AI aparezca como se describe.
3. **Anotar las horas reales** en [`horas.md`](horas.md), para comparar con las 24 horas estimadas de la Fase 1. Es la primera medición real del plan: si te lleva mucho más, hay que recortar de nuevo.

**Antes de la Fase 4:**

4. **Arrancar en diciembre el [trámite de Meta](tramite-meta.md).** Alguien del grupo lo puede llevar sin programar.
5. **Definir, fuera del repositorio,** quién es el titular de la cuenta de Meta y quién atiende `AYUDA`. El repositorio es público: esos nombres no van acá.

**Antes del piloto:**

6. **Completar los feriados** en [`content/feriados.yaml`](../content/feriados.yaml) cuando se publique el calendario oficial de 2027.
7. **Recalcular el VAN** con los [costos de mensajería](whatsapp-y-costos.md): se llevan entre el 74% y el 86% de la suscripción hipotética de $5.000.
8. **Pedir una revisión legal** del consentimiento y de la Ley 25.326.
9. **Corregir el PDF:** la página 3 dice "300 usuarios piloto", y las 300 personas son de la encuesta.

## Deuda técnica conocida

- `npm audit` marca 4 vulnerabilidades moderadas en dependencias de desarrollo, que entraron con `drizzle-kit`. El código de producción da 0. Revisarlas al actualizar.
- TypeScript queda en la 6.0, porque `typescript-eslint` no soporta la 7.
- El clasificador de "pude / no pude" usa reglas simples. Revisarlo con datos reales.
- El recorrido por consola usa un tutor simulado, que solo mira el largo del pedido. Se reemplaza en la Fase 2.
- Los guiones duran unos 25 segundos, según una estimación por caracteres. Se miden con la voz en la Fase 3.

## Problemas que ya vimos

| Síntoma                                                     | Solución                                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `refusing to allow an OAuth App ... without workflow scope` | `gh auth refresh -h github.com -s workflow`, terminando el paso en el navegador |
| `npm run dev` dice que no pudo levantar Postgres            | Abrí Docker Desktop y esperá a que esté corriendo                               |
| `failed to connect to the docker API`                       | Lo mismo: el programa está instalado, pero el motor no arrancó                  |
| `wsl --install` falla por permisos                          | Corrélo en una terminal abierta como administrador, y reiniciá                  |
| `docker` no se reconoce como comando                        | Cerrá y volvé a abrir la terminal, o reiniciá la PC                             |
