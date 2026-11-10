import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';

export const HELPLINES_FILE = 'content/lineas-de-ayuda.yaml';

// Estas líneas tienen que existir: los mensajes de cuidado las nombran.
export const REQUIRED_HELPLINES = [
  'cas_amba',
  'cas_nacional',
  'salud_mental_nacional',
  'emergencias',
  'emergencias_medicas',
] as const;

export type HelplineId = (typeof REQUIRED_HELPLINES)[number];

// Pasado este plazo, hay que volver a verificar el número en su fuente.
export const MAX_DAYS_SINCE_VERIFIED = 90;

const helplinesSchema = z
  .object({
    lineas: z.array(
      z.strictObject({
        id: z.string().min(1),
        nombre: z.string().min(1),
        numero: z.string().regex(/^[\d()\s-]+$/, 'Solo dígitos, espacios, guiones y paréntesis'),
        alcance: z.string().min(1),
        fuente: z.url(),
        verificado: z.iso.date(),
      }),
    ),
  })
  .superRefine(({ lineas }, context) => {
    for (const id of REQUIRED_HELPLINES) {
      if (!lineas.some((line) => line.id === id)) {
        context.addIssue({ code: 'custom', path: ['lineas'], message: `Falta la línea ${id}` });
      }
    }
  });

export type Helpline = z.infer<typeof helplinesSchema>['lineas'][number];
export type Helplines = Record<HelplineId, Helpline>;

export function parseHelplines(yamlText: string): Helplines {
  const { lineas } = helplinesSchema.parse(parse(yamlText));
  const byId = new Map(lineas.map((line) => [line.id, line]));

  return Object.fromEntries(REQUIRED_HELPLINES.map((id) => [id, byId.get(id)])) as Helplines;
}

export function staleHelplines(helplines: Helplines, today: Date): Helpline[] {
  const limit = MAX_DAYS_SINCE_VERIFIED * 24 * 60 * 60 * 1000;

  return Object.values(helplines).filter(
    (line) => today.getTime() - new Date(`${line.verificado}T00:00:00Z`).getTime() > limit,
  );
}

let cached: Helplines | undefined;

export function loadHelplines(): Helplines {
  cached ??= parseHelplines(readFileSync(HELPLINES_FILE, 'utf8'));
  return cached;
}
