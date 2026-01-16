// packages/database/src/schema/reminders.ts
// Reminders table as defined in docs/specs/data-model.md §4.11

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const reminders = pgTable(
  'reminders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Content
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),

    // Schedule
    remindAt: timestamp('remind_at', { withTimezone: true }).notNull(),

    // Repeat
    repeatPattern: varchar('repeat_pattern', { length: 50 }), // 'daily', 'weekly', 'monthly', null
    repeatUntil: timestamp('repeat_until', { withTimezone: true }),

    // Status
    completed: boolean('completed').notNull().default(false),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Metadata
    metadata: jsonb('metadata'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('reminders_user_id_idx').on(table.userId),
    index('reminders_remind_at_idx').on(table.remindAt),
    index('reminders_completed_idx').on(table.completed),
  ]
);

// Types
export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
