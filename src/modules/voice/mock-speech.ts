import type {
  SpeechToText,
  SynthesizedAudio,
  TextToSpeech,
  Transcription,
  TranscriptionRequest,
} from './speech.js';

// Voz a texto simulada: usa lo que reconoció el navegador. Sin eso, no entiende el audio.
export class MockSpeechToText implements SpeechToText {
  readonly name = 'mock';

  async transcribe({ hintText }: TranscriptionRequest): Promise<Transcription> {
    return { text: hintText?.trim() ?? '', costUsd: 0 };
  }
}

// Texto a voz simulado: no genera audio. El simulador lee el texto con la voz del navegador.
export class MockTextToSpeech implements TextToSpeech {
  readonly name = 'mock';
  readonly voiceKey = 'mock';

  async synthesize(): Promise<SynthesizedAudio | null> {
    return null;
  }
}
