// packages/database/src/schema/incomes.ts
// Income sources table as defined in docs/specs/data-model.md §4.14

import {
  pgTable,
  uuid,
  varchar,
  decimal,
  boolean,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { incomeTypeEnum, incomeFrequencyEnum, incomeStatusEnum } from './enums';
import { users } from './users';

export const incomes = pgTable(
  'incomes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Income details
    name: varchar('name', { length: 255 }).notNull(),
    type: incomeTypeEnum('type').notNull(),
    frequency: incomeFrequencyEnum('frequency').notNull(),

    // Amounts
    expectedAmount: decimal('expected_amount', { precision: 12, scale: 2 }).notNull(),
    actualAmount: decimal('actual_amount', { precision: 12, scale: 2 }),

    // Recurrence
    isRecurring: boolean('is_recurring').notNull().default(true),
    recurringGroupId: uuid('recurring_group_id'),

    // Period (YYYY-MM format)
    monthYear: varchar('month_year', { length: 7 }).notNull(),

    // Currency (ISO 4217)
    currency: varchar('currency', { length: 3 }).notNull().default('BRL'),

    // Status (for soft-delete with scope='this')
    status: incomeStatusEnum('status').notNull().default('active'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('incomes_user_id_idx').on(table.userId),
    index('incomes_month_year_idx').on(table.monthYear),
    index('incomes_user_id_month_year_idx').on(table.userId, table.monthYear),
    index('incomes_type_idx').on(table.type),
    index('incomes_user_recurring_group_idx').on(table.userId, table.recurringGroupId),
    index('incomes_status_idx').on(table.status),
    unique('incomes_user_recurring_group_month_year_unique').on(
      table.userId,
      table.recurringGroupId,
      table.monthYear
    ),
  ]
);

// Types
export type Income = typeof incomes.$inferSelect;
export type NewIncome = typeof incomes.$inferInsert;
