import type { LlmProvider, ProviderResult, TutorPrompt } from './llm-provider.js';

const MIN_WORDS_FOR_CLEAR_REQUEST = 6;

// Unos 4 caracteres por token en español. Alcanza para estimar costos sin llamar a ninguna API.
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Proveedor simulado: responde por reglas y estima los tokens que gastaría uno real.
// Se usa por defecto, en los tests y en la CI. No gasta plata ni necesita una clave.
export class MockLlmProvider implements LlmProvider {
  readonly name = 'mock';
  readonly model = 'mock';
  private readonly cachedSystems = new Set<string>();

  async generateReview(prompt: TutorPrompt): Promise<ProviderResult> {
    const { userText, retryAllowed, improvedExample } = prompt.hints;
    const words = userText.trim().split(/\s+/).filter(Boolean).length;
    const example = `"${improvedExample}"`;

    const review =
      words >= MIN_WORDS_FOR_CLEAR_REQUEST
        ? {
            outcome: 'good' as const,
            feedback: `¡Muy bien! Se entiende lo que pedís. Para que quede todavía más claro, podés decir: ${example}`,
          }
        : retryAllowed
          ? {
              outcome: 'needs_retry' as const,
              feedback: `Buen comienzo. Sumale un poco más de detalle, por ejemplo: ${example}. ¿Probás de nuevo?`,
            }
          : {
              outcome: 'good' as const,
              feedback: `Buen comienzo. Con un poco más de detalle queda mejor, por ejemplo: ${example}`,
            };

    // Simula el caché: la primera vez se escribe el prompt fijo; las siguientes se lee.
    const systemTokens = estimateTokens(prompt.system);
    const cached = this.cachedSystems.has(prompt.system);
    this.cachedSystems.add(prompt.system);

    return {
      status: 'ok',
      review,
      usage: {
        inputTokens: estimateTokens(prompt.user),
        outputTokens: estimateTokens(review.feedback) + 10,
        cacheReadTokens: cached ? systemTokens : 0,
        cacheWriteTokens: cached ? 0 : systemTokens,
      },
    };
  }
}
