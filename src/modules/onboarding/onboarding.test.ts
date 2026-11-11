import { describe, expect, it } from 'vitest';
import { loadConsentContent, parseConsentContent } from './consent-content.js';
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
