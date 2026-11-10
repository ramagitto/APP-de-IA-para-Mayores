import type { Env } from '../../config/env.js';
import type { CostLedger } from '../tutor/cost-ledger.js';
import { type AudioStore, FileAudioStore } from './audio-store.js';
import { AzureTextToSpeech } from './azure-tts.js';
import { MockSpeechToText, MockTextToSpeech } from './mock-speech.js';
import { OpenAiSpeechToText } from './openai-stt.js';
import type { SpeechToText, TextToSpeech } from './speech.js';
import { VoiceService } from './voice-service.js';

export function createSpeechToText(env: Env): SpeechToText {
  if (env.STT_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
    return new OpenAiSpeechToText({ apiKey: env.OPENAI_API_KEY, model: env.STT_MODEL });
  }
  return new MockSpeechToText();
}

export function createTextToSpeech(env: Env): TextToSpeech {
  if (env.TTS_PROVIDER === 'azure' && env.AZURE_SPEECH_KEY && env.AZURE_SPEECH_REGION) {
    return new AzureTextToSpeech({
      apiKey: env.AZURE_SPEECH_KEY,
      region: env.AZURE_SPEECH_REGION,
      voice: env.TTS_VOICE,
    });
  }
  return new MockTextToSpeech();
}

export function createVoiceService(
  env: Env,
  ledger: CostLedger,
  store: AudioStore = new FileAudioStore(env.AUDIO_CACHE_DIR),
): VoiceService {
  return new VoiceService({
    stt: createSpeechToText(env),
    tts: createTextToSpeech(env),
    store,
    ledger,
    dailyBudgetUsd: env.TUTOR_DAILY_BUDGET_USD,
  });
}
