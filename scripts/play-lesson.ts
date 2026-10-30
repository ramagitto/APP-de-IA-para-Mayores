// Recorre una lección por consola, sin base de datos ni IA.
//   npm run lesson:play                         Lista las lecciones
//   npm run lesson:play -- n1-l01               Juega la que empieza con ese id
//   npm run lesson:play -- n1-l01 --recordatorio Simula que arrancó por un recordatorio
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { isOpen, startAttempt } from '../src/modules/lessons/lesson-attempt.js';
import type { OutgoingMessage } from '../src/modules/lessons/lesson-attempt.js';
import { handleUserMessage } from '../src/modules/lessons/lesson-flow.js';
import { loadLessons } from '../src/modules/lessons/lesson.loader.js';
import { SimulatedTutor } from '../src/modules/lessons/tutor.js';
import { createLessonCalendar, parseHolidays } from '../src/modules/streaks/lesson-calendar.js';
import { EMPTY_STREAK } from '../src/modules/streaks/streak.js';

const lessons = loadLessons('content/lessons');
const [query] = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
const trigger = process.argv.includes('--recordatorio') ? 'reminder' : 'user_message';

if (!query) {
  console.log('Lecciones disponibles:\n');
  for (const lesson of lessons) console.log(`  ${lesson.id}  ${lesson.title}`);
  console.log('\nUsá: npm run lesson:play -- n1-l01');
  process.exit(0);
}

const lesson = lessons.find((candidate) => candidate.id.startsWith(query));

if (!lesson) {
  console.error(`No encontré una lección que empiece con "${query}".`);
  process.exit(1);
}

function show(messages: OutgoingMessage[]): void {
  for (const message of messages) {
    console.log(`\nCharlá [${message.kind}, ${message.format}]:\n${message.text}`);
  }
}

const calendar = createLessonCalendar(parseHolidays(readFileSync('content/feriados.yaml', 'utf8')));
const tutor = new SimulatedTutor();
const readline = createInterface({ input: process.stdin, output: process.stdout });
const lines = readline[Symbol.asyncIterator]();

const started = startAttempt({ lesson, trigger, now: new Date() });
let attempt = started.attempt;
let streak = EMPTY_STREAK;

console.log(`Lección: ${lesson.title}. Logro: ${lesson.achievement}`);
if (trigger === 'reminder') console.log('(Arrancó por un recordatorio: ya se pagó un mensaje.)');
show(started.messages);

while (isOpen(attempt)) {
  process.stdout.write('\nVos: ');
  const { value: text, done } = await lines.next();

  if (done) break;

  const turn = await handleUserMessage({
    attempt,
    lesson,
    text,
    streak,
    tutor,
    calendar,
    now: new Date(),
  });

  attempt = turn.attempt;
  streak = turn.streak;
  show(turn.messages);
}

readline.close();
console.log(`\nEstado final: ${attempt.state}. Mensajes pagos: ${attempt.paidMessagesUsed} de 5.`);
