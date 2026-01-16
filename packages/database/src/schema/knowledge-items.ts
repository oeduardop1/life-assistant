// packages/database/src/schema/knowledge-items.ts
// Knowledge items table as defined in docs/specs/data-model.md §4.5 (ADR-012)

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  real,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import {
  knowledgeItemTypeEnum,
  knowledgeItemSourceEnum,
  lifeAreaEnum,
} from './enums';

/**
 * Person-specific metadata for knowledge items of type 'person'
 */
export interface PersonMetadata {
  relationship?: string;
  birthday?: string;
  notes?: string;
  preferences?: string[];
}

/**
 * Knowledge items table - granular, searchable facts/preferences/insights
 */
export const knowledgeItems = pgTable(
  'knowledge_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Classification
    type: knowledgeItemTypeEnum('type').notNull(),
    area: lifeAreaEnum('area'),

    // Content
    title: varchar('title', { length: 255 }),
    content: text('content').notNull(),

    // Source tracking
    source: knowledgeItemSourceEnum('source').notNull(),
    sourceRef: uuid('source_ref'), // Reference to conversation/message that generated this
    inferenceEvidence: text('inference_evidence'), // Evidence for AI inferences

    // Confidence and validation
    confidence: real('confidence').notNull().default(0.9), // 0.0 - 1.0
    validatedByUser: boolean('validated_by_user').default(false),

    // Relationships
    relatedItems: jsonb('related_items').$type<string[]>().default([]),
    tags: jsonb('tags').$type<string[]>().default([]),

    // Person-specific metadata (when type = 'person')
    personMetadata: jsonb('person_metadata').$type<PersonMetadata>(),

    // Supersession tracking for contradiction resolution
    // When a new item contradicts this one, the new item's ID is stored here
    supersededById: uuid('superseded_by_id'),
    supersededAt: timestamp('superseded_at', { withTimezone: true }),

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
    index('knowledge_items_user_id_idx').on(table.userId),
    index('knowledge_items_user_type_idx').on(table.userId, table.type),
    index('knowledge_items_user_area_idx').on(table.userId, table.area),
    index('knowledge_items_source_idx').on(table.source),
    // Index for finding active (non-superseded) items by scope
    index('knowledge_items_user_active_scope_idx').on(table.userId, table.type, table.area),
  ]
);

// Types
export type KnowledgeItem = typeof knowledgeItems.$inferSelect;
export type NewKnowledgeItem = typeof knowledgeItems.$inferInsert;
