import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { buildServices } from '../../composition.js';
import { loadEnv } from '../../config/env.js';
import { createDatabase, createOrm } from '../../shared/db/database.js';
import { productEvents, supportRequests } from '../../shared/db/schema.js';
import { loadCosts, loadEvents } from '../metrics/metrics.repository.js';
import { DbCostLedger } from '../tutor/usage-costs.repository.js';
import { hashContact, webContact } from '../users/contact.js';
import { findUserByContact } from '../users/users.repository.js';
import { createParticipants, type Participant } from '../web/participants.repository.js';
import { createWebBackend } from '../web/web-backend.js';

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL);
// El armado real, como en el servidor: router del piloto y router demo.
const services = buildServices(env, createOrm(database));
const { orm, keys } = services;
const backend = createWebBackend({ orm, keys, router: services.webRouter, demo: services.demo });

// Un sábado: el piloto no tiene lección, el demo sí.
const saturday = new Date('2027-05-08T11:00:00-03:00');
const monday = new Date('2027-05-10T11:00:00-03:00');
const practice = 'Tengo papas y huevos, ¿qué puedo cocinar hoy para dos personas?';

afterAll(async () => {
  await database.end();
});

async function participant(demo: boolean, now: Date) {
  const [created] = await createParticipants(orm, keys, 1, now, { demo });
  return created!;
}

const send = (who: Participant, text: string, now: Date) => backend.handle(who, { text, now });

async function accept(who: Participant, now: Date) {
  await send(who, 'Hola', now);
  await send(who, 'ACEPTO', now);
}

async function userIdOf(who: Participant): Promise<string | undefined> {
  return (await findUserByContact(orm, keys, webContact(who.id)))?.id;
}

