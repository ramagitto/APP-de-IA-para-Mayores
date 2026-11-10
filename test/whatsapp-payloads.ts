// Payloads de webhook armados según la referencia de Meta. Los ids son inventados.
// También los usa scripts/whatsapp-simulate.ts para probar el webhook local.
export function textPayload(text: string, id = 'wamid.prueba-1', userId = 'AR.1000000001') {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '102290129340398',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '15550000000', phone_number_id: '106540352242922' },
              contacts: [
                { profile: { name: 'Persona de prueba' }, wa_id: '5491100000001', user_id: userId },
              ],
              messages: [
                {
                  from: '5491100000001',
                  from_user_id: userId,
                  id,
                  timestamp: '1749416383',
                  type: 'text',
                  text: { body: text },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

export function audioPayload(mediaId: string, id = 'wamid.audio-1', userId = 'AR.1000000001') {
  const payload = textPayload('', id, userId);
  payload.entry[0]!.changes[0]!.value.messages = [
    {
      from_user_id: userId,
      id,
      timestamp: '1749416383',
      type: 'audio',
      audio: { id: mediaId, mime_type: 'audio/ogg; codecs=opus', voice: true },
    } as never,
  ];
  return payload;
}
