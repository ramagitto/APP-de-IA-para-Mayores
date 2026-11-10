import type { SynthesizedAudio, TextToSpeech } from './speech.js';
import { VOICE_NOTE_MIME } from './speech.js';

// Nota de voz de WhatsApp: OGG con Opus, mono. Es uno de los formatos de salida de Azure.
const OUTPUT_FORMAT = 'ogg-24khz-16bit-mono-opus';

// USD por millón de caracteres para voces neuronales estándar. Dato de fuentes de terceros,
// porque la página oficial de precios no se pudo leer: hay que confirmarlo antes del piloto.
export const TTS_PRICE_PER_MILLION_CHARACTERS = 16;

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSsml(text: string, voice: string): string {
  const locale = voice.split('-').slice(0, 2).join('-');

  return `<speak version='1.0' xml:lang='${locale}'><voice name='${voice}'>${escapeXml(text)}</voice></speak>`;
}

export interface AzureTextToSpeechOptions {
  apiKey: string;
  region: string;
  voice: string;
  /** Solo para tests. */
  fetch?: typeof fetch;
}

// Adaptador para la API REST de texto a voz de Azure. No se probó contra la API real: no hay clave.
export class AzureTextToSpeech implements TextToSpeech {
  readonly name = 'azure';
  readonly voiceKey: string;
  private readonly fetchFn: typeof fetch;

  constructor(private readonly options: AzureTextToSpeechOptions) {
    this.voiceKey = `azure:${options.voice}:${OUTPUT_FORMAT}`;
    this.fetchFn = options.fetch ?? fetch;
  }

  async synthesize(text: string): Promise<SynthesizedAudio> {
    const response = await this.fetchFn(
      `https://${this.options.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.options.apiKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': OUTPUT_FORMAT,
          'User-Agent': 'charla',
        },
        body: buildSsml(text, this.options.voice),
        signal: AbortSignal.timeout(20_000),
      },
    );

    if (!response.ok) throw new Error(`La síntesis de voz falló con estado ${response.status}`);

    return {
      audio: Buffer.from(await response.arrayBuffer()),
      mimeType: VOICE_NOTE_MIME,
      costUsd: (text.length * TTS_PRICE_PER_MILLION_CHARACTERS) / 1_000_000,
    };
  }
}
