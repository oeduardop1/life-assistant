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
} from 'drizzle-orm/pg-core';
import { incomeTypeEnum, incomeFrequencyEnum } from './enums';
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

    // Period (YYYY-MM format)
    monthYear: varchar('month_year', { length: 7 }).notNull(),

    // Currency (ISO 4217)
    currency: varchar('currency', { length: 3 }).notNull().default('BRL'),

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
  ]
);

// Types
export type Income = typeof incomes.$inferSelect;
export type NewIncome = typeof incomes.$inferInsert;
