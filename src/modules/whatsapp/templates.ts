import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';
import { asksForSensitiveData } from '../safety/risk.js';

export const TEMPLATES_FILE = 'content/plantillas-whatsapp.yaml';

const templatesSchema = z.object({
  idioma: z.string().regex(/^[a-z]{2}(_[A-Z]{2})?$/, 'Un código como es_AR'),
  plantillas: z.array(
    z.strictObject({
      nombre: z.string().regex(/^[a-z0-9_]+$/, 'Solo minúsculas, números y guiones bajos'),
      categoria_esperada: z.enum(['marketing', 'utility']),
      uso: z.string().min(10),
      // Límite de 1024 caracteres para el cuerpo (supuesto: verificarlo en la guía de Meta).
      cuerpo: z.string().min(20).max(1024),
      ejemplos: z.array(z.string().min(1)),
    }),
  ),
});

export type WhatsAppTemplates = z.infer<typeof templatesSchema>;

// Reglas de revisión de Meta (consultadas el 10/11/2026): las variables van numeradas en
// orden, una plantilla no puede empezar ni terminar con una variable, cada variable necesita un
// ejemplo, y no se pueden pedir datos sensibles.
export function templateProblems(template: WhatsAppTemplates['plantillas'][number]): string[] {
  const problems: string[] = [];
  const body = template.cuerpo.trim();
  const variables = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((match) => Number(match[1]));

  if (variables.some((number, index) => number !== index + 1)) {
    problems.push('las variables tienen que ir numeradas en orden: {{1}}, {{2}}...');
  }
  if (/^\{\{\d+\}\}/.test(body) || /\{\{\d+\}\}[.!?]?$/.test(body)) {
    problems.push('no puede empezar ni terminar con una variable');
  }
  if (template.ejemplos.length !== variables.length) {
    problems.push(`tiene ${variables.length} variable(s) y ${template.ejemplos.length} ejemplo(s)`);
  }
  if (asksForSensitiveData(body)) problems.push('pide datos sensibles');
  if (template.categoria_esperada === 'marketing' && !/\bBAJA\b/.test(body)) {
    problems.push(
      'una plantilla de marketing tiene que decir cómo dejar de recibir mensajes (BAJA)',
    );
  }

  return problems;
}

export function parseTemplates(yamlText: string): WhatsAppTemplates {
  const templates = templatesSchema.parse(parse(yamlText));
  const problems = templates.plantillas.flatMap((template) =>
    templateProblems(template).map((problem) => `${template.nombre}: ${problem}`),
  );

  const names = templates.plantillas.map((template) => template.nombre);
  if (new Set(names).size !== names.length) problems.push('hay nombres de plantilla repetidos');

  if (problems.length > 0) throw new Error(problems.join('; '));
  return templates;
}

export function loadTemplates(): WhatsAppTemplates {
  return parseTemplates(readFileSync(TEMPLATES_FILE, 'utf8'));
}
