// Herramientas del piloto web. Sin nombres ni teléfonos: el equipo relaciona cada código (P01,
// P02...) con la persona en su propia planilla, fuera del sistema.
//   npm run pilot -- crear <cantidad>         crea participantes y muestra sus links
//   npm run pilot -- listar                   código, estado, último ingreso y link
//   npm run pilot -- recordatorios [AAAA-MM-DD] [--forzar]
//                                              texto del día para mandar a mano por WhatsApp
//   npm run pilot -- nuevo-link <código>      cambia el link (el viejo deja de andar)
//   npm run pilot -- baja <código>            borra los datos, si la persona lo pide por otra vía
//   npm run pilot -- demo                     crea un participante demo (D01...) para presentaciones:
//                                              sin espera entre lecciones, con atajos en el Menú y
//                                              fuera de las métricas y los recordatorios
// Contra producción: CHARLA_ENV_FILE=.env.produccion npm run pilot -- listar
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildServices } from '../src/composition.js';
import { loadEnv } from '../src/config/env.js';
import {
  createLessonCalendar,
  parseHolidays,
  toLocalDay,
} from '../src/modules/streaks/lesson-calendar.js';
import { webContact } from '../src/modules/users/contact.js';
import {
  closeParticipant,
  createParticipants,
  findParticipantByCode,
  listParticipants,
  participantLink,
  replaceToken,
} from '../src/modules/web/participants.repository.js';
import { buildReminders, loadReminderTexts } from '../src/modules/web/reminders.js';
import { createWebBackend } from '../src/modules/web/web-backend.js';
import { createDatabase, createOrm } from '../src/shared/db/database.js';

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL);
const services = buildServices(env, createOrm(database));
const { orm, keys } = services;
const backend = createWebBackend({
  orm,
  keys,
  router: services.webRouter,
  demo: services.demo,
});
const [command, argument, ...flags] = process.argv.slice(2);
const link = (token: string) => participantLink(env.PUBLIC_BASE_URL, token);
const PHASES = { welcome: 'Todavía no entró', consent: 'Falta que acepte', active: 'Activo' };
const formatDate = (date: Date | null) =>
  date ? date.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '—';

async function create(count: number): Promise<void> {
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new Error('Indicá cuántos participantes crear, entre 1 y 100.');
  }
  const created = await createParticipants(orm, keys, count, new Date());
  console.log(
    `Creé ${created.length} participante(s). Anotá en tu planilla a quién le das cada link:\n`,
  );
  for (const participant of created) console.log(`${participant.code}  ${link(participant.token)}`);
}

async function createDemo(): Promise<void> {
  const [created] = await createParticipants(orm, keys, 1, new Date(), { demo: true });
  if (!created) throw new Error('No se pudo crear el participante demo.');
  console.log(
    `Creé el participante demo ${created.code}. Es solo para presentaciones: no cuenta en las ` +
      `métricas ni recibe recordatorios.\n\n${link(created.token)}`,
  );
}

async function list(): Promise<void> {
  const participants = await listParticipants(orm, keys);
  if (participants.length === 0)
    return console.log('No hay participantes. Crealos con: npm run pilot -- crear 10');

  const now = new Date();
  for (const participant of participants) {
    if (!participant.token || participant.closedAt) {
      console.log(`${participant.code}  Se dio de baja el ${formatDate(participant.closedAt)}`);
      continue;
    }
    const state = await backend.state(participant, now);
    const lesson =
      state.lesson?.kind === 'ready'
        ? `próxima: lección ${state.lesson.lessonNumber}`
        : state.lesson?.kind === 'in_lesson'
          ? 'con una lección empezada'
          : state.lesson?.kind === 'done_today'
            ? 'hizo la lección de hoy'
            : state.lesson?.kind === 'all_done'
              ? 'terminó todo'
              : '';
    console.log(
      `${participant.code}${participant.demo ? ' (demo)' : ''}  ${PHASES[state.phase]}${lesson ? `, ${lesson}` : ''}. Racha: ${state.streak}. ` +
        `Último ingreso: ${formatDate(participant.lastSeenAt)}\n      ${link(participant.token)}`,
    );
  }
}

async function reminders(dayArgument: string | undefined, force: boolean): Promise<void> {
  const calendar = createLessonCalendar(
    parseHolidays(readFileSync('content/feriados.yaml', 'utf8')),
  );
  const now = dayArgument ? new Date(`${dayArgument}T15:00:00Z`) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error('La fecha va como AAAA-MM-DD.');
  const day = toLocalDay(now);

  if (!calendar.isLessonDay(day) && !force) {
    console.log(`El ${day} no hay lección (fin de semana o feriado): hoy no se manda nada.`);
    console.log('Si igual querés los textos, agregá --forzar.');
    return;
  }

  // El servidor gratuito se duerme: lo despertamos antes de que lleguen los primeros toques.
  await fetch(`${env.PUBLIC_BASE_URL}/ping`, { signal: AbortSignal.timeout(90_000) }).catch(
    () => {},
  );

  const participants = await listParticipants(orm, keys);
  const inputs = [];
  for (const participant of participants) {
    const open = participant.token && !participant.closedAt;
    inputs.push({
      code: participant.code,
      demo: participant.demo,
      link: open ? link(participant.token!) : null,
      state: open ? await backend.state(participant, now) : null,
    });
  }

  const result = buildReminders(inputs, loadReminderTexts());
  const blocks = result.map(({ code, text, note }) =>
    text ? `=== ${code} (${note}) ===\n${text}\n` : `=== ${code}: no mandar. ${note}. ===\n`,
  );
  const toSend = result.filter((reminder) => reminder.text).length;
  const output = `Recordatorios del ${day}. Hay que mandar ${toSend} de ${result.length}.\n\n${blocks.join('\n')}`;

  console.log(output);
  mkdirSync('var/recordatorios', { recursive: true });
  const file = `var/recordatorios/${day}.txt`;
  writeFileSync(file, output);
  console.log(`También quedó guardado en ${file} (fuera del repositorio).`);
}

async function newLink(code: string | undefined): Promise<void> {
  const participant = code && (await findParticipantByCode(orm, code));
  if (!participant) throw new Error('No existe ese código.');
  const token = await replaceToken(orm, keys, participant.id);
  console.log(`${participant.code}: el link anterior ya no funciona. El nuevo es:\n${link(token)}`);
}

async function unsubscribe(code: string | undefined): Promise<void> {
  const participant = code && (await findParticipantByCode(orm, code));
  if (!participant) throw new Error('No existe ese código.');
  const now = new Date();
  await services.webRouter.forget(webContact(participant.id), now);
  await closeParticipant(orm, participant.id, now);
  console.log(`${participant.code}: borramos sus datos y su link dejó de funcionar.`);
}

try {
  if (command === 'crear') await create(Number(argument));
  else if (command === 'listar') await list();
  else if (command === 'recordatorios') {
    const day = argument && !argument.startsWith('--') ? argument : undefined;
    await reminders(day, [argument, ...flags].includes('--forzar'));
  } else if (command === 'nuevo-link') await newLink(argument);
  else if (command === 'baja') await unsubscribe(argument);
  else if (command === 'demo') await createDemo();
  else {
    console.log(
      'Usá: npm run pilot -- crear <cantidad> | listar | recordatorios [AAAA-MM-DD] [--forzar] | nuevo-link <código> | baja <código> | demo',
    );
  }
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  await database.end();
}
