// Valida las lecciones y los feriados: npm run lessons:check
import { readFileSync } from 'node:fs';
import { readLessonSources, validateLessons } from '../src/modules/lessons/lesson.loader.js';
import { parseHolidays } from '../src/modules/streaks/lesson-calendar.js';

const { lessons, errors } = validateLessons(readLessonSources('content/lessons'));

try {
  parseHolidays(readFileSync('content/feriados.yaml', 'utf8'));
} catch (error) {
  errors.push(`content/feriados.yaml: ${(error as Error).message}`);
}

if (errors.length > 0) {
  console.error(`Encontré ${errors.length} problema(s):\n`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const drafts = lessons.filter((lesson) => lesson.review === 'draft').length;

console.log(`${lessons.length} lecciones válidas. Sin revisar todavía: ${drafts}.`);
