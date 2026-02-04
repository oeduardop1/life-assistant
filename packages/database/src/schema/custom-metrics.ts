// packages/database/src/schema/custom-metrics.ts
// Custom metric definitions table as defined in docs/specs/domains/tracking.md §4.2

import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { lifeAreaEnum, subAreaEnum } from './enums';
import { users } from './users';

/**
 * Custom metric definitions allow users to track any numeric value
 * not covered by built-in tracking types (weight, water, sleep, etc.).
 *
 * @see docs/specs/domains/tracking.md §4.2
 */
export const customMetricDefinitions = pgTable(
  'custom_metric_definitions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Definition
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    icon: varchar('icon', { length: 50 }).notNull().default('📊'),
    color: varchar('color', { length: 7 }),
    unit: varchar('unit', { length: 20 }).notNull(),

    // Validation (optional)
    minValue: decimal('min_value', { precision: 10, scale: 2 }),
    maxValue: decimal('max_value', { precision: 10, scale: 2 }),

    // Categorization (ADR-017)
    area: lifeAreaEnum('area').notNull().default('learning'),
    subArea: subAreaEnum('sub_area'),

    // Status
    isActive: boolean('is_active').notNull().default(true),

    // Soft delete (preserves tracking_entries history)
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('custom_metric_definitions_user_id_idx').on(table.userId),
    index('custom_metric_definitions_user_id_active_idx').on(table.userId, table.isActive),
    // Note: Partial unique index (user_id, LOWER(name)) WHERE deleted_at IS NULL
    // is created in the migration SQL as Drizzle doesn't support partial indexes natively
  ]
);

// Types
export type CustomMetricDefinition = typeof customMetricDefinitions.$inferSelect;
export type NewCustomMetricDefinition = typeof customMetricDefinitions.$inferInsert;
