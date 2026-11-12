import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { InMemoryCostLedger } from '../tutor/cost-ledger.js';
import { audioId, FileAudioStore, InMemoryAudioStore } from './audio-store.js';
import { AzureTextToSpeech, buildSsml, escapeXml } from './azure-tts.js';
import { MockSpeechToText, MockTextToSpeech } from './mock-speech.js';
import { OpenAiSpeechToText } from './openai-stt.js';
import type { SpeechToText, TextToSpeech } from './speech.js';
import { VoiceService } from './voice-service.js';

const now = () => new Date('2027-05-03T13:00:00-03:00');

// Un fetch falso que guarda lo que recibió y responde lo que le pedimos.
function fakeFetch(response: Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return response.clone();
  }) as typeof fetch;

  return { fetchFn, calls };
}

class FixedTts implements TextToSpeech {
  readonly name = 'fijo';
  readonly voiceKey = 'fijo';
  calls = 0;

  constructor(private readonly fail = false) {}

  async synthesize() {
    this.calls += 1;
    if (this.fail) throw new Error('caído');
    return { audio: Buffer.from('ogg'), mimeType: 'audio/ogg', costUsd: 0.0001 };
  }
}

function service(tts: TextToSpeech, budget = 0.01, stt: SpeechToText = new MockSpeechToText()) {
  const ledger = new InMemoryCostLedger();
  return {
    ledger,
    voice: new VoiceService({
      stt,
      tts,
      store: new InMemoryAudioStore(),
      ledger,
      dailyBudgetUsd: budget,
      now,
    }),
  };
}

describe('proveedores simulados', () => {
  it('la voz a texto simulada usa lo que reconoció el navegador', async () => {
    const result = await new MockSpeechToText().transcribe({
      audio: Buffer.from('x'),
      mimeType: 'audio/webm',
      hintText: '  hola  ',
    });

    expect(result).toEqual({ text: 'hola', costUsd: 0 });
  });

  it('sin texto del navegador, no entiende el audio', async () => {
    const result = await new MockSpeechToText().transcribe({
      audio: Buffer.from('x'),
      mimeType: 'audio/webm',
    });

    expect(result.text).toBe('');
  });

  it('el texto a voz simulado no genera audio', async () => {
    expect(await new MockTextToSpeech().synthesize()).toBeNull();
  });
});

describe('OpenAiSpeechToText', () => {
  it('manda el audio y el modelo, y calcula el costo por la duración', async () => {
    const { fetchFn, calls } = fakeFetch(
      Response.json({
        text: ' Hola, quiero una receta ',
        usage: { type: 'duration', seconds: 30 },
      }),
    );
    const stt = new OpenAiSpeechToText({
      apiKey: 'clave',
      model: 'gpt-transcribe',
      fetch: fetchFn,
    });

    const result = await stt.transcribe({
      audio: Buffer.from('audio'),
      mimeType: 'audio/webm;codecs=opus',
    });

    expect(result.text).toBe('Hola, quiero una receta');
    expect(result.costUsd).toBeCloseTo(0.00225, 8);
    expect(calls[0]?.url).toBe('https://api.openai.com/v1/audio/transcriptions');
    const body = calls[0]?.init.body as FormData;
    expect(body.get('model')).toBe('gpt-transcribe');
    expect(body.get('language')).toBe('es');
    expect((body.get('file') as File).name).toBe('audio.webm');
  });

  it('acepta una respuesta con uso en tokens', async () => {
    const { fetchFn } = fakeFetch(
      Response.json({
        text: 'hola',
        usage: { type: 'tokens', input_tokens: 10, output_tokens: 2, total_tokens: 12 },
      }),
    );
    const stt = new OpenAiSpeechToText({
      apiKey: 'clave',
      model: 'gpt-transcribe',
      fetch: fetchFn,
    });

    expect((await stt.transcribe({ audio: Buffer.from('x'), mimeType: 'audio/ogg' })).text).toBe(
      'hola',
    );
  });

  it('rechaza un formato que la API no acepta', async () => {
    const { fetchFn } = fakeFetch(Response.json({ text: '' }));
    const stt = new OpenAiSpeechToText({
      apiKey: 'clave',
      model: 'gpt-transcribe',
      fetch: fetchFn,
    });

    await expect(
      stt.transcribe({ audio: Buffer.from('x'), mimeType: 'audio/aiff' }),
    ).rejects.toThrow('no soportado');
  });

  it('no incluye la respuesta del proveedor en el error', async () => {
    const { fetchFn } = fakeFetch(new Response('detalle con datos', { status: 500 }));
    const stt = new OpenAiSpeechToText({
      apiKey: 'clave',
      model: 'gpt-transcribe',
      fetch: fetchFn,
    });

    await expect(
      stt.transcribe({ audio: Buffer.from('x'), mimeType: 'audio/ogg' }),
    ).rejects.toThrow(/^La transcripción falló con estado 500$/);
  });
});

