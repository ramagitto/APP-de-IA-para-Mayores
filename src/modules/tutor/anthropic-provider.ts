import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type { LlmProvider, ProviderResult, TutorPrompt } from './llm-provider.js';

const reviewSchema = z.object({
  outcome: z.enum(['good', 'needs_retry']),
  feedback: z.string(),
});

export interface AnthropicProviderOptions {
  apiKey: string;
  model: string;
  /** Solo para tests: permite usar un cliente falso en lugar del real. */
  client?: Anthropic;
}

// Adaptador para Claude. Todavía no se probó contra la API real: no hay clave cargada.
// Ver docs/decisiones-pendientes.md.
export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  readonly model: string;
  private readonly client: Anthropic;

  constructor(options: AnthropicProviderOptions) {
    this.model = options.model;
    // Un reintento y 15 segundos: si tarda más, conviene usar el respaldo y no hacer esperar.
    this.client =
      options.client ?? new Anthropic({ apiKey: options.apiKey, timeout: 15_000, maxRetries: 1 });
  }

  async generateReview(prompt: TutorPrompt): Promise<ProviderResult> {
    const response = await this.client.messages.parse({
      model: this.model,
      // Incluye el razonamiento del modelo. Un tope bajo podría cortar la respuesta a la mitad.
      max_tokens: 1024,
      // El prompt fijo va primero y marcado para caché: se cobra al 10% cuando se reutiliza.
      system: [{ type: 'text', text: prompt.system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: prompt.user }],
      output_config: { effort: 'low', format: zodOutputFormat(reviewSchema) },
    });

    const usage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
    };

    // Claude Haiku 5.5 puede rechazar un pedido y no tiene respaldo del lado del servidor.
    if (response.stop_reason === 'refusal') return { status: 'refused', usage };

    const parsed = reviewSchema.safeParse(response.parsed_output);
    if (!parsed.success) return { status: 'invalid', usage };

    return { status: 'ok', review: parsed.data, usage };
  }
}
