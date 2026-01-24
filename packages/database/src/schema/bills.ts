// packages/database/src/schema/bills.ts
// Fixed bills (contas fixas) table as defined in docs/specs/data-model.md §4.14

import {
  pgTable,
  uuid,
  varchar,
  decimal,
  integer,
  boolean,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { billCategoryEnum, billStatusEnum } from './enums';
import { users } from './users';

export const bills = pgTable(
  'bills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Bill details
    name: varchar('name', { length: 255 }).notNull(),
    category: billCategoryEnum('category').notNull(),

    // Amount
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),

    // Due date (day of month 1-31)
    dueDay: integer('due_day').notNull(),

    // Status tracking
    status: billStatusEnum('status').notNull().default('pending'),
    paidAt: timestamp('paid_at', { withTimezone: true }),

    // Recurrence
    isRecurring: boolean('is_recurring').notNull().default(true),
    recurringGroupId: uuid('recurring_group_id'),

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
    index('bills_user_id_idx').on(table.userId),
    index('bills_month_year_idx').on(table.monthYear),
    index('bills_user_id_month_year_idx').on(table.userId, table.monthYear),
    index('bills_status_idx').on(table.status),
    index('bills_due_day_idx').on(table.dueDay),
    index('bills_user_recurring_group_idx').on(table.userId, table.recurringGroupId),
    unique('bills_user_recurring_group_month_year_unique').on(
      table.userId,
      table.recurringGroupId,
      table.monthYear
    ),
  ]
);

// Types
export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;