describe('AzureTextToSpeech', () => {
  it('pide una nota de voz OGG con la voz argentina', async () => {
    const { fetchFn, calls } = fakeFetch(new Response(Buffer.from('ogg')));
    const tts = new AzureTextToSpeech({
      apiKey: 'clave',
      region: 'eastus',
      voice: 'es-AR-ElenaNeural',
      fetch: fetchFn,
    });

    const result = await tts.synthesize('Hola, ¿cómo andás?');

    expect(calls[0]?.url).toBe('https://eastus.tts.speech.microsoft.com/cognitiveservices/v1');
    expect(calls[0]?.init.headers).toMatchObject({
      'Ocp-Apim-Subscription-Key': 'clave',
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'ogg-24khz-16bit-mono-opus',
    });
    expect(calls[0]?.init.body).toContain(
      "<voice name='es-AR-ElenaNeural'>Hola, ¿cómo andás?</voice>",
    );
    expect(result.mimeType).toBe('audio/ogg');
  });

  it('para la web pide MP3, que también suena en iPhone viejos, con otra clave de caché', async () => {
    const { fetchFn, calls } = fakeFetch(new Response(Buffer.from('mp3')));
    const options = { apiKey: 'clave', region: 'eastus', voice: 'es-AR-ElenaNeural' };
    const tts = new AzureTextToSpeech({ ...options, format: 'mp3', fetch: fetchFn });

    const result = await tts.synthesize('Hola');

    expect(calls[0]?.init.headers).toMatchObject({
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
    });
    expect(result.mimeType).toBe('audio/mpeg');
    expect(tts.voiceKey).not.toBe(new AzureTextToSpeech(options).voiceKey);
  });

  it('escapa el texto para que no rompa el XML', () => {
    expect(escapeXml(`<a & 'b'>`)).toBe('&lt;a &amp; &apos;b&apos;&gt;');
    expect(buildSsml('a < b', 'es-AR-TomasNeural')).toContain("xml:lang='es-AR'");
  });
});

describe('VoiceService', () => {
  it('genera el audio una sola vez para el mismo texto', async () => {
    const tts = new FixedTts();
    const { voice } = service(tts);

    const first = await voice.speak('Hola', 'usuario-1');
    const second = await voice.speak('Hola', 'usuario-2');

    expect(first).toBe(audioId('fijo', 'Hola'));
    expect(second).toBe(first);
    expect(tts.calls).toBe(1);
  });

  it('registra el costo del audio generado', async () => {
    const { voice, ledger } = service(new FixedTts());

    await voice.speak('Hola', 'usuario-1');

    expect(ledger.entries[0]).toMatchObject({
      purpose: 'tts',
      userId: 'usuario-1',
      costUsd: 0.0001,
    });
  });

  it('sin presupuesto, el mensaje sale solo como texto', async () => {
    const tts = new FixedTts();
    const { voice, ledger } = service(tts, 0.0001);
    await ledger.record({
      userId: 'usuario-1',
      day: '2027-05-03',
      provider: 'x',
      model: 'x',
      purpose: 'tutor_review',
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      costUsd: 0.0001,
    });

    expect(await voice.speak('Texto nuevo', 'usuario-1')).toBeUndefined();
    expect(tts.calls).toBe(0);
  });

  it('si el proveedor falla, el mensaje sale como texto', async () => {
    const { voice } = service(new FixedTts(true));

    expect(await voice.speak('Hola', 'usuario-1')).toBeUndefined();
  });

  it('con el proveedor simulado no hay audio', async () => {
    const { voice } = service(new MockTextToSpeech());

    expect(await voice.speak('Hola', 'usuario-1')).toBeUndefined();
  });
});

describe('FileAudioStore', () => {
  const directories: string[] = [];
  afterAll(() => Promise.all(directories.map((directory) => rm(directory, { recursive: true }))));

  it('guarda y recupera un audio', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'charla-audio-'));
    directories.push(directory);
    const store = new FileAudioStore(directory);
    const id = audioId('voz', 'hola');

    await store.put(id, Buffer.from('ogg'));

    expect((await store.get(id))?.toString()).toBe('ogg');
  });

  it('no deja leer fuera de su carpeta', async () => {
    const store = new FileAudioStore(tmpdir());

    expect(await store.get('../../etc/passwd')).toBeUndefined();
    await expect(store.put('../afuera', Buffer.from('x'))).rejects.toThrow('inválido');
  });
});
