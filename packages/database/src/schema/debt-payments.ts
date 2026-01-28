// packages/database/src/schema/debt-payments.ts
// Debt payments tracking table for month-aware installment payment history

import {
  pgTable,
  uuid,
  varchar,
  decimal,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { debts } from './debts';

export const debtPayments = pgTable(
  'debt_payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    debtId: uuid('debt_id')
      .notNull()
      .references(() => debts.id, { onDelete: 'cascade' }),

    // Which installment was paid
    installmentNumber: integer('installment_number').notNull(),

    // Amount paid
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),

    // Month the installment belongs to (YYYY-MM format)
    // This is the scheduled month for the installment, NOT when it was paid.
    // Example: Installment 3 of a debt starting 2026-02 has monthYear='2026-04'
    // Use paidAt to know when the payment was actually made.
    monthYear: varchar('month_year', { length: 7 }).notNull(),

    // When the payment was made
    paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('debt_payments_user_id_idx').on(table.userId),
    index('debt_payments_debt_id_idx').on(table.debtId),
    index('debt_payments_user_month_year_idx').on(table.userId, table.monthYear),
  ]
);

// Types
export type DebtPayment = typeof debtPayments.$inferSelect;
export type NewDebtPayment = typeof debtPayments.$inferInsert;
