import type { TokenUsage } from './llm-provider.js';

interface ModelPrice {
  inputPerMillion: number;
  outputPerMillion: number;
}

// Precios en USD por millón de tokens, para prompts de hasta 100.000 tokens.
// Fuente: documentación de Anthropic, consultada el 10/11/2026. Revisar antes de cada estimación.
export const MODEL_PRICES: Record<string, ModelPrice> = {
  'claude-haiku-5-5': { inputPerMillion: 0.1, outputPerMillion: 0.5 },
};

// Leer del caché cuesta 0,1 veces la entrada; escribirlo por 5 minutos, 1,25 veces.
const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_MULTIPLIER = 1.25;

// El proveedor simulado se cotiza como el modelo inicial, para estimar el costo real.
export const MOCK_PRICE_MODEL = 'claude-haiku-5-5';

export function estimateCostUsd(model: string, usage: TokenUsage): number {
  const price = MODEL_PRICES[model] ?? MODEL_PRICES[MOCK_PRICE_MODEL];
  if (!price) throw new Error(`No hay precio cargado para ${model}`);

  const perToken = price.inputPerMillion / 1_000_000;

  return (
    usage.inputTokens * perToken +
    usage.cacheReadTokens * perToken * CACHE_READ_MULTIPLIER +
    usage.cacheWriteTokens * perToken * CACHE_WRITE_MULTIPLIER +
    (usage.outputTokens * price.outputPerMillion) / 1_000_000
  );
}
