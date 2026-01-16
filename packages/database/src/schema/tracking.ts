// packages/database/src/schema/tracking.ts
// Tracking entries table as defined in docs/specs/data-model.md §4.3

import {
  pgTable,
  uuid,
  decimal,
  varchar,
  date,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { trackingTypeEnum, lifeAreaEnum } from './enums';
import { users } from './users';

export const trackingEntries = pgTable(
  'tracking_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Type & Area
    type: trackingTypeEnum('type').notNull(),
    area: lifeAreaEnum('area').notNull(),

    // Value
    value: decimal('value', { precision: 10, scale: 2 }).notNull(),
    unit: varchar('unit', { length: 20 }),

    // Metadata specific by type
    // weight: {}
    // water: {}
    // expense: { category, description, currency }
    // exercise: { exerciseType, intensity, distance, calories }
    // sleep: { quality, bedtime, waketime }
    // mood/energy: { notes }
    metadata: jsonb('metadata').notNull().default({}),

    // Date/Time
    entryDate: date('entry_date').notNull(),
    entryTime: timestamp('entry_time', { withTimezone: true }),

    // Source (chat, form, api, telegram)
    source: varchar('source', { length: 50 }).notNull().default('form'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('tracking_entries_user_id_idx').on(table.userId),
    index('tracking_entries_user_id_type_idx').on(table.userId, table.type),
    index('tracking_entries_user_id_date_idx').on(table.userId, table.entryDate),
    index('tracking_entries_entry_date_idx').on(table.entryDate),
  ]
);

// Types
export type TrackingEntry = typeof trackingEntries.$inferSelect;
export type NewTrackingEntry = typeof trackingEntries.$inferInsert;
