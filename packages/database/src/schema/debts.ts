// packages/database/src/schema/debts.ts
// Debts (dívidas/financiamentos) table as defined in docs/specs/data-model.md §4.14

import {
  pgTable,
  uuid,
  varchar,
  decimal,
  integer,
  boolean,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { debtStatusEnum } from './enums';
import { users } from './users';

export const debts = pgTable(
  'debts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Debt details
    name: varchar('name', { length: 255 }).notNull(),
    creditor: varchar('creditor', { length: 255 }),

    // Total amount
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),

    // Negotiation status
    // true = negotiated with defined installments (enters "Total Orçado")
    // false = pending negotiation (only in "Total de Dívidas", not budgeted)
    isNegotiated: boolean('is_negotiated').notNull().default(true),

    // Installment details (required if isNegotiated = true)
    totalInstallments: integer('total_installments'),
    installmentAmount: decimal('installment_amount', { precision: 12, scale: 2 }),
    currentInstallment: integer('current_installment').notNull().default(1),

    // Due date (day of month 1-31, required if isNegotiated = true)
    dueDay: integer('due_day'),

    // Status
    status: debtStatusEnum('status').notNull().default('active'),

    // Notes
    notes: text('notes'),

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
    index('debts_user_id_idx').on(table.userId),
    index('debts_status_idx').on(table.status),
    index('debts_is_negotiated_idx').on(table.isNegotiated),
  ]
);

// Types
export type Debt = typeof debts.$inferSelect;
export type NewDebt = typeof debts.$inferInsert;
