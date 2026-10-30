import { describe, expect, it } from 'vitest';
import { sampleLesson as lesson } from '../../../test/fixtures.js';
import { createLessonCalendar } from '../streaks/lesson-calendar.js';
import { EMPTY_STREAK } from '../streaks/streak.js';
import { InvalidTransitionError, startAttempt } from './lesson-attempt.js';
import { classifyChallengeReport, handleUserMessage } from './lesson-flow.js';
import { SimulatedTutor } from './tutor.js';

const now = new Date('2027-05-03T13:00:00-03:00');
const clearRequest = 'Explicame qué es una factura de luz como si no supiera nada';

const base = {
  lesson,
  streak: EMPTY_STREAK,
  tutor: new SimulatedTutor(),
  calendar: createLessonCalendar(),
  now,
};

describe('handleUserMessage', () => {
  it('recorre una lección completa y actualiza la racha', async () => {
    const { attempt: started } = startAttempt({ lesson, trigger: 'user_message', now });

    const practice = await handleUserMessage({ ...base, attempt: started, text: clearRequest });
    expect(practice.attempt.state).toBe('awaiting_challenge_report');
    expect(practice.streak).toEqual(EMPTY_STREAK);

    const closing = await handleUserMessage({
      ...base,
      attempt: practice.attempt,
      text: 'Sí, ya lo hice',
    });

    expect(closing.attempt).toMatchObject({ state: 'completed', challengeOutcome: 'done' });
    expect(closing.streak).toMatchObject({ current: 1, lastCompletedDay: '2027-05-03' });
    expect(closing.messages[0]?.text).toContain('Arrancaste tu racha');
  });

  it('un pedido corto invita a reintentar', async () => {
    const { attempt } = startAttempt({ lesson, trigger: 'user_message', now });

    const result = await handleUserMessage({ ...base, attempt, text: 'hola' });

    expect(result.attempt.state).toBe('awaiting_practice');
    expect(result.messages[0]?.text).toContain('Probá de nuevo');
  });

  it('sin presupuesto, el tutor no invita a reintentar y sigue al desafío', async () => {
    const { attempt } = startAttempt({ lesson, trigger: 'reminder', now });

    const result = await handleUserMessage({ ...base, attempt, text: 'hola' });

    expect(result.attempt.state).toBe('awaiting_challenge_report');
    expect(result.messages[0]?.text).not.toContain('Probá de nuevo');
  });

  it('completa la lección aunque no haya podido con la IA real', async () => {
    const { attempt: started } = startAttempt({ lesson, trigger: 'user_message', now });
    const practice = await handleUserMessage({ ...base, attempt: started, text: clearRequest });

    const closing = await handleUserMessage({
      ...base,
      attempt: practice.attempt,
      text: 'No pude',
    });

    expect(closing.attempt.challengeOutcome).toBe('not_done');
    expect(closing.streak.current).toBe(1);
    expect(closing.messages[0]?.text).toContain(lesson.closingNotDone);
  });

  it('rechaza mensajes para una lección terminada', async () => {
    const { attempt: started } = startAttempt({ lesson, trigger: 'user_message', now });
    const practice = await handleUserMessage({ ...base, attempt: started, text: clearRequest });
    const closing = await handleUserMessage({ ...base, attempt: practice.attempt, text: 'Listo' });

    await expect(
      handleUserMessage({ ...base, attempt: closing.attempt, text: 'hola' }),
    ).rejects.toThrow(InvalidTransitionError);
  });
});

describe('classifyChallengeReport', () => {
  it.each([
    'Sí',
    'si, lo hice',
    'Listo',
    'ya está',
    'Me encantó',
    'no sabía que se podía, buenísimo',
    'no me imaginaba que era tan fácil',
  ])('toma "%s" como hecho', (text) => {
    expect(classifyChallengeReport(text)).toBe('done');
  });

  it.each([
    'No',
    'no pude',
    'No pude.',
    'NO',
    'Uy, no me salió',
    'la verdad no entendí',
    'no lo encontré',
    'No, me costó',
    'todavía no',
  ])('toma "%s" como no hecho', (text) => {
    expect(classifyChallengeReport(text)).toBe('not_done');
  });
});
