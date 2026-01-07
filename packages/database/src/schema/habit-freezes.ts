// packages/database/src/schema/habit-freezes.ts
// Habit freezes table as defined in DATA_MODEL.md §4.17

import { pgTable, uuid, date, text, timestamp, index } from 'drizzle-orm/pg-core';
import { habits } from './goals';
import { users } from './users';

export const habitFreezes = pgTable(
  'habit_freezes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    habitId: uuid('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Freeze period
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),

    // Reason (optional)
    reason: text('reason'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('habit_freezes_habit_id_idx').on(table.habitId),
    index('habit_freezes_user_id_idx').on(table.userId),
    index('habit_freezes_date_range_idx').on(table.startDate, table.endDate),
  ]
);

// Types
export type HabitFreeze = typeof habitFreezes.$inferSelect;
export type NewHabitFreeze = typeof habitFreezes.$inferInsert;
