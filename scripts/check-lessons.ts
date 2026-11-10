// Valida el contenido editable: lecciones, feriados y líneas de ayuda. npm run lessons:check
import { readFileSync } from 'node:fs';
import { readLessonSources, validateLessons } from '../src/modules/lessons/lesson.loader.js';
import {
  HELPLINES_FILE,
  type Helplines,
  MAX_DAYS_SINCE_VERIFIED,
  parseHelplines,
  staleHelplines,
} from '../src/modules/safety/helplines.js';
import { CARE_MESSAGES_REVIEW } from '../src/modules/safety/safety-messages.js';
import { parseHolidays } from '../src/modules/streaks/lesson-calendar.js';

const { lessons, errors } = validateLessons(readLessonSources('content/lessons'));

try {
  parseHolidays(readFileSync('content/feriados.yaml', 'utf8'));
} catch (error) {
  errors.push(`content/feriados.yaml: ${(error as Error).message}`);
}

let helplines: Helplines | undefined;
try {
  helplines = parseHelplines(readFileSync(HELPLINES_FILE, 'utf8'));
} catch (error) {
  errors.push(`${HELPLINES_FILE}: ${(error as Error).message}`);
}

if (errors.length > 0) {
  console.error(`Encontré ${errors.length} problema(s):\n`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const drafts = lessons.filter((lesson) => lesson.review === 'draft').length;

console.log(`${lessons.length} lecciones válidas. Sin revisar todavía: ${drafts}.`);

// Avisos que no frenan la CI, pero que hay que resolver antes del piloto.
const stale = helplines ? staleHelplines(helplines, new Date()) : [];
for (const line of stale) {
  console.warn(
    `Aviso: la línea ${line.numero} se verificó hace más de ${MAX_DAYS_SINCE_VERIFIED} días (${line.verificado}).`,
  );
}

if (CARE_MESSAGES_REVIEW === 'borrador') {
  console.warn('Aviso: los mensajes de cuidado siguen en borrador. Se revisan antes del piloto.');
}
