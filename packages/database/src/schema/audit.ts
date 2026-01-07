// packages/database/src/schema/audit.ts
// Audit logs table as defined in DATA_MODEL.md §4.19

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

// Note: user_id does NOT use FK to preserve ID after user deletion (LGPD compliance)
// Allows tracking actions without identifying the person (anonymized ID)
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // No FK to maintain ID even after user deletion (LGPD compliance)
    // Allows tracking actions without identifying person (anonymized ID)
    userId: uuid('user_id'),

    // Action
    action: varchar('action', { length: 100 }).notNull(), // 'vault.access', 'user.login', etc
    resource: varchar('resource', { length: 100 }).notNull(), // 'vault_item', 'user', etc
    resourceId: uuid('resource_id'),

    // Details
    metadata: jsonb('metadata'), // { previousValue, newValue, reason }

    // Request info
    ip: varchar('ip', { length: 45 }),
    userAgent: text('user_agent'),

    // Timestamp
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('audit_logs_user_id_idx').on(table.userId),
    index('audit_logs_action_idx').on(table.action),
    index('audit_logs_created_at_idx').on(table.createdAt),
  ]
);

// Types
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
