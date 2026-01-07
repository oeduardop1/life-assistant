// packages/database/src/schema/scores.ts
// Life balance history table as defined in DATA_MODEL.md §4.4

import {
  pgTable,
  uuid,
  integer,
  date,
  jsonb,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const lifeBalanceHistory = pgTable(
  'life_balance_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Date of snapshot
    snapshotDate: date('snapshot_date').notNull(),

    // Overall score
    overallScore: integer('overall_score').notNull(), // 0-100

    // Area scores
    // {
    //   health: { score: 75, components: { weight: 80, exercise: 70, ... } },
    //   financial: { score: 60, components: { budget: 50, savings: 70, ... } },
    //   ...
    // }
    areaScores: jsonb('area_scores').notNull(),

    // Weights used
    weightsUsed: jsonb('weights_used').notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('life_balance_history_user_id_idx').on(table.userId),
    index('life_balance_history_snapshot_date_idx').on(table.snapshotDate),
    unique('life_balance_history_user_date_unique').on(
      table.userId,
      table.snapshotDate
    ),
  ]
);

// Types
export type LifeBalanceHistory = typeof lifeBalanceHistory.$inferSelect;
export type NewLifeBalanceHistory = typeof lifeBalanceHistory.$inferInsert;
