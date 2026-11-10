import type { Lesson } from '../src/modules/lessons/lesson.schema.js';

export const sampleLesson: Lesson = {
  id: 'n1-l01-prueba',
  version: 1,
  level: 1,
  order: 1,
  kind: 'regular',
  review: 'draft',
  title: 'Lección de prueba',
  achievement: 'Probar el motor',
  introScript: 'Hoy vamos a practicar.',
  practiceFocus: 'Que pida algo concreto.',
  improvedExample: 'Explicame como si no supiera nada.',
  challengeText: 'Ahora probalo en la IA que tengas.',
  challengeSafetyReminder: 'No pongas datos personales.',
  closingDone: '¡Muy bien!',
  closingNotDone: 'No pasa nada, mañana seguimos.',
};
