import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
import { sampleLesson as lesson } from '../../../test/fixtures.js';
import { AnthropicProvider } from './anthropic-provider.js';
import { buildTutorPrompt } from './prompt.js';

// Estos tests usan un cliente falso: verifican cómo armamos el pedido y leemos la respuesta,
// no el comportamiento del modelo. Para eso están las evals con una clave real.
function fakeClient(response: Record<string, unknown>) {
  const requests: Record<string, unknown>[] = [];
  const client = {
    messages: {
      parse: async (request: Record<string, unknown>) => {
        requests.push(request);
        return response;
      },
    },
  } as unknown as Anthropic;

  return { client, requests };
}

const usage = {
  input_tokens: 300,
  output_tokens: 80,
  cache_read_input_tokens: 900,
  cache_creation_input_tokens: null,
};

const prompt = buildTutorPrompt({
  lesson,
  userText: 'Quiero una receta',
  retryAllowed: true,
  risks: new Set(),
});

function provider(response: Record<string, unknown>) {
  const fake = fakeClient(response);
  return {
    ...fake,
    provider: new AnthropicProvider({
      apiKey: 'no-se-usa',
      model: 'claude-haiku-5-5',
      client: fake.client,
    }),
  };
}

describe('AnthropicProvider', () => {
  it('devuelve la devolución y el uso de tokens', async () => {
    const { provider: anthropic } = provider({
      stop_reason: 'end_turn',
      parsed_output: { outcome: 'good', feedback: 'Muy bien.' },
      usage,
    });

    expect(await anthropic.generateReview(prompt)).toEqual({
      status: 'ok',
      review: { outcome: 'good', feedback: 'Muy bien.' },
      usage: { inputTokens: 300, outputTokens: 80, cacheReadTokens: 900, cacheWriteTokens: 0 },
    });
  });

  it('marca el prompt fijo para caché y usa el modelo configurado', async () => {
    const { provider: anthropic, requests } = provider({
      stop_reason: 'end_turn',
      parsed_output: { outcome: 'good', feedback: 'Muy bien.' },
      usage,
    });

    await anthropic.generateReview(prompt);

    expect(requests[0]).toMatchObject({
      model: 'claude-haiku-5-5',
      system: [{ type: 'text', text: prompt.system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: prompt.user }],
      output_config: { effort: 'low' },
    });
  });

  it('informa un rechazo del modelo', async () => {
    const { provider: anthropic } = provider({
      stop_reason: 'refusal',
      parsed_output: null,
      usage,
    });

    expect((await anthropic.generateReview(prompt)).status).toBe('refused');
  });

  it('informa una respuesta que no tiene el formato esperado', async () => {
    const { provider: anthropic } = provider({
      stop_reason: 'max_tokens',
      parsed_output: null,
      usage,
    });

    expect((await anthropic.generateReview(prompt)).status).toBe('invalid');
  });
});
