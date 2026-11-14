import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';
import type { WebState } from './web-backend.js';

export const REMINDERS_FILE = 'content/recordatorios-web.yaml';

const withLink = z
  .string()
  .min(20)
  .max(400)
  .refine((text) => text.includes('{link}'), 'Tiene que incluir {link}');

const remindersSchema = z.strictObject({
  revision: z.enum(['borrador', 'aprobada']),
  invitacion: withLink,
  leccion_del_dia: withLink,
  leccion_sin_terminar: withLink,
});

export type ReminderTexts = z.infer<typeof remindersSchema>;

export function parseReminderTexts(yamlText: string): ReminderTexts {
  return remindersSchema.parse(parse(yamlText));
}

export function loadReminderTexts(): ReminderTexts {
  return parseReminderTexts(readFileSync(REMINDERS_FILE, 'utf8'));
}

export interface ReminderInput {
  code: string;
  /** Participante demo: nunca recibe recordatorios. */
  demo?: boolean;
  link: string | null;
  /** null si la persona pidió la BAJA. */
  state: WebState | null;
}

export interface Reminder {
  code: string;
  /** null: hoy no hay que escribirle. */
  text: string | null;
  note: string;
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

// Decide, persona por persona, qué mandarle hoy. Sin insistir de más: a quien ya hizo la lección,
// terminó el curso o se dio de baja, no se le escribe.
export function buildReminders(inputs: ReminderInput[], texts: ReminderTexts): Reminder[] {
  return inputs
    .filter((input) => !input.demo)
    .map(({ code, link, state }): Reminder => {
      if (!link || !state) return { code, text: null, note: 'Se dio de baja: no escribirle' };

      if (state.phase !== 'active') {
        const note =
          state.phase === 'welcome' ? 'Todavía no entró' : 'Entró, pero no aceptó todavía';
        return { code, text: fill(texts.invitacion, { link }), note };
      }

      const lesson = state.lesson;
      switch (lesson?.kind) {
        case 'ready':
          return {
            code,
            text: fill(texts.leccion_del_dia, {
              link,
              numero: String(lesson.lessonNumber),
              titulo: lesson.lessonTitle,
            }),
            note: `Lección ${lesson.lessonNumber}`,
          };
        case 'in_lesson':
          return {
            code,
            text: fill(texts.leccion_sin_terminar, { link, titulo: lesson.lessonTitle }),
            note: 'Tiene una lección empezada',
          };
        case 'done_today':
          return { code, text: null, note: 'Ya hizo la lección de hoy' };
        default:
          return { code, text: null, note: 'Terminó todas las lecciones' };
      }
    });
}
