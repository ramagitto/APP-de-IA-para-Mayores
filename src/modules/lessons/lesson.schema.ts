import { z } from 'zod';

// Las claves del YAML están en español porque las edita el equipo de contenidos.
// Un audio de 40 segundos tiene unos 600 caracteres: de ahí sale el límite del guion.
const lessonFileSchema = z.strictObject({
  id: z.string().regex(/^n[1-5]-l\d{2}-[a-z0-9-]+$/, 'Debe tener la forma n1-l01-nombre-corto'),
  version: z.number().int().min(1),
  nivel: z.number().int().min(1).max(5),
  orden: z.number().int().min(1),
  tipo: z.enum(['regular', 'antiestafa']),
  revision: z.enum(['borrador', 'aprobada']),
  titulo: z.string().min(3).max(80),
  logro: z.string().min(3).max(160),
  intro: z.strictObject({
    guion: z.string().min(120).max(650),
  }),
  practica: z.strictObject({
    foco: z.string().min(10).max(300),
    ejemplo_mejorado: z.string().min(10).max(300),
  }),
  desafio: z.strictObject({
    consigna: z.string().min(40).max(500),
    recordatorio_seguridad: z.string().min(10).max(200),
  }),
  cierre: z.strictObject({
    si_pudo: z.string().min(10).max(300),
    si_no_pudo: z.string().min(10).max(300),
  }),
});

export type LessonFile = z.infer<typeof lessonFileSchema>;

export interface Lesson {
  id: string;
  version: number;
  level: number;
  order: number;
  kind: 'regular' | 'antiscam';
  review: 'draft' | 'approved';
  title: string;
  achievement: string;
  introScript: string;
  practiceFocus: string;
  improvedExample: string;
  challengeText: string;
  challengeSafetyReminder: string;
  closingDone: string;
  closingNotDone: string;
}

export const lessonSchema = lessonFileSchema.transform((file): Lesson => ({
  id: file.id,
  version: file.version,
  level: file.nivel,
  order: file.orden,
  kind: file.tipo === 'antiestafa' ? 'antiscam' : 'regular',
  review: file.revision === 'aprobada' ? 'approved' : 'draft',
  title: file.titulo,
  achievement: file.logro,
  introScript: file.intro.guion,
  practiceFocus: file.practica.foco,
  improvedExample: file.practica.ejemplo_mejorado,
  challengeText: file.desafio.consigna,
  challengeSafetyReminder: file.desafio.recordatorio_seguridad,
  closingDone: file.cierre.si_pudo,
  closingNotDone: file.cierre.si_no_pudo,
}));
