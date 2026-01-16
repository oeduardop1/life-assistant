// packages/database/src/schema/memory-consolidations.ts
// Memory consolidations table as defined in docs/specs/data-model.md §4.5 (ADR-012)

import {
  pgTable,
  uuid,
  timestamp,
  jsonb,
  integer,
  text,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { consolidationStatusEnum } from './enums';

/**
 * Memory updates applied during consolidation
 */
export interface MemoryUpdates {
  bio?: string;
  occupation?: string;
  familyContext?: string;
  currentGoals?: string[];
  currentChallenges?: string[];
  topOfMind?: string[];
  values?: string[];
  learnedPatterns?: {
    pattern: string;
    confidence: number;
    evidence: string[];
  }[];
}

/**
 * Memory consolidations table - audit log of consolidation runs
 */
export const memoryConsolidations = pgTable(
  'memory_consolidations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Time range processed
    consolidatedFrom: timestamp('consolidated_from', { withTimezone: true }).notNull(),
    consolidatedTo: timestamp('consolidated_to', { withTimezone: true }).notNull(),

    // Statistics
    messagesProcessed: integer('messages_processed').notNull().default(0),
    factsCreated: integer('facts_created').notNull().default(0),
    factsUpdated: integer('facts_updated').notNull().default(0),
    inferencesCreated: integer('inferences_created').notNull().default(0),

    // Results
    memoryUpdates: jsonb('memory_updates').$type<MemoryUpdates>(),
    rawOutput: jsonb('raw_output'), // Raw LLM response for debugging

    // Status
    status: consolidationStatusEnum('status').notNull(),
    errorMessage: text('error_message'),

    // Timestamps (no updatedAt - this is an append-only audit log)
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('memory_consolidations_user_id_idx').on(table.userId),
    index('memory_consolidations_created_at_idx').on(table.createdAt),
  ]
);

// Types
export type MemoryConsolidation = typeof memoryConsolidations.$inferSelect;
export type NewMemoryConsolidation = typeof memoryConsolidations.$inferInsert;
