// packages/database/src/schema/notes.ts
// Notes and note links tables as defined in DATA_MODEL.md §4.5

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Content
    title: varchar('title', { length: 500 }).notNull(),
    content: text('content').notNull().default(''),
    excerpt: varchar('excerpt', { length: 500 }),

    // Organization
    folder: varchar('folder', { length: 255 }),
    tags: jsonb('tags').notNull().default([]), // string[]

    // Status
    isPinned: boolean('is_pinned').notNull().default(false),
    isArchived: boolean('is_archived').notNull().default(false),

    // Soft delete (trash)
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
    index('notes_user_id_idx').on(table.userId),
    index('notes_user_id_folder_idx').on(table.userId, table.folder),
    index('notes_title_idx').on(table.title),
  ]
);

// Links between notes (wikilinks)
export const noteLinks = pgTable(
  'note_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    sourceNoteId: uuid('source_note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    targetNoteId: uuid('target_note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),

    // Link text (if different from title)
    linkText: varchar('link_text', { length: 255 }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('note_links_source_idx').on(table.sourceNoteId),
    index('note_links_target_idx').on(table.targetNoteId),
  ]
);

// Types
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type NoteLink = typeof noteLinks.$inferSelect;
export type NewNoteLink = typeof noteLinks.$inferInsert;
