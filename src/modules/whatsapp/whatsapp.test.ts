import { describe, expect, it } from 'vitest';
import { phoneContact, whatsappContact } from '../users/contact.js';
import { RateLimiter } from './rate-limiter.js';
import { isValidSignature, isValidVerifyToken, signPayload } from './signature.js';
import { extractInboundMessages } from './webhook-payload.js';
import { addressOf, CloudApi, WhatsAppApiError } from './whatsapp-api.js';
import { audioPayload, textPayload } from '../../../test/whatsapp-payloads.js';

describe('firma del webhook', () => {
  const body = Buffer.from('{"object":"whatsapp_business_account"}');

  it('acepta una firma correcta', () => {
    expect(isValidSignature(body, signPayload(body, 'secreto'), 'secreto')).toBe(true);
  });

  it.each([
    ['sin firma', undefined],
    ['con otro secreto', signPayload(body, 'otro')],
    ['sin el prefijo', signPayload(body, 'secreto').slice(7)],
    ['con basura', 'sha256=zzz'],
  ])('rechaza una firma %s', (_case, header) => {
    expect(isValidSignature(body, header, 'secreto')).toBe(false);
  });

  it('rechaza un cuerpo modificado', () => {
    const signature = signPayload(body, 'secreto');

    expect(isValidSignature(Buffer.from('{"object":"otro"}'), signature, 'secreto')).toBe(false);
  });

  it('compara el token de verificación', () => {
    expect(isValidVerifyToken('token', 'token')).toBe(true);
    expect(isValidVerifyToken('otro', 'token')).toBe(false);
    expect(isValidVerifyToken(undefined, 'token')).toBe(false);
  });
});

describe('extractInboundMessages', () => {
  it('extrae un texto e identifica a la persona por su id de WhatsApp', () => {
    expect(extractInboundMessages(textPayload('hola'))).toEqual([
      {
        providerMessageId: 'wamid.prueba-1',
        contact: whatsappContact('AR.1000000001'),
        content: { type: 'text', text: 'hola' },
      },
    ]);
  });

  it('extrae una nota de voz', () => {
    expect(extractInboundMessages(audioPayload('media-1'))[0]?.content).toEqual({
      type: 'audio',
      mediaId: 'media-1',
      mimeType: 'audio/ogg; codecs=opus',
    });
  });

  it('si no viene el id por empresa, usa el teléfono', () => {
    const payload = textPayload('hola');
    delete (payload.entry[0]!.changes[0]!.value.messages[0] as { from_user_id?: string })
      .from_user_id;

    expect(extractInboundMessages(payload)[0]?.contact).toBe(phoneContact('5491100000001'));
  });

  it('marca como no soportado lo que no es texto ni audio', () => {
    const payload = textPayload('hola');
    payload.entry[0]!.changes[0]!.value.messages[0]!.type = 'image';

    expect(extractInboundMessages(payload)[0]?.content).toEqual({ type: 'unsupported' });
  });

  it('ignora los avisos de estado y los payloads de otro tipo', () => {
    const statusOnly = textPayload('hola');
    delete (statusOnly.entry[0]!.changes[0]!.value as { messages?: unknown }).messages;

    expect(extractInboundMessages(statusOnly)).toEqual([]);
    expect(extractInboundMessages({ object: 'page', entry: [] })).toEqual([]);
    expect(extractInboundMessages('cualquier cosa')).toEqual([]);
  });
});

function fakeFetch(...responses: Response[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return responses.shift() ?? Response.json({});
  }) as typeof fetch;
  return { fetchFn, calls };
}

function cloudApi(fetchFn: typeof fetch) {
  return new CloudApi({
    accessToken: 'token',
    phoneNumberId: '106540352242922',
    graphVersion: 'v27.0',
    fetch: fetchFn,
  });
}

const sent = () =>
  Response.json({ messaging_product: 'whatsapp', messages: [{ id: 'wamid.respuesta' }] });

describe('CloudApi', () => {
  it('responde por id de WhatsApp con "recipient" y por teléfono con "to"', () => {
    expect(addressOf(whatsappContact('AR.1'))).toEqual({ recipient: 'AR.1' });
    expect(addressOf(phoneContact('+5491100000001'))).toEqual({ to: '+5491100000001' });
  });

  it('manda un texto al endpoint de mensajes', async () => {
    const { fetchFn, calls } = fakeFetch(sent());

    const id = await cloudApi(fetchFn).sendText(whatsappContact('AR.1'), 'Hola');

    expect(id).toBe('wamid.respuesta');
    expect(calls[0]?.url).toBe('https://graph.facebook.com/v27.0/106540352242922/messages');
    expect(calls[0]?.init.headers).toMatchObject({ Authorization: 'Bearer token' });
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      recipient: 'AR.1',
      type: 'text',
      text: { body: 'Hola' },
    });
  });

  it('una nota de voz se sube primero y después se manda con voice: true', async () => {
    const { fetchFn, calls } = fakeFetch(Response.json({ id: 'media-subida' }), sent());

    await cloudApi(fetchFn).sendVoiceNote(whatsappContact('AR.1'), Buffer.from('ogg'));

    expect(calls[0]?.url).toBe('https://graph.facebook.com/v27.0/106540352242922/media');
    expect((calls[0]?.init.body as FormData).get('messaging_product')).toBe('whatsapp');
    expect(JSON.parse(String(calls[1]?.init.body))).toMatchObject({
      type: 'audio',
      audio: { id: 'media-subida', voice: true },
    });
  });

  it('manda una plantilla con sus parámetros', async () => {
    const { fetchFn, calls } = fakeFetch(sent());

    await cloudApi(fetchFn).sendTemplate(whatsappContact('AR.1'), {
      name: 'charla_recordatorio',
      language: 'es_AR',
      parameters: ['Marta'],
    });

    expect(JSON.parse(String(calls[0]?.init.body)).template).toEqual({
      name: 'charla_recordatorio',
      language: { code: 'es_AR' },
      components: [{ type: 'body', parameters: [{ type: 'text', text: 'Marta' }] }],
    });
  });

  it('descarga un audio en dos pasos, con el token en los dos', async () => {
    const { fetchFn, calls } = fakeFetch(
      Response.json({ url: 'https://lookaside.example/media', mime_type: 'audio/ogg' }),
      new Response(Buffer.from('audio')),
    );

    const media = await cloudApi(fetchFn).downloadMedia('media-1');

    expect(media.data.toString()).toBe('audio');
    expect(calls[0]?.url).toBe('https://graph.facebook.com/v27.0/media-1');
    expect(calls[1]?.init.headers).toMatchObject({ Authorization: 'Bearer token' });
  });

  it('un error informa el estado y el código, pero no el cuerpo', async () => {
    const { fetchFn } = fakeFetch(
      Response.json({ error: { code: 131047, message: 'detalle con datos' } }, { status: 400 }),
    );

    const error = await cloudApi(fetchFn)
      .sendText(whatsappContact('AR.1'), 'Hola')
      .catch((e) => e);

    expect(error).toBeInstanceOf(WhatsAppApiError);
    expect(error.message).toBe('WhatsApp respondió 400 (código 131047)');
  });
});

describe('RateLimiter', () => {
  it('deja pasar hasta el límite dentro de la ventana', () => {
    const limiter = new RateLimiter(2, 60_000);

    expect(limiter.allow('a', 0)).toBe(true);
    expect(limiter.allow('a', 1_000)).toBe(true);
    expect(limiter.allow('a', 2_000)).toBe(false);
    expect(limiter.allow('b', 2_000)).toBe(true);
    expect(limiter.allow('a', 61_001)).toBe(true);
  });
});
