// packages/database/src/schema/integrations.ts
// User integrations table as defined in docs/specs/data-model.md §4.12

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  boolean,
  text,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const userIntegrations = pgTable(
  'user_integrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Integration type
    provider: varchar('provider', { length: 50 }).notNull(), // 'telegram', 'google_calendar', 'whatsapp'

    // Provider-specific ID
    externalId: varchar('external_id', { length: 255 }),

    // Credentials (encrypted or tokens)
    credentials: jsonb('credentials'), // { accessToken, refreshToken, expiresAt }

    // Status
    isActive: boolean('is_active').notNull().default(true),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    lastError: text('last_error'),

    // Settings
    settings: jsonb('settings').notNull().default({}),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('user_integrations_user_id_idx').on(table.userId),
    index('user_integrations_provider_idx').on(table.provider),
    index('user_integrations_user_provider_unique').on(
      table.userId,
      table.provider
    ),
  ]
);

// Types
export type UserIntegration = typeof userIntegrations.$inferSelect;
export type NewUserIntegration = typeof userIntegrations.$inferInsert;
