import { describe, expect, it } from 'vitest';
import { createLessonCalendar } from '../streaks/lesson-calendar.js';
import { EMPTY_STREAK } from '../streaks/streak.js';
import {
  isOpen,
  type LessonTrigger,
  MAX_PAID_MESSAGES,
  type OutgoingMessage,
  startAttempt,
} from './lesson-attempt.js';
import { handleUserMessage } from './lesson-flow.js';
import { loadLessons } from './lesson.loader.js';
import { SimulatedTutor } from './tutor.js';

// Estos tests corren sobre las lecciones reales, no sobre ejemplos.
const lessons = loadLessons('content/lessons');
const now = new Date('2027-05-03T13:00:00-03:00');
const calendar = createLessonCalendar();
const tutor = new SimulatedTutor();

// Un pedido corto fuerza el camino más caro: el tutor pide reintentar siempre que puede.
const SHORT_REQUEST = 'hola';
const CLEAR_REQUEST = 'Explicame esto como si no supiera nada, con un ejemplo';

async function play(lessonIndex: number, trigger: LessonTrigger, userText: string) {
  const lesson = lessons[lessonIndex];
  if (!lesson) throw new Error('No existe esa lección');

  const started = startAttempt({ lesson, trigger, now });
  const messages: OutgoingMessage[] = [...started.messages];
  let attempt = started.attempt;
  let streak = EMPTY_STREAK;

  while (isOpen(attempt)) {
    const text = attempt.state === 'awaiting_practice' ? userText : 'Sí, listo';
    const turn = await handleUserMessage({
      attempt,
      lesson,
      text,
      streak,
      tutor,
      calendar,
      now,
    });

    attempt = turn.attempt;
    streak = turn.streak;
    messages.push(...turn.messages);
  }

  return { attempt, messages, streak };
}

describe('currículo del piloto', () => {
  it('tiene 10 lecciones de nivel 1, en orden del 1 al 10', () => {
    expect(lessons.map((lesson) => [lesson.level, lesson.order])).toEqual(
      Array.from({ length: 10 }, (_, index) => [1, index + 1]),
    );
  });

  it('tiene 8 lecciones regulares y 2 antiestafas', () => {
    expect(lessons.filter((lesson) => lesson.kind === 'regular')).toHaveLength(8);
    expect(lessons.filter((lesson) => lesson.kind === 'antiscam')).toHaveLength(2);
  });

  it('presenta la regla de no compartir datos antes de la cuarta lección', () => {
    const firstAntiscam = lessons.find((lesson) => lesson.kind === 'antiscam');

    expect(firstAntiscam?.order).toBeLessThanOrEqual(3);
  });
});

describe.each(lessons.map((lesson, index) => [lesson.id, index] as const))('%s', (_id, index) => {
  it.each([
    ['escribió el usuario, pedido claro', 'user_message', CLEAR_REQUEST, 4],
    ['escribió el usuario, pedido corto', 'user_message', SHORT_REQUEST, 5],
    ['hubo recordatorio, pedido claro', 'reminder', CLEAR_REQUEST, 5],
    ['hubo recordatorio, pedido corto', 'reminder', SHORT_REQUEST, 5],
  ] as const)('se completa sin pasar el tope: %s', async (_case, trigger, text, expected) => {
    const { attempt, streak } = await play(index, trigger, text);

    expect(attempt.state).toBe('completed');
    expect(attempt.paidMessagesUsed).toBe(expected);
    expect(attempt.paidMessagesUsed).toBeLessThanOrEqual(MAX_PAID_MESSAGES);
    expect(streak.current).toBe(1);
  });

  it('recorre intro, práctica, desafío y cierre en ese orden', async () => {
    const { messages } = await play(index, 'user_message', CLEAR_REQUEST);

    expect(messages.map((message) => message.kind)).toEqual([
      'intro',
      'feedback',
      'challenge',
      'closing',
    ]);
    expect(messages[0]?.format).toBe('audio');
  });

  // El texto entre comillas se ignora: las lecciones antiestafas citan mensajes de estafadores.
  it('ningún mensaje pide datos sensibles al usuario', async () => {
    const { messages } = await play(index, 'user_message', CLEAR_REQUEST);
    const asksForData =
      /\b(pasame|mandame|decime|escribime|dame|enviame) (tu|tus) (clave|claves|c[oó]digo|contrase[nñ]a|tarjeta|dni|documento|cuenta|cbu)/i;

    for (const message of messages) {
      expect(message.text.replace(/"[^"]*"/g, '')).not.toMatch(asksForData);
    }
  });
});
