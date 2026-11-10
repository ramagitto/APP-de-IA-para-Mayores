// Interfaces de voz. Cada proveedor (simulado, OpenAI, Azure u otro) es un adaptador.

export interface TranscriptionRequest {
  audio: Buffer;
  mimeType: string;
  /**
   * Texto que ya reconoció el navegador, si lo hizo. Solo lo usa el proveedor simulado,
   * para que el simulador funcione sin claves. Un proveedor real lo ignora.
   */
  hintText?: string;
}

export interface Transcription {
  text: string;
  /** Duración del audio, si el proveedor la informa. */
  seconds?: number;
  costUsd: number;
}

export interface SpeechToText {
  readonly name: string;
  transcribe(request: TranscriptionRequest): Promise<Transcription>;
}

export interface SynthesizedAudio {
  audio: Buffer;
  mimeType: string;
  costUsd: number;
}

export interface TextToSpeech {
  readonly name: string;
  /** Identifica la voz y el formato: dos audios con la misma clave suenan igual. */
  readonly voiceKey: string;
  /** Devuelve null si el proveedor no genera audio, como el simulado. */
  synthesize(text: string): Promise<SynthesizedAudio | null>;
}

// Nota de voz de WhatsApp: OGG con Opus, mono.
export const VOICE_NOTE_MIME = 'audio/ogg';
