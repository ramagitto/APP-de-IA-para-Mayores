import { z } from 'zod';
import { type ContactId, phoneContact, whatsappContact } from '../users/contact.js';

// Solo los campos que usamos, según la referencia de webhooks de Meta (consultada el
// 10/11/2026). El resto se ignora: Meta agrega campos nuevos con frecuencia.
const messageSchema = z.object({
  id: z.string().min(1),
  from: z.string().optional(),
  from_user_id: z.string().optional(),
  timestamp: z.string().optional(),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
  audio: z
    .object({
      id: z.string().min(1),
      mime_type: z.string().optional(),
      voice: z.boolean().optional(),
    })
    .optional(),
});

const payloadSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      changes: z.array(
        z.object({
          field: z.string(),
          value: z.object({ messages: z.array(messageSchema).optional() }).passthrough(),
        }),
      ),
    }),
  ),
});

export type InboundContent =
  | { type: 'text'; text: string }
  | { type: 'audio'; mediaId: string; mimeType: string }
  | { type: 'unsupported' };

export interface InboundMessage {
  providerMessageId: string;
  contact: ContactId;
  content: InboundContent;
}

// Meta recomienda identificar a la persona por su id por empresa (from_user_id): siempre viene,
// y el teléfono puede faltar si la persona usa nombre de usuario.
function contactOf(message: z.infer<typeof messageSchema>): ContactId | undefined {
  if (message.from_user_id) return whatsappContact(message.from_user_id);
  if (message.from) return phoneContact(message.from);
  return undefined;
}

function contentOf(message: z.infer<typeof messageSchema>): InboundContent {
  if (message.type === 'text' && message.text) return { type: 'text', text: message.text.body };
  if (message.type === 'audio' && message.audio) {
    return {
      type: 'audio',
      mediaId: message.audio.id,
      mimeType: message.audio.mime_type ?? 'audio/ogg',
    };
  }
  return { type: 'unsupported' };
}

/** Extrae los mensajes entrantes. Los avisos de estado (entregado, leído) se ignoran. */
export function extractInboundMessages(payload: unknown): InboundMessage[] {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success || parsed.data.object !== 'whatsapp_business_account') return [];

  return parsed.data.entry.flatMap((entry) =>
    entry.changes
      .filter((change) => change.field === 'messages')
      .flatMap((change) => change.value.messages ?? [])
      .flatMap((message) => {
        const contact = contactOf(message);
        return contact
          ? [{ providerMessageId: message.id, contact, content: contentOf(message) }]
          : [];
      }),
  );
}
