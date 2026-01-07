// packages/database/src/schema/decisions.ts
// Decision tables as defined in DATA_MODEL.md §4.6

import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { decisionStatusEnum, lifeAreaEnum } from './enums';
import { users } from './users';

export const decisions = pgTable(
  'decisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Basic info
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    area: lifeAreaEnum('area').notNull(),
    deadline: date('deadline'),

    // Status
    status: decisionStatusEnum('status').notNull().default('draft'),

    // Result
    chosenOptionId: uuid('chosen_option_id'),
    reasoning: text('reasoning'),

    // AI Analysis
    // {
    //   summary: string,
    //   recommendation?: string,
    //   riskAssessment: string,
    //   questionsToConsider: string[],
    //   generatedAt: Date
    // }
    aiAnalysis: jsonb('ai_analysis'),

    // Review
    reviewDate: date('review_date'),
    reviewScore: integer('review_score'), // 1-10
    reviewNotes: text('review_notes'),

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
    index('decisions_user_id_idx').on(table.userId),
    index('decisions_status_idx').on(table.status),
  ]
);

export const decisionOptions = pgTable(
  'decision_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    decisionId: uuid('decision_id')
      .notNull()
      .references(() => decisions.id, { onDelete: 'cascade' }),

    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),

    pros: jsonb('pros').notNull().default([]), // string[]
    cons: jsonb('cons').notNull().default([]), // string[]

    // Calculated score
    score: integer('score'), // 0-100

    // Order
    sortOrder: integer('sort_order').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('decision_options_decision_id_idx').on(table.decisionId)]
);

export const decisionCriteria = pgTable(
  'decision_criteria',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    decisionId: uuid('decision_id')
      .notNull()
      .references(() => decisions.id, { onDelete: 'cascade' }),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    weight: integer('weight').notNull().default(5), // 1-10

    // Order
    sortOrder: integer('sort_order').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('decision_criteria_decision_id_idx').on(table.decisionId)]
);

// Scores per option per criterion
export const decisionScores = pgTable(
  'decision_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    optionId: uuid('option_id')
      .notNull()
      .references(() => decisionOptions.id, { onDelete: 'cascade' }),
    criterionId: uuid('criterion_id')
      .notNull()
      .references(() => decisionCriteria.id, { onDelete: 'cascade' }),

    score: integer('score').notNull(), // 1-10

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('decision_scores_option_id_idx').on(table.optionId)]
);

// Types
export type Decision = typeof decisions.$inferSelect;
export type NewDecision = typeof decisions.$inferInsert;
export type DecisionOption = typeof decisionOptions.$inferSelect;
export type NewDecisionOption = typeof decisionOptions.$inferInsert;
export type DecisionCriterion = typeof decisionCriteria.$inferSelect;
export type NewDecisionCriterion = typeof decisionCriteria.$inferInsert;
export type DecisionScore = typeof decisionScores.$inferSelect;
export type NewDecisionScore = typeof decisionScores.$inferInsert;
