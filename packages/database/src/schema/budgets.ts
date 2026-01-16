// packages/database/src/schema/budgets.ts
// Budgets table as defined in docs/specs/data-model.md §4.14

import {
  pgTable,
  uuid,
  varchar,
  decimal,
  integer,
  text,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { expenseCategoryEnum } from './enums';
import { users } from './users';

export const budgets = pgTable(
  'budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Period
    year: integer('year').notNull(),
    month: integer('month').notNull(), // 1-12

    // Category (optional - null means total budget)
    category: expenseCategoryEnum('category'),

    // Amount
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('BRL'),

    // Tracking
    spentAmount: decimal('spent_amount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),

    // Notes
    notes: text('notes'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('budgets_user_id_idx').on(table.userId),
    index('budgets_year_month_idx').on(table.year, table.month),
    unique('budgets_user_year_month_category_unique').on(
      table.userId,
      table.year,
      table.month,
      table.category
    ),
  ]
);

// Types
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
