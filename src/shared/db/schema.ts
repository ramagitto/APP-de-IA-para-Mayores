import { sql } from 'drizzle-orm';
import {
  check,
  date,
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

// El teléfono se guarda cifrado. El hash permite buscarlo sin descifrar toda la tabla.
export const users = pgTable(
  'users',
  {
    id: uuid().primaryKey().defaultRandom(),
    phoneHash: text('phone_hash').notNull().unique(),
    phoneEncrypted: text('phone_encrypted').notNull(),
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
