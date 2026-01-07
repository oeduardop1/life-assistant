// packages/database/src/client.ts
// Database client with connection pooling and RLS helper

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient } from 'pg';
import * as schema from './schema';

// Singleton instances
let pool: Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Get the PostgreSQL connection pool
 * Creates a singleton pool on first call
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle unexpected errors on idle clients
    // Per node-postgres best practices: https://node-postgres.com/apis/pool#events
    pool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err);
    });
  }
  return pool;
}

/**
 * Get the Drizzle database instance
 * Creates a singleton instance on first call
 */
export function getDb() {
  db ??= drizzle(getPool(), { schema });
  return db;
}

/**
 * Close the connection pool
 * Should be called on application shutdown
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

/**
 * Execute a callback with RLS context set for a specific user
 * Uses SET LOCAL to scope the setting to the transaction
 *
 * @param userId - The user ID to set in app.user_id
 * @param callback - Function to execute with the scoped database
 * @returns The result of the callback
 *
 * @example
 * const notes = await withUserId(userId, async (db) => {
 *   return db.select().from(schema.notes);
 * });
 */
export async function withUserId<T>(
  userId: string,
  callback: (db: ReturnType<typeof drizzle<typeof schema>>) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    // Set the user_id in the session context for RLS
    // Using set_config() function which supports parameterized queries
    // Third parameter 'false' makes it session-scoped (persists for this connection)
    // Note: We use 'false' here because withUserId doesn't wrap in a transaction
    // For transaction-scoped settings, use withUserTransaction instead
    await client.query("SELECT set_config('app.user_id', $1, false)", [userId]);
    const scopedDb = drizzle(client as unknown as Pool, { schema });
    return await callback(scopedDb);
  } finally {
    // Clear the session setting before releasing the connection back to the pool
    await client.query("SELECT set_config('app.user_id', '', false)");
    client.release();
  }
}

/**
 * Execute a callback within a transaction
 *
 * @param callback - Function to execute within the transaction
 * @returns The result of the callback
 */
export async function withTransaction<T>(
  callback: (
    client: PoolClient,
    db: ReturnType<typeof drizzle<typeof schema>>
  ) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const txDb = drizzle(client as unknown as Pool, { schema });
    const result = await callback(client, txDb);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a callback within a transaction with RLS context
 * Combines withTransaction and withUserId functionality
 *
 * @param userId - The user ID to set in app.user_id
 * @param callback - Function to execute within the transaction
 * @returns The result of the callback
 */
export async function withUserTransaction<T>(
  userId: string,
  callback: (db: ReturnType<typeof drizzle<typeof schema>>) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    // Using set_config() function which supports parameterized queries
    // Third parameter 'true' makes it local to the transaction
    await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
    const txDb = drizzle(client as unknown as Pool, { schema });
    const result = await callback(txDb);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Re-export schema for convenience
export { schema };
