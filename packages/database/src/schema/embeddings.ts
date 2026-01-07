// packages/database/src/schema/embeddings.ts
// Embeddings table (RAG) as defined in DATA_MODEL.md §4.18

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  customType,
} from 'drizzle-orm/pg-core';
import { users } from './users';

// Custom type for vector (768 dimensions - Google text-embedding-004)
// If changing provider, migration of all vectors will be needed
const vector = customType<{ data: number[] }>({
  dataType() {
    return 'vector(768)';
  },
});

export const embeddings = pgTable(
  'embeddings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Source
    sourceType: varchar('source_type', { length: 50 }).notNull(), // 'message', 'note', 'decision', 'tracking', 'person'
    sourceId: uuid('source_id').notNull(),

    // Content
    content: text('content').notNull(),
    chunkIndex: varchar('chunk_index', { length: 10 }).notNull().default('0'),

    // Vector
    embedding: vector('embedding').notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('embeddings_user_id_idx').on(table.userId),
    index('embeddings_source_idx').on(table.sourceType, table.sourceId),
    // Vector index created separately via SQL (HNSW)
  ]
);

// Types
export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;
