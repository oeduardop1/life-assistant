// packages/database/src/schema/investments.ts
// Investments table as defined in docs/specs/data-model.md §4.14

import {
  pgTable,
  uuid,
  varchar,
  decimal,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { investmentTypeEnum } from './enums';
import { users } from './users';

export const investments = pgTable(
  'investments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Investment details
    name: varchar('name', { length: 255 }).notNull(),
    type: investmentTypeEnum('type').notNull(),

    // Amounts
    goalAmount: decimal('goal_amount', { precision: 12, scale: 2 }),
    currentAmount: decimal('current_amount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    monthlyContribution: decimal('monthly_contribution', { precision: 12, scale: 2 }),

    // Target deadline
    deadline: date('deadline'),

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
    index('investments_user_id_idx').on(table.userId),
    index('investments_type_idx').on(table.type),
  ]
);

// Types
export type Investment = typeof investments.$inferSelect;
export type NewInvestment = typeof investments.$inferInsert;
