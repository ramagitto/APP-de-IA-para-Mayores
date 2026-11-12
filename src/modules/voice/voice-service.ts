import { toLocalDay } from '../streaks/lesson-calendar.js';
import { NO_USAGE } from '../tutor/llm-provider.js';
import type { CostLedger } from '../tutor/cost-ledger.js';
import { type AudioStore, audioId } from './audio-store.js';
import {
  type SpeechToText,
  type TextToSpeech,
  type TranscriptionRequest,
  VOICE_NOTE_MIME,
} from './speech.js';

export interface VoiceServiceOptions {
  stt: SpeechToText;
  tts: TextToSpeech;
  store: AudioStore;
  ledger: CostLedger;
  dailyBudgetUsd: number;
  now?: () => Date;
}

// Une la voz con el control de costos. El audio del usuario solo vive en memoria mientras se
// transcribe: nunca se guarda (retención: audios borrados al transcribirlos).
export class VoiceService {
  private readonly now: () => Date;

  constructor(private readonly options: VoiceServiceOptions) {
    this.now = options.now ?? (() => new Date());
  }

  /** Tipo de los audios que genera Charlá, para servirlos con el encabezado correcto. */
  get audioMimeType(): string {
    return this.options.tts.mimeType ?? VOICE_NOTE_MIME;
  }

  /** Si es false, la voz a texto es la simulada: depende de lo que reconoció el navegador. */
  get transcribesAudio(): boolean {
    return this.options.stt.name !== 'mock';
  }

  async transcribe(request: TranscriptionRequest, userId: string | null): Promise<string> {
    const result = await this.options.stt.transcribe(request);
    await this.record(userId, this.options.stt.name, 'stt', result.costUsd);

    return result.text;
  }

  /**
   * Devuelve el id del audio, o undefined si no hay audio: proveedor simulado, tope de costo
   * superado o un error del proveedor. En esos casos el mensaje igual sale como texto.
   */
  async speak(text: string, userId: string | null): Promise<string | undefined> {
    const { tts, store, ledger } = this.options;
    const id = audioId(tts.voiceKey, text);

    if (await store.get(id)) return id;

    const day = toLocalDay(this.now());
    if ((await ledger.spentUsd(userId, day)) >= this.options.dailyBudgetUsd) return undefined;

    try {
      const result = await tts.synthesize(text);
      if (!result) return undefined;

      await store.put(id, result.audio);
      await this.record(userId, tts.name, 'tts', result.costUsd);
      return id;
    } catch {
      return undefined;
    }
  }

  private async record(
    userId: string | null,
    provider: string,
    purpose: 'stt' | 'tts',
    costUsd: number,
  ): Promise<void> {
    if (costUsd === 0) return;

    await this.options.ledger.record({
      userId,
      day: toLocalDay(this.now()),
      provider,
      model: provider,
      purpose,
      usage: NO_USAGE,
      costUsd,
    });
  }
}
