// Antes de mandar un texto a un proveedor de IA, se ocultan los datos que nadie necesita ver.
// Así, aunque una persona escriba su DNI o su tarjeta, ese dato no sale de nuestro sistema.

const REPLACEMENTS: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]'],
  [/\b(?:\d[ -]?){13,22}\b/g, '[número]'],
  [/\+?\b\d[\d -]{5,}\d\b/g, '[número]'],
  [/\b(clave|contraseña|contrasena|pin)(\s+(es|son|:))\s*\S+/gi, '$1$2 [oculto]'],
];

export interface RedactionResult {
  text: string;
  redacted: boolean;
}

export function redactSensitiveData(text: string): RedactionResult {
  let result = text;

  for (const [pattern, replacement] of REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  return { text: result, redacted: result !== text };
}
