// @life-assistant/database
// Schema Drizzle + migrations + client

export const DATABASE_VERSION = '0.1.0';

// Client
export {
  getDb,
  getPool,
  closePool,
  withUserId,
  withTransaction,
  withUserTransaction,
  schema,
} from './client';

// Schema (re-export everything)
export * from './schema';

// Types for convenience
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
export type { Database } from './client';

// Query helpers
export { eq, and, or, not, ne, isNull, isNotNull, lt, gt, lte, gte, sql, asc, desc, ilike, count } from 'drizzle-orm';
