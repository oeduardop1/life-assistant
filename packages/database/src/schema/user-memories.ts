// packages/database/src/schema/user-memories.ts
// User memories table as defined in docs/specs/data-model.md §4.5 (ADR-012)

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  unique,
} from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Learned pattern with confidence tracking
 */
export interface LearnedPattern {
  pattern: string;
  confidence: number;
  evidence: string[];
}

/**
 * User memories table - compact context (~500-800 tokens) always injected in system prompt
 */
export const userMemories = pgTable(
  'user_memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Profile summary
    bio: text('bio'),
    occupation: varchar('occupation', { length: 255 }),
    familyContext: text('family_context'),

    // Current state (JSONB arrays)
    currentGoals: jsonb('current_goals').$type<string[]>().default([]),
    currentChallenges: jsonb('current_challenges').$type<string[]>().default([]),
    topOfMind: jsonb('top_of_mind').$type<string[]>().default([]),
    values: jsonb('values').$type<string[]>().default([]),

    // Communication preferences
    communicationStyle: varchar('communication_style', { length: 50 }),
    feedbackPreferences: text('feedback_preferences'),

    // Learned patterns with confidence tracking
    learnedPatterns: jsonb('learned_patterns').$type<LearnedPattern[]>().default([]),

    // Versioning for optimistic locking
    version: integer('version').notNull().default(1),
    lastConsolidatedAt: timestamp('last_consolidated_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // One memory per user
    unique('user_memories_user_id_unique').on(table.userId),
  ]
);

// Types
export type UserMemory = typeof userMemories.$inferSelect;
export type NewUserMemory = typeof userMemories.$inferInsert;
