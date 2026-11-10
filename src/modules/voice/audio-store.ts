import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Guarda los audios que genera Charlá (nunca los del usuario), para no pagar dos veces el mismo.
export interface AudioStore {
  get(id: string): Promise<Buffer | undefined>;
  put(id: string, audio: Buffer): Promise<void>;
}

// El id sale del texto y de la voz: el mismo texto con la misma voz reutiliza el audio.
export function audioId(voiceKey: string, text: string): string {
  return createHash('sha256').update(`${voiceKey}\n${text}`).digest('hex');
}

const VALID_ID = /^[0-9a-f]{64}$/;

export class InMemoryAudioStore implements AudioStore {
  private readonly audios = new Map<string, Buffer>();

  async get(id: string): Promise<Buffer | undefined> {
    return this.audios.get(id);
  }

  async put(id: string, audio: Buffer): Promise<void> {
    this.audios.set(id, audio);
  }
}

export class FileAudioStore implements AudioStore {
  constructor(private readonly directory: string) {}

  async get(id: string): Promise<Buffer | undefined> {
    // Validar el id evita que alguien pida un archivo fuera de la carpeta.
    if (!VALID_ID.test(id)) return undefined;

    try {
      return await readFile(join(this.directory, `${id}.ogg`));
    } catch {
      return undefined;
    }
  }

  async put(id: string, audio: Buffer): Promise<void> {
    if (!VALID_ID.test(id)) throw new Error('Id de audio inválido');

    await mkdir(this.directory, { recursive: true });
    await writeFile(join(this.directory, `${id}.ogg`), audio);
  }
}
