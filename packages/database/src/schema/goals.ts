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
} from 'drizzle-orm/pg-core';
import { goalStatusEnum, habitFrequencyEnum, lifeAreaEnum, subAreaEnum } from './enums';
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

    // Basic info (ADR-017)
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    area: lifeAreaEnum('area').notNull(),
    subArea: subAreaEnum('sub_area'),

    // Frequency
    frequency: habitFrequencyEnum('frequency').notNull(),
    daysOfWeek: jsonb('days_of_week').default([]), // number[] (0-6)
    timesPerPeriod: integer('times_per_period'),

    // Streaks
    currentStreak: integer('current_streak').notNull().default(0),
    longestStreak: integer('longest_streak').notNull().default(0),
    totalCompletions: integer('total_completions').notNull().default(0),

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
    index('habits_is_active_idx').on(table.isActive),
  ]
);

export const habitCompletions = pgTable(
  'habit_completions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    habitId: uuid('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),

    date: date('date').notNull(),
    completed: boolean('completed').notNull().default(true),
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('habit_completions_habit_id_idx').on(table.habitId),
    index('habit_completions_date_idx').on(table.date),
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
