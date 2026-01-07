// packages/database/src/schema/exports.ts
// Export requests table (LGPD) as defined in DATA_MODEL.md §4.16

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  integer,
  text,
  index,
} from 'drizzle-orm/pg-core';
import { exportStatusEnum, exportTypeEnum } from './enums';
import { users } from './users';

export const exportRequests = pgTable(
  'export_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Type & Status
    type: exportTypeEnum('type').notNull(),
    status: exportStatusEnum('status').notNull().default('pending'),

    // Request details
    requestedAt: timestamp('requested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Result
    fileUrl: varchar('file_url', { length: 1000 }), // Signed URL to download
    fileExpiresAt: timestamp('file_expires_at', { withTimezone: true }),
    fileSizeBytes: integer('file_size_bytes'),

    // Error handling
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').notNull().default(0),

    // Metadata (sections included, format, etc)
    metadata: jsonb('metadata'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('export_requests_user_id_idx').on(table.userId),
    index('export_requests_status_idx').on(table.status),
    index('export_requests_requested_at_idx').on(table.requestedAt),
  ]
);

// Types
export type ExportRequest = typeof exportRequests.$inferSelect;
export type NewExportRequest = typeof exportRequests.$inferInsert;
