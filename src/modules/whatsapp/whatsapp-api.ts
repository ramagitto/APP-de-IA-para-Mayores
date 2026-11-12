import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { z } from 'zod';
import { type ContactId, parseContact } from '../users/contact.js';

export interface TemplateMessage {
  name: string;
  language: string;
  parameters: string[];
}

// Lo que Charlá necesita de WhatsApp. El adaptador real habla con la Cloud API; el falso
// guarda los envíos para tests y demos locales.
export interface WhatsAppApi {
  sendText(to: ContactId, body: string): Promise<string>;
  sendVoiceNote(to: ContactId, audio: Buffer): Promise<string>;
  sendTemplate(to: ContactId, template: TemplateMessage): Promise<string>;
  downloadMedia(mediaId: string): Promise<{ data: Buffer; mimeType: string }>;
}

// El cuerpo de un mensaje de texto admite hasta 4096 caracteres.
export const MAX_TEXT_LENGTH = 4096;

// Con el id de WhatsApp se responde por "recipient"; con un teléfono, por "to".
export function addressOf(contact: ContactId): { to: string } | { recipient: string } {
  const { kind, value } = parseContact(contact);
  // Una persona de la web no tiene WhatsApp registrado: no se le puede escribir por acá.
  if (kind === 'web') throw new Error('Ese contacto es de la web, no de WhatsApp');
  return kind === 'whatsapp' ? { recipient: value } : { to: value };
}

const sendResponseSchema = z.object({ messages: z.array(z.object({ id: z.string() })).min(1) });
const mediaUploadSchema = z.object({ id: z.string() });
const mediaInfoSchema = z.object({ url: z.string(), mime_type: z.string() });
const errorSchema = z.object({ error: z.object({ code: z.number().optional() }).optional() });

export class WhatsAppApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: number | undefined,
  ) {
    // Solo el estado y el código: el cuerpo del error puede repetir datos del mensaje.
    super(`WhatsApp respondió ${status}${code === undefined ? '' : ` (código ${code})`}`);
    this.name = 'WhatsAppApiError';
  }
}

export interface CloudApiOptions {
  accessToken: string;
  phoneNumberId: string;
  graphVersion: string;
  /** Solo para tests. */
  fetch?: typeof fetch;
}

// Adaptador para la WhatsApp Cloud API, según su documentación oficial (consultada el
// 10/11/2026). No se probó con un número real: lo conecta el equipo (docs/checklist-piloto.md).
export class CloudApi implements WhatsAppApi {
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;

  constructor(private readonly options: CloudApiOptions) {
    this.fetchFn = options.fetch ?? fetch;
    this.baseUrl = `https://graph.facebook.com/${options.graphVersion}`;
  }

  async sendText(to: ContactId, body: string): Promise<string> {
    return this.send(to, { type: 'text', text: { body: body.slice(0, MAX_TEXT_LENGTH) } });
  }

  async sendVoiceNote(to: ContactId, audio: Buffer): Promise<string> {
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', 'audio/ogg');
    form.append('file', new Blob([audio], { type: 'audio/ogg' }), 'nota-de-voz.ogg');

    const upload = mediaUploadSchema.parse(
      await this.request(`${this.baseUrl}/${this.options.phoneNumberId}/media`, {
        method: 'POST',
        body: form,
      }),
    );

    // "voice": true la manda como nota de voz: requiere OGG con Opus.
    return this.send(to, { type: 'audio', audio: { id: upload.id, voice: true } });
  }

  async sendTemplate(to: ContactId, template: TemplateMessage): Promise<string> {
    return this.send(to, {
      type: 'template',
      template: {
        name: template.name,
        language: { code: template.language },
        components: template.parameters.length
          ? [
              {
                type: 'body',
                parameters: template.parameters.map((text) => ({ type: 'text', text })),
              },
            ]
          : [],
      },
    });
  }

  async downloadMedia(mediaId: string): Promise<{ data: Buffer; mimeType: string }> {
    // La URL del archivo vence a los 5 minutos: se pide y se descarga enseguida.
    const info = mediaInfoSchema.parse(
      await this.request(`${this.baseUrl}/${encodeURIComponent(mediaId)}`, { method: 'GET' }),
    );
    const response = await this.fetchFn(info.url, {
      headers: { Authorization: `Bearer ${this.options.accessToken}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new WhatsAppApiError(response.status, undefined);

    return { data: Buffer.from(await response.arrayBuffer()), mimeType: info.mime_type };
  }

  private async send(to: ContactId, message: Record<string, unknown>): Promise<string> {
    const response = sendResponseSchema.parse(
      await this.request(`${this.baseUrl}/${this.options.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          ...addressOf(to),
          ...message,
        }),
      }),
    );

    return response.messages[0]!.id;
  }

  private async request(url: string, init: RequestInit): Promise<unknown> {
    const response = await this.fetchFn(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${this.options.accessToken}` },
      signal: AbortSignal.timeout(20_000),
    });
    const body: unknown = await response.json().catch(() => ({}));

    if (!response.ok) {
      const parsed = errorSchema.safeParse(body);
      throw new WhatsAppApiError(
        response.status,
        parsed.success ? parsed.data.error?.code : undefined,
      );
    }

    return body;
  }
}

export interface SentMessage {
  to: ContactId;
  type: 'text' | 'voice' | 'template';
  body?: string;
  template?: TemplateMessage;
}

// Adaptador falso: no manda nada. Guarda los envíos en memoria y, si se le indica, en un
// archivo local (var/), para ver las respuestas en una demo sin un número real.
export class FakeWhatsAppApi implements WhatsAppApi {
  readonly sent: SentMessage[] = [];
  readonly media = new Map<string, { data: Buffer; mimeType: string }>();
  private counter = 0;

  constructor(private readonly outboxFile?: string) {}

  async sendText(to: ContactId, body: string): Promise<string> {
    return this.record({ to, type: 'text', body });
  }

  async sendVoiceNote(to: ContactId, audio: Buffer): Promise<string> {
    return this.record({ to, type: 'voice', body: `[nota de voz de ${audio.length} bytes]` });
  }

  async sendTemplate(to: ContactId, template: TemplateMessage): Promise<string> {
    return this.record({ to, type: 'template', template });
  }

  async downloadMedia(mediaId: string): Promise<{ data: Buffer; mimeType: string }> {
    const media = this.media.get(mediaId);
    if (!media) throw new WhatsAppApiError(404, undefined);
    return media;
  }

  private async record(message: SentMessage): Promise<string> {
    this.sent.push(message);
    this.counter += 1;

    if (this.outboxFile) {
      await mkdir(dirname(this.outboxFile), { recursive: true });
      await appendFile(this.outboxFile, `${JSON.stringify({ ...message, at: new Date() })}\n`);
    }

    return `wamid.falso-${this.counter}`;
  }
}
