import { z } from 'zod';
import type { SpeechToText, Transcription, TranscriptionRequest } from './speech.js';

const ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';

// USD por minuto, según la página de precios de OpenAI (consultada el 10/11/2026).
export const STT_PRICE_PER_MINUTE: Record<string, number> = {
  'gpt-transcribe': 0.0045,
  'gpt-4o-mini-transcribe': 0.003,
};

// Formatos que acepta la API, según su referencia.
const EXTENSIONS: Record<string, string> = {
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
};

const responseSchema = z.object({
  text: z.string(),
  usage: z
    .union([
      z.object({ type: z.literal('duration'), seconds: z.number() }),
      z.object({ type: z.literal('tokens') }).passthrough(),
    ])
    .optional(),
});

export interface OpenAiSpeechToTextOptions {
  apiKey: string;
  model: string;
  /** Solo para tests. */
  fetch?: typeof fetch;
}

// Adaptador para la API de transcripción de OpenAI. No se probó contra la API real: no hay clave.
export class OpenAiSpeechToText implements SpeechToText {
  readonly name = 'openai';
  private readonly fetchFn: typeof fetch;

  constructor(private readonly options: OpenAiSpeechToTextOptions) {
    this.fetchFn = options.fetch ?? fetch;
  }

  async transcribe({ audio, mimeType }: TranscriptionRequest): Promise<Transcription> {
    const baseType = mimeType.split(';')[0]?.trim() ?? mimeType;
    const extension = EXTENSIONS[baseType];
    if (!extension) throw new Error(`Formato de audio no soportado: ${baseType}`);

    const form = new FormData();
    form.append('file', new Blob([audio], { type: baseType }), `audio.${extension}`);
    form.append('model', this.options.model);
    form.append('language', 'es');

    const response = await this.fetchFn(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.options.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(20_000),
    });

    // El cuerpo del error puede repetir datos del pedido: no se incluye en el mensaje.
    if (!response.ok) throw new Error(`La transcripción falló con estado ${response.status}`);

    const data = responseSchema.parse(await response.json());
    const seconds = data.usage?.type === 'duration' ? data.usage.seconds : undefined;
    const pricePerMinute = STT_PRICE_PER_MINUTE[this.options.model] ?? 0;

    return {
      text: data.text.trim(),
      seconds,
      // Si la API no informa la duración, el costo queda en 0 y se anota como pendiente de medir.
      costUsd: seconds === undefined ? 0 : (seconds / 60) * pricePerMinute,
    };
  }
}
