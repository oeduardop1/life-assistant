// packages/database/src/schema/people.ts
// People (CRM) tables as defined in DATA_MODEL.md §4.7

import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relationshipTypeEnum, interactionTypeEnum } from './enums';
import { users } from './users';
import { notes } from './notes';

export const people = pgTable(
  'people',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Basic info
    name: varchar('name', { length: 255 }).notNull(),
    nickname: varchar('nickname', { length: 100 }),
    relationship: relationshipTypeEnum('relationship').notNull(),

    // Contact
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),

    // Important dates
    birthday: date('birthday'),
    anniversary: date('anniversary'),

    // Preferences
    preferences: jsonb('preferences').notNull().default({
      interests: [],
      dislikes: [],
      giftIdeas: [],
      dietaryRestrictions: [],
      importantTopics: [],
    }),

    // Contact frequency
    contactFrequencyDays: integer('contact_frequency_days'),
    lastContact: date('last_contact'),

    // Organization
    tags: jsonb('tags').notNull().default([]), // string[]
    notes: text('notes'),

    // Status
    isArchived: boolean('is_archived').notNull().default(false),

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
    index('people_user_id_idx').on(table.userId),
    index('people_name_idx').on(table.name),
  ]
);

// Linked notes
export const personNotes = pgTable(
  'person_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    noteId: uuid('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('person_notes_person_id_idx').on(table.personId),
    index('person_notes_note_id_idx').on(table.noteId),
  ]
);

// Interactions
export const personInteractions = pgTable(
  'person_interactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    type: interactionTypeEnum('type').notNull(),
    date: date('date').notNull(),
    notes: text('notes'),

    // Optional link to conversation
    conversationId: uuid('conversation_id'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('person_interactions_person_id_idx').on(table.personId),
    index('person_interactions_date_idx').on(table.date),
  ]
);

// Types
export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
export type PersonNote = typeof personNotes.$inferSelect;
export type NewPersonNote = typeof personNotes.$inferInsert;
export type PersonInteraction = typeof personInteractions.$inferSelect;
export type NewPersonInteraction = typeof personInteractions.$inferInsert;
