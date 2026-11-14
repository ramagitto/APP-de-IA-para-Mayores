# ADR 0014: modo demo para presentaciones

**Estado:** propuesto, 13/11/2026.

## Contexto

En las presentaciones hay que mostrar varias etapas del curso (permiso, lección, desafío, racha y final del nivel) en pocos minutos. El curso real deja hacer una lección por día hábil, así que no se puede mostrar de corrido.

## Decisión

- **Marca por participante, no global.** `web_participants.demo` se fija al crearlo con `npm run pilot -- demo` (códigos D01, D02...). Ninguna ruta la cambia, así que un participante real nunca puede pasar a demo.
- **Router propio para el demo** (`src/composition.ts`). Usa el mismo motor, tutor, voz, capas de seguridad y tope diario. Cambia tres cosas: no anota eventos de métricas, marca su gasto de IA con `usage_costs.demo` y deja hacer varias lecciones por día, también fines de semana y feriados.
- **Atajos en el Menú** (`POST /p/<token>/demo`): ir a cualquier lección del nivel 1, volver a empezar, antiestafas, desafío y racha, progreso simulado y final del nivel. Para un participante real, la ruta responde 404 sin tocar nada. Los atajos no saltean el consentimiento: nadie se crea en `users` sin un ACEPTO.
- **AYUDA, BAJA y los mensajes de cuidado** siguen en el `MessageRouter`, igual que siempre.
- **Lo visible del demo** (el cartel "Modo demo", los atajos y la maqueta de la vista del padrino) solo va en la página de un participante demo.
- **Fuera de las métricas y de los recordatorios.**

## Consecuencias

- Un pedido de AYUDA o un aviso de cuidado del demo aparece en `npm run support -- listar`, porque funciona igual que siempre. Se reconoce por su código D.
- La vista del padrino es una maqueta con datos de ejemplo, no una función construida.
