// packages/database/src/schema/variable-expenses.ts
// Variable expenses (despesas variáveis) table as defined in docs/specs/data-model.md §4.14

import {
  pgTable,
  uuid,
  varchar,
  decimal,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { expenseCategoryEnum } from './enums';
import { users } from './users';

export const variableExpenses = pgTable(
  'variable_expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Expense details
    name: varchar('name', { length: 255 }).notNull(),
    category: expenseCategoryEnum('category').notNull(),

    // Amounts (budgeted vs actual)
    expectedAmount: decimal('expected_amount', { precision: 12, scale: 2 }).notNull(),
    actualAmount: decimal('actual_amount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),

    // Recurrence (true = monthly recurring category, false = one-time)
    isRecurring: boolean('is_recurring').notNull().default(false),

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
    index('variable_expenses_user_id_idx').on(table.userId),
    index('variable_expenses_month_year_idx').on(table.monthYear),
    index('variable_expenses_user_id_month_year_idx').on(table.userId, table.monthYear),
    index('variable_expenses_category_idx').on(table.category),
  ]
);

// Types
export type VariableExpense = typeof variableExpenses.$inferSelect;
export type NewVariableExpense = typeof variableExpenses.$inferInsert;
