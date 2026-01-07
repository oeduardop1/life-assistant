// packages/database/src/schema/calendar.ts
// Calendar events table as defined in DATA_MODEL.md §4.13

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

export const calendarEvents = pgTable(
  'calendar_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // External reference (Google Calendar)
    externalId: varchar('external_id', { length: 255 }).notNull(),
    calendarId: varchar('calendar_id', { length: 255 }).notNull(),

    // Event details
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    location: varchar('location', { length: 500 }),

    // Timing
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    isAllDay: boolean('is_all_day').notNull().default(false),
    timezone: varchar('timezone', { length: 50 }),

    // Recurrence
    isRecurring: boolean('is_recurring').notNull().default(false),
    recurrenceRule: varchar('recurrence_rule', { length: 255 }),

    // Status
    status: varchar('status', { length: 20 }).notNull().default('confirmed'), // confirmed, tentative, cancelled

    // Sync metadata
    syncedAt: timestamp('synced_at', { withTimezone: true }).notNull(),
    etag: varchar('etag', { length: 255 }),

    // Additional metadata from provider
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
    index('calendar_events_user_id_idx').on(table.userId),
    index('calendar_events_external_id_idx').on(table.externalId),
    index('calendar_events_start_time_idx').on(table.startTime),
    index('calendar_events_user_id_start_time_idx').on(
      table.userId,
      table.startTime
    ),
  ]
);

// Types
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type NewCalendarEvent = typeof calendarEvents.$inferInsert;
