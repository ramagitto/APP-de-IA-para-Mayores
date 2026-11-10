import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const userStatus = pgEnum('user_status', ['onboarding', 'active', 'paused']);

export const consentType = pgEnum('consent_type', [
  'terms_and_privacy',
  'whatsapp_opt_in',
  'sponsor_sharing',
]);

export const lessonAttemptState = pgEnum('lesson_attempt_state', [
  'awaiting_practice',
  'awaiting_challenge_report',
  'completed',
  'abandoned',
]);

export const lessonTrigger = pgEnum('lesson_trigger', ['user_message', 'reminder']);

export const challengeOutcome = pgEnum('challenge_outcome', ['done', 'not_done']);

// El contacto (teléfono o id de WhatsApp, ver users/contact.ts) se guarda cifrado. El hash
// permite buscarlo sin descifrar toda la tabla. Las columnas conservan el nombre "phone" de la
// Fase 1, para no migrar datos; en el código se llaman "contact".
export const users = pgTable(
  'users',
  {
    id: uuid().primaryKey().defaultRandom(),
    contactHash: text('phone_hash').notNull().unique(),
    contactEncrypted: text('phone_encrypted').notNull(),
    firstName: text('first_name'),
    reminderHour: smallint('reminder_hour').notNull().default(10),
    status: userStatus().notNull().default('onboarding'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('users_reminder_hour_valid', sql`${table.reminderHour} between 0 and 23`)],
);

export const consents = pgTable(
  'consents',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: consentType().notNull(),
    version: text().notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('consents_one_active_per_type')
      .on(table.userId, table.type)
      .where(sql`${table.revokedAt} is null`),
  ],
);

export const lessonAttempts = pgTable(
  'lesson_attempts',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lessonId: text('lesson_id').notNull(),
    lessonVersion: integer('lesson_version').notNull(),
    state: lessonAttemptState().notNull(),
    trigger: lessonTrigger().notNull(),
    paidMessagesUsed: smallint('paid_messages_used').notNull(),
    practiceAttempts: smallint('practice_attempts').notNull().default(0),
    challengeOutcome: challengeOutcome('challenge_outcome'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    abandonedAt: timestamp('abandoned_at', { withTimezone: true }),
  },
  (table) => [
    check('lesson_attempts_message_budget', sql`${table.paidMessagesUsed} between 0 and 5`),
    uniqueIndex('lesson_attempts_one_open_per_user')
      .on(table.userId)
      .where(sql`${table.state} in ('awaiting_practice', 'awaiting_challenge_report')`),
  ],
);

export const streaks = pgTable('streaks', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  current: integer().notNull().default(0),
  best: integer().notNull().default(0),
  lastCompletedDay: date('last_completed_day'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Costo de cada llamada a un proveedor de IA. Si la persona se da de baja, la fila queda sin
// usuario (SET NULL): el costo sigue sirviendo para las métricas, pero ya no es un dato personal.
export const usageCosts = pgTable(
  'usage_costs',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    day: date().notNull(),
    provider: text().notNull(),
    model: text().notNull(),
    purpose: text().notNull(),
    inputTokens: integer('input_tokens').notNull(),
    outputTokens: integer('output_tokens').notNull(),
    cacheReadTokens: integer('cache_read_tokens').notNull(),
    cacheWriteTokens: integer('cache_write_tokens').notNull(),
    // Millonésimos de dólar, redondeados hacia arriba: evita errores de redondeo con decimales.
    costUsdMicros: integer('cost_usd_micros').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('usage_costs_user_day').on(table.userId, table.day)],
);

// Alta en curso, antes del consentimiento. Guarda lo mínimo: el hash del contacto y cuántas
// veces se pidió el consentimiento. Si la persona no acepta, se borra.
export const pendingSignups = pgTable('pending_signups', {
  contactHash: text('contact_hash').primaryKey(),
  promptsSent: smallint('prompts_sent').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const supportReason = pgEnum('support_reason', ['ayuda', 'care']);
export const supportStatus = pgEnum('support_status', ['open', 'closed']);

// Pedidos de hablar con una persona del equipo: la palabra AYUDA o un mensaje de cuidado.
// Se guarda el contacto cifrado, porque hace falta para responder.
export const supportRequests = pgTable(
  'support_requests',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    contactHash: text('contact_hash').notNull(),
    contactEncrypted: text('contact_encrypted').notNull(),
    reason: supportReason().notNull(),
    status: supportStatus().notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
  },
  (table) => [index('support_requests_status').on(table.status, table.createdAt)],
);

export const inboundStatus = pgEnum('inbound_status', ['received', 'processed', 'ignored']);

// Mensajes que llegan por el webhook. El id del proveedor es único: si Meta reintenta, no se
// procesa dos veces. El contenido va cifrado y se borra apenas se procesa.
export const inboundEvents = pgTable('inbound_events', {
  id: uuid().primaryKey().defaultRandom(),
  providerMessageId: text('provider_message_id').notNull().unique(),
  contactHash: text('contact_hash').notNull(),
  payloadEncrypted: text('payload_encrypted'),
  status: inboundStatus().notNull().default('received'),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
});

export const outboundStatus = pgEnum('outbound_status', ['pending', 'sent']);

// Respuestas, guardadas antes de enviarlas: si un envío falla, el reintento manda solo las que
// faltan y no vuelve a correr la lección. El texto cifrado se borra al enviar.
export const outboundMessages = pgTable(
  'outbound_messages',
  {
    id: uuid().primaryKey().defaultRandom(),
    inboundEventId: uuid('inbound_event_id')
      .notNull()
      .references(() => inboundEvents.id, { onDelete: 'cascade' }),
    position: smallint().notNull(),
    contactHash: text('contact_hash').notNull(),
    kind: text().notNull(),
    bodyEncrypted: text('body_encrypted'),
    audioId: text('audio_id'),
    status: outboundStatus().notNull().default('pending'),
    providerMessageId: text('provider_message_id'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('outbound_messages_event_position').on(table.inboundEventId, table.position),
  ],
);
