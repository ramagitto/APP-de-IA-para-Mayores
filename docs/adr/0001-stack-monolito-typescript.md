# ADR 0001: monolito modular en TypeScript

**Estado:** aceptado, 30/10/2026.

## Contexto

Un equipo junior y con poco presupuesto tiene que llegar al MVP a fines de marzo de 2027. El producto necesita recibir webhooks, procesar audio en segundo plano, programar envíos y mostrar un panel web chico.

## Decisión

Un solo programa en TypeScript, con Node.js 24 y Fastify, dividido en módulos. Vitest para tests, Playwright y axe para la interfaz, y React con Vite para el simulador y los paneles.

## Alternativas

- **Python (FastAPI, Jinja y HTMX):** muy cómodo para evals y análisis, y una opción válida. Quedó segunda porque obliga a manejar dos mundos si la interfaz crece.
- **Next.js con Supabase:** rápido para el panel y con login casi listo, pero las funciones serverless encajan mal con jobs largos y audio, y hay más "magia" que depurar.
- **Microservicios:** descartados por la especificación y por innecesarios a esta escala.

## Consecuencias

- Un solo lenguaje, y tipos compartidos entre backend e interfaz.
- Armar la interfaz lleva algo más de trabajo que con Next.js.
- Si algún módulo necesitara escalar por separado, los límites entre módulos facilitan extraerlo.
