import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  getDb,
  getPool,
  closePool,
  withUserId,
  withTransaction,
  withUserTransaction,
  schema,
} from '@life-assistant/database';
import type { Pool } from 'pg';

/**
 * DatabaseService - NestJS wrapper for @life-assistant/database
 *
 * Provides:
 * - Drizzle database instance
 * - RLS-aware query helpers (withUserId, withUserTransaction)
 * - Automatic connection pool cleanup on shutdown
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  /**
   * Get the Drizzle database instance
   */
  get db() {
    return getDb();
  }

  /**
   * Get the PostgreSQL connection pool
   */
  get pool(): Pool {
    return getPool();
  }

  /**
   * Get the database schema for type-safe queries
   */
  get schema() {
    return schema;
  }

  /**
   * Execute a callback with RLS context set for a specific user
   *
   * @example
   * const notes = await databaseService.withUserId(userId, async (db) => {
   *   return db.select().from(schema.notes);
   * });
   */
  withUserId = withUserId;

  /**
   * Execute a callback within a database transaction
   *
   * @example
   * await databaseService.withTransaction(async (client, db) => {
   *   await db.insert(schema.notes).values({ ... });
   *   await db.insert(schema.noteLinks).values({ ... });
   * });
   */
  withTransaction = withTransaction;

  /**
   * Execute a callback within a transaction with RLS context
   * Combines withTransaction and withUserId functionality
   *
   * @example
   * await databaseService.withUserTransaction(userId, async (db) => {
   *   await db.insert(schema.notes).values({ ... });
   * });
   */
  withUserTransaction = withUserTransaction;

  /**
   * Check if database connection is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const pool = getPool();
      const result = await pool.query('SELECT 1');
      return result.rows.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Close the connection pool on module destroy
   * Called automatically by NestJS on graceful shutdown
   */
  async onModuleDestroy(): Promise<void> {
    await closePool();
  }
}
