// packages/database/src/schema/goals.ts
// Goals & Milestones (M2.3), Habits & Completions (M2.1) as defined in docs/specs/domains/goals.md and tracking.md

import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  date,
  integer,
  boolean,
  time,
  timestamp,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { goalStatusEnum, habitFrequencyEnum, periodOfDayEnum, lifeAreaEnum, subAreaEnum } from './enums';
import { users } from './users';

export const goals = pgTable(
  'goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Basic info (ADR-017)
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    area: lifeAreaEnum('area').notNull(),
    subArea: subAreaEnum('sub_area'),

    // Target
    targetValue: decimal('target_value', { precision: 10, scale: 2 }).notNull(),
    currentValue: decimal('current_value', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    unit: varchar('unit', { length: 50 }).notNull(),

    // Timeline
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),

    // Status
    status: goalStatusEnum('status').notNull().default('not_started'),

    // Soft delete
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('goals_user_id_idx').on(table.userId),
    index('goals_status_idx').on(table.status),
  ]
);

export const goalMilestones = pgTable(
  'goal_milestones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => goals.id, { onDelete: 'cascade' }),

    title: varchar('title', { length: 255 }).notNull(),
    targetValue: decimal('target_value', { precision: 10, scale: 2 }).notNull(),
    completed: boolean('completed').notNull().default(false),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    sortOrder: integer('sort_order').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('goal_milestones_goal_id_idx').on(table.goalId)]
);

export const habits = pgTable(
  'habits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Basic info (per tracking.md §5.1)
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    icon: varchar('icon', { length: 50 }).notNull().default('✓'),
    color: varchar('color', { length: 7 }), // hex color, nullable

    // Frequency
    frequency: habitFrequencyEnum('frequency').notNull().default('daily'),
    frequencyDays: jsonb('frequency_days').default([]), // number[] (0-6) for custom frequency
    periodOfDay: periodOfDayEnum('period_of_day').notNull().default('anytime'),

    // Ordering
    sortOrder: integer('sort_order').notNull().default(0),

    // Streaks (longestStreak stored, currentStreak calculated)
    longestStreak: integer('longest_streak').notNull().default(0),

    // Reminder
    reminderTime: time('reminder_time'),
    reminderEnabled: boolean('reminder_enabled').notNull().default(false),

    // Status
    isActive: boolean('is_active').notNull().default(true),

    // Soft delete
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('habits_user_id_idx').on(table.userId),
    index('habits_user_active_idx').on(table.userId, table.isActive),
    unique('habits_user_name_unique').on(table.userId, table.name),
  ]
);

export const habitCompletions = pgTable(
  'habit_completions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    habitId: uuid('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Date of completion (per tracking.md §8.3)
    completionDate: date('completion_date').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    notes: text('notes'),
    source: varchar('source', { length: 50 }).notNull().default('form'),
  },
  (table) => [
    index('habit_completions_habit_id_idx').on(table.habitId),
    index('habit_completions_user_date_idx').on(table.userId, table.completionDate),
    index('habit_completions_date_idx').on(table.completionDate),
    unique('habit_completions_habit_date_unique').on(table.habitId, table.completionDate),
  ]
);

// Types
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type GoalMilestone = typeof goalMilestones.$inferSelect;
export type NewGoalMilestone = typeof goalMilestones.$inferInsert;
export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;
export type HabitCompletion = typeof habitCompletions.$inferSelect;
export type NewHabitCompletion = typeof habitCompletions.$inferInsert;
