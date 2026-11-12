// Atiende los pedidos de AYUDA y los avisos de mensajes de cuidado.
//   npm run support -- listar
//   npm run support -- responder <id> "texto"
//   npm run support -- cerrar <id>
// En WhatsApp, la respuesta sale desde el número de Charlá, así la persona nunca recibe mensajes
// de un número desconocido. En el piloto web se muestra el código del participante (P01...) y
// el equipo le escribe por WhatsApp común, con el teléfono de su planilla.
import { desc, eq } from 'drizzle-orm';
import { loadEnv } from '../src/config/env.js';
import {
  closeSupportRequest,
  listOpenSupportRequests,
  supportContact,
} from '../src/modules/support/support.repository.js';
import { hashContact, parseContact } from '../src/modules/users/contact.js';
import { phoneKeysFromBase64 } from '../src/modules/users/phone.js';
import { createWhatsAppApi } from '../src/modules/whatsapp/create-whatsapp.js';
import { createDatabase, createOrm } from '../src/shared/db/database.js';
import { inboundEvents, webParticipants } from '../src/shared/db/schema.js';

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL);
const orm = createOrm(database);
const keys = phoneKeysFromBase64(env.PHONE_ENCRYPTION_KEY, env.PHONE_HASH_KEY);
const [command, id, ...rest] = process.argv.slice(2);
const reasons = { ayuda: 'Pidió AYUDA', care: 'Mensaje de cuidado (prioridad)' };

// El código del participante web de un pedido, o undefined si es de WhatsApp.
async function webCode(requestId: string): Promise<string | undefined> {
  const contact = await supportContact(orm, keys, requestId);
  if (!contact) return undefined;
  const { kind, value } = parseContact(contact);
  if (kind !== 'web') return undefined;
  const [row] = await orm
    .select({ code: webParticipants.code })
    .from(webParticipants)
    .where(eq(webParticipants.id, value));
  return row?.code ?? 'participante sin código';
}

try {
  if (command === 'listar') {
    const open = await listOpenSupportRequests(orm);
    if (open.length === 0) console.log('No hay pedidos abiertos.');
    for (const request of open) {
      const who = await webCode(request.id);
      console.log(
        `${request.id}  ${request.createdAt.toLocaleString('es-AR')}  ${reasons[request.reason]}${who ? `  Web: ${who}, escribile por WhatsApp` : ''}`,
      );
    }
  } else if (command === 'responder' && id && rest.length > 0) {
    const contact = await supportContact(orm, keys, id);
    const api = createWhatsAppApi(env);
    if (!contact) throw new Error('No existe ese pedido');
    const code = await webCode(id);
    if (code)
      throw new Error(
        `Es del piloto web (${code}): escribile por WhatsApp común y después cerrá el pedido.`,
      );
    if (!api) throw new Error('WhatsApp no está configurado (WHATSAPP_PROVIDER)');

    // Fuera de la ventana de 24 horas solo se puede escribir con una plantilla aprobada.
    const [last] = await orm
      .select({ receivedAt: inboundEvents.receivedAt })
      .from(inboundEvents)
      .where(eq(inboundEvents.contactHash, hashContact(contact, keys)))
      .orderBy(desc(inboundEvents.receivedAt))
      .limit(1);
    const hours = last ? (Date.now() - last.receivedAt.getTime()) / 3_600_000 : Infinity;
    if (hours >= 24) {
      throw new Error(
        'Pasaron más de 24 horas desde su último mensaje: hay que usar la plantilla charla_respuesta_equipo (docs/plantillas-whatsapp.md).',
      );
    }

    await api.sendText(contact, rest.join(' '));
    console.log('Respuesta enviada.');
  } else if (command === 'cerrar' && id) {
    await closeSupportRequest(orm, id, new Date());
    console.log('Pedido cerrado.');
  } else {
    console.log('Usá: npm run support -- listar | responder <id> "texto" | cerrar <id>');
  }
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  await database.end();
}
