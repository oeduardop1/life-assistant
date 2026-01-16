// packages/database/src/schema/notifications.ts
// Notifications table as defined in docs/specs/data-model.md §4.10

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { notificationTypeEnum, notificationStatusEnum } from './enums';
import { users } from './users';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Type & Content
    type: notificationTypeEnum('type').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body'),

    // Status
    status: notificationStatusEnum('status').notNull().default('pending'),

    // Scheduling
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),

    // Channels sent
    channels: jsonb('channels').notNull().default([]), // string[] ('push', 'telegram', 'email')

    // Link to related entity
    // { entityType: 'reminder', entityId: '...', url: '/reminders/...' }
    metadata: jsonb('metadata'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('notifications_user_id_idx').on(table.userId),
    index('notifications_status_idx').on(table.status),
    index('notifications_scheduled_for_idx').on(table.scheduledFor),
  ]
);

// Types
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
