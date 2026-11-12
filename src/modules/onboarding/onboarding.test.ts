import { describe, expect, it } from 'vitest';
import {
  loadConsentContent,
  parseConsentContent,
  WEB_BUTTONS,
  WEB_CONSENT_FILE,
} from './consent-content.js';
import { detectKeyword } from './keywords.js';

describe('detectKeyword', () => {
  it.each([
    ['BAJA', 'baja'],
    ['baja.', 'baja'],
    ['Quiero darme de baja', 'baja'],
    ['AYUDA', 'ayuda'],
    ['¡Ayuda!', 'ayuda'],
    ['ACEPTO', 'acepto'],
    ['Sí, acepto', 'acepto'],
    ['si acepto', 'acepto'],
    ['No', 'rechazo'],
    ['no, gracias', 'rechazo'],
  ] as const)('reconoce "%s"', (text, keyword) => {
    expect(detectKeyword(text)).toBe(keyword);
  });

  it.each([
    'Necesito ayuda con una receta',
    'No sé qué es la baja presión',
    'acepto que no sé nada',
    'hola',
    '',
  ])('no confunde una frase con una palabra clave: "%s"', (text) => {
    expect(detectKeyword(text)).toBeUndefined();
  });
});

describe('textos del alta', () => {
  it('el archivo real es válido y nombra las palabras clave', () => {
    const content = loadConsentContent();

    for (const word of ['ACEPTO', 'NO', 'BAJA', 'AYUDA']) expect(content.pedido).toContain(word);
  });

  it('el pedido avisa que los datos se procesan fuera de Argentina y que nunca pedimos claves', () => {
    const { pedido } = loadConsentContent();

    expect(pedido).toMatch(/fuera de Argentina/);
    expect(pedido).toMatch(/nunca te va a pedir claves/);
  });

  it('el texto de la web es válido, no habla de WhatsApp en el pedido y pide cuidar el link', () => {
    const web = loadConsentContent(WEB_CONSENT_FILE);

    expect(web.pedido).toMatch(/fuera de Argentina/);
    expect(web.pedido).toMatch(/nunca te va a pedir claves/);
    expect(web.pedido).toMatch(/no lo compartas/);
    expect(web.pedido).not.toMatch(/WhatsApp/);
    expect(web.version).not.toBe(loadConsentContent().version);
  });

  it('en la web, los textos nombran los botones y no las palabras de WhatsApp', () => {
    const web = loadConsentContent(WEB_CONSENT_FILE);

    for (const label of WEB_BUTTONS) expect(web.pedido).toContain(label);
    for (const text of [web.pedido, web.recordatorio, web.bienvenida]) {
      expect(text).not.toMatch(/\b(ACEPTO|NO|BAJA|AYUDA)\b/);
      expect(text).not.toMatch(/botón verde/);
    }
  });

  it('rechaza un pedido que no explica cómo responder', () => {
    const yaml = `version: v1
revision: borrador
pedido: ${'Un texto largo sin las palabras clave necesarias. '.repeat(4)}
recordatorio: Respondé para empezar, por favor.
bienvenida: Bienvenida al curso de Charlá.
rechazo: Entendido, no te escribimos más.
baja: Listo, borramos todos tus datos.
ayuda: Listo, te escribe una persona.
`;

    expect(() => parseConsentContent(yaml)).toThrow('ACEPTO');
  });
});