describe('participante demo', () => {
  const demoUserIds: string[] = [];

  it('se crea con código D y su estado trae la lista de lecciones del nivel 1', async () => {
    const demo = await participant(true, saturday);
    expect(demo.code).toMatch(/^D\d{2,}$/);
    expect(demo.demo).toBe(true);

    const state = await backend.state(demo, saturday, { opened: true });
    expect(state.demo?.lessons).toHaveLength(10);
  });

  it('hace varias lecciones el mismo día, aunque sea sábado', async () => {
    const demo = await participant(true, saturday);
    await accept(demo, saturday);
    demoUserIds.push((await userIdOf(demo))!);

    for (const number of [1, 2]) {
      await send(demo, 'Empezar la lección', saturday);
      await send(demo, practice, saturday);
      await send(demo, 'Sí, lo hice', saturday);
      const state = await backend.state(demo, saturday);
      expect(state.progress?.completed).toBe(number);
      expect(state.lesson).toMatchObject({ kind: 'ready', lessonNumber: number + 1 });
    }
  });

  it('los atajos llevan a cada etapa', async () => {
    const demo = await participant(true, saturday);
    await accept(demo, saturday);
    demoUserIds.push((await userIdOf(demo))!);

    await backend.demo(demo, 'progress', saturday);
    let state = await backend.state(demo, saturday);
    expect(state.progress?.completed).toBe(6);
    expect(state.streak).toBe(7);
    expect(state.lesson).toMatchObject({ kind: 'ready', lessonNumber: 7 });

    await backend.demo(demo, 'lesson', saturday, 'n1-l05-no-rompes-nada');
    state = await backend.state(demo, saturday);
    expect(state.lesson).toMatchObject({ kind: 'in_lesson', step: 'practice', lessonNumber: 5 });

    await backend.demo(demo, 'antiscam', saturday);
    state = await backend.state(demo, saturday);
    expect(state.lesson).toMatchObject({ kind: 'in_lesson', lessonTitle: 'Mensajes sospechosos' });

    const challenge = await backend.demo(demo, 'challenge', saturday);
    expect(challenge).toMatchObject({ messages: [{ kind: 'challenge' }] });
    state = await backend.state(demo, saturday);
    expect(state.lesson).toMatchObject({ kind: 'in_lesson', step: 'challenge' });
    expect(state.streak).toBe(3);

    await backend.demo(demo, 'end', saturday);
    const closing = await send(demo, 'Sí, lo hice', saturday);
    expect(closing.messages[0]?.text).toContain('10 lecciones seguidas');
    state = await backend.state(demo, saturday);
    expect(state.progress).toEqual({ completed: 10, total: 10 });
    expect(state.lesson).toEqual({ kind: 'all_done' });

    expect(await backend.demo(demo, 'lesson', saturday, 'no-existe')).toBe('unknown_lesson');

    await backend.demo(demo, 'restart', saturday);
    state = await backend.state(demo, saturday);
    expect(state.phase).toBe('welcome');
    // El link sigue andando.
    expect(await backend.findParticipant(demo.token)).toBeDefined();
  });

  it('los atajos no saltean el consentimiento', async () => {
    const demo = await participant(true, saturday);
    expect(await backend.demo(demo, 'progress', saturday)).toBe('needs_consent');
    expect(await userIdOf(demo)).toBeUndefined();
  });

  it('las reglas de seguridad, AYUDA y BAJA siguen igual', async () => {
    const demo = await participant(true, saturday);
    await accept(demo, saturday);
    demoUserIds.push((await userIdOf(demo))!);
    await backend.demo(demo, 'antiscam', saturday);

    const care = await send(demo, 'Me quiero morir, ya no aguanto más', saturday);
    expect(care.messages[0]?.kind).toBe('care');

    await send(demo, 'AYUDA', saturday);
    const requests = await orm
      .select({ reason: supportRequests.reason })
      .from(supportRequests)
      .where(eq(supportRequests.contactHash, hashContact(webContact(demo.id), keys)));
    expect(requests.map((request) => request.reason).sort()).toEqual(['ayuda', 'care']);

    const goodbye = await send(demo, 'BAJA', saturday);
    expect(goodbye.forgotten).toBe(true);
    expect(await backend.findParticipant(demo.token)).toBeUndefined();
  });

  it('no deja ningún evento ni costo en las métricas', async () => {
    expect(demoUserIds).toHaveLength(3);
    const rows = await orm
      .select()
      .from(productEvents)
      .where(inArray(productEvents.subjectId, demoUserIds));
    expect(rows).toEqual([]);

    const events = await loadEvents(orm);
    expect(events.some((event) => demoUserIds.includes(event.subjectId))).toBe(false);

    // El gasto del demo queda marcado y fuera del costo del piloto.
    const before = await loadCosts(orm);
    await new DbCostLedger(orm, { demo: true }).record({
      userId: demoUserIds[0]!,
      day: '2027-05-08',
      provider: 'mock',
      model: 'mock',
      purpose: 'tutor_review',
      usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 },
      costUsd: 0.5,
    });
    const after = await loadCosts(orm);
    expect(after.totalUsd).toBeCloseTo(before.totalUsd);
    expect(after.bySubject.has(demoUserIds[0]!)).toBe(false);
  });
});

describe('participante real', () => {
  it('no puede usar los atajos ni recibe nada del modo demo', async () => {
    const real = await participant(false, monday);
    expect(real.code).toMatch(/^P\d{2,}$/);
    await accept(real, monday);

    expect(await backend.demo(real, 'progress', monday)).toBe('not_demo');
    const state = await backend.state(real, monday, { opened: true });
    expect(state).not.toHaveProperty('demo');
    expect(state.progress?.completed).toBe(0);
  });

  it('sigue con una lección por día y anota sus eventos', async () => {
    const real = await participant(false, monday);
    await accept(real, monday);
    await send(real, 'Empezar la lección', monday);
    await send(real, practice, monday);
    await send(real, 'Sí, lo hice', monday);

    const state = await backend.state(real, monday);
    expect(state.lesson).toEqual({ kind: 'done_today' });

    const userId = (await userIdOf(real))!;
    const rows = await orm
      .select({ type: productEvents.type })
      .from(productEvents)
      .where(and(eq(productEvents.subjectId, userId), eq(productEvents.type, 'lesson_completed')));
    expect(rows).toHaveLength(1);
  });
});
