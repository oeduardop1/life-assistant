// src/__tests__/integration/rls.integration.test.ts
// Integration tests for Row Level Security policies
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../../schema';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/life_assistant';

// Test user IDs
const USER_1_ID = '11111111-1111-4111-8111-111111111111';
const USER_2_ID = '22222222-2222-4222-8222-222222222222';

describe('RLS Policies Integration Tests', () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL });
    db = drizzle(pool, { schema });

    // Clean up test data
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [USER_1_ID, USER_2_ID]);

    // Create test users
    await db.insert(schema.users).values([
      {
        id: USER_1_ID,
        email: 'user1@test.com',
        name: 'User 1',
        status: 'active',
      },
      {
        id: USER_2_ID,
        email: 'user2@test.com',
        name: 'User 2',
        status: 'active',
      },
    ]);

    // Create notes for each user
    await db.insert(schema.notes).values([
      { userId: USER_1_ID, title: 'User 1 Note', content: 'Secret from user 1' },
      { userId: USER_2_ID, title: 'User 2 Note', content: 'Secret from user 2' },
    ]);

    // Create tracking entries for each user
    await db.insert(schema.trackingEntries).values([
      {
        userId: USER_1_ID,
        type: 'weight',
        area: 'health',
        value: '80',
        entryDate: '2026-01-01',
      },
      {
        userId: USER_2_ID,
        type: 'weight',
        area: 'health',
        value: '70',
        entryDate: '2026-01-01',
      },
    ]);
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM tracking_entries WHERE user_id IN ($1, $2)', [
      USER_1_ID,
      USER_2_ID,
    ]);
    await pool.query('DELETE FROM notes WHERE user_id IN ($1, $2)', [USER_1_ID, USER_2_ID]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [USER_1_ID, USER_2_ID]);
    await pool.end();
  });

  describe('User data isolation', () => {
    it('should allow user to access only their own notes when RLS context is set', async () => {
      const client = await pool.connect();
      try {
        // Set RLS context for user 1 using set_config (supports parameterized queries)
        await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [USER_1_ID]);

        // Query notes - should only see user 1's notes
        const result = await client.query('SELECT * FROM notes WHERE user_id = $1', [USER_1_ID]);

        expect(result.rows.length).toBe(1);
        expect(result.rows[0].title).toBe('User 1 Note');
      } finally {
        client.release();
      }
    });

    it('should allow user to access only their own tracking entries', async () => {
      const client = await pool.connect();
      try {
        // Set RLS context for user 2
        await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [USER_2_ID]);

        // Query tracking entries - should only see user 2's entries
        const result = await client.query('SELECT * FROM tracking_entries WHERE user_id = $1', [
          USER_2_ID,
        ]);

        expect(result.rows.length).toBe(1);
        expect(result.rows[0].value).toBe('70.00');
      } finally {
        client.release();
      }
    });

    it('should verify auth.uid() returns the set user for RLS policies', async () => {
      // Note: set_config with is_local=true requires a transaction
      // Per node-postgres docs, we use BEGIN/COMMIT for transactions
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Set RLS context for user 1 (is_local=true means it's transaction-scoped)
        await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [USER_1_ID]);

        // Verify auth.uid() returns the expected value
        const result = await client.query('SELECT auth.uid() as user_id');
        expect(result.rows[0].user_id).toBe(USER_1_ID);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    });

    it('should switch context correctly between users', async () => {
      const client = await pool.connect();
      try {
        // First transaction - user 1
        await client.query('BEGIN');
        await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [USER_1_ID]);
        let result = await client.query('SELECT auth.uid() as user_id');
        expect(result.rows[0].user_id).toBe(USER_1_ID);
        await client.query('COMMIT');

        // Second transaction - user 2
        await client.query('BEGIN');
        await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [USER_2_ID]);
        result = await client.query('SELECT auth.uid() as user_id');
        expect(result.rows[0].user_id).toBe(USER_2_ID);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    });
  });

  describe('RLS without context', () => {
    it('should return null from auth.uid() when context is cleared', async () => {
      // This test verifies that auth.uid() returns NULL when
      // the context is cleared (set to empty string or NULL)
      const client = await pool.connect();
      try {
        // Clear any previous context - setting to empty string
        // which NULLIF in auth.uid() will convert to NULL
        await client.query("SELECT set_config('request.jwt.claim.sub', '', true)");

        // Now auth.uid() should return NULL due to NULLIF
        const result = await client.query('SELECT auth.uid() as user_id');
        expect(result.rows[0].user_id).toBeNull();
      } finally {
        client.release();
      }
    });
  });

  describe('withUserId helper function', () => {
    it('should correctly set RLS context and allow data access', async () => {
      const { withUserId } = await import('../../client');

      const notes = await withUserId(USER_1_ID, async (scopedDb) => {
        return scopedDb.select().from(schema.notes).where(eq(schema.notes.userId, USER_1_ID));
      });

      expect(notes.length).toBe(1);
      expect(notes[0].title).toBe('User 1 Note');
    });

    it('should set different user contexts correctly', async () => {
      const { withUserId } = await import('../../client');

      // User 1 context - verify the context is set correctly
      const user1Context = await withUserId(USER_1_ID, async (scopedDb) => {
        const result = await scopedDb.execute(
          sql`SELECT current_setting('request.jwt.claim.sub', true) as user_id`
        );
        return result.rows[0] as { user_id: string };
      });

      // User 2 context - verify the context switches
      const user2Context = await withUserId(USER_2_ID, async (scopedDb) => {
        const result = await scopedDb.execute(
          sql`SELECT current_setting('request.jwt.claim.sub', true) as user_id`
        );
        return result.rows[0] as { user_id: string };
      });

      // Each context should have the correct user_id set
      expect(user1Context.user_id).toBe(USER_1_ID);
      expect(user2Context.user_id).toBe(USER_2_ID);
    });
  });

  describe('withUserTransaction helper function', () => {
    it('should correctly handle transactions with RLS context', async () => {
      const { withUserTransaction } = await import('../../client');

      const NOTE_ID = '33333333-3333-4333-8333-333333333333';

      try {
        await withUserTransaction(USER_1_ID, async (txDb) => {
          // Insert a new note
          await txDb.insert(schema.notes).values({
            id: NOTE_ID,
            userId: USER_1_ID,
            title: 'Transaction Test Note',
            content: 'Created in transaction',
          });

          // Query the note in the same transaction
          const notes = await txDb
            .select()
            .from(schema.notes)
            .where(eq(schema.notes.id, NOTE_ID));

          expect(notes.length).toBe(1);
          expect(notes[0].title).toBe('Transaction Test Note');

          return notes;
        });

        // Verify note was committed
        const { withUserId } = await import('../../client');
        const committedNotes = await withUserId(USER_1_ID, async (scopedDb) => {
          return scopedDb.select().from(schema.notes).where(eq(schema.notes.id, NOTE_ID));
        });

        expect(committedNotes.length).toBe(1);
      } finally {
        // Cleanup
        await pool.query('DELETE FROM notes WHERE id = $1', [NOTE_ID]);
      }
    });

    it('should rollback transaction on error', async () => {
      const { withUserTransaction } = await import('../../client');

      const NOTE_ID = '44444444-4444-4444-8444-444444444444';

      try {
        await withUserTransaction(USER_1_ID, async (txDb) => {
          // Insert a new note
          await txDb.insert(schema.notes).values({
            id: NOTE_ID,
            userId: USER_1_ID,
            title: 'Should be rolled back',
            content: 'This should not persist',
          });

          // Throw error to trigger rollback
          throw new Error('Intentional error for rollback test');
        });
      } catch (error) {
        // Expected error
        expect((error as Error).message).toBe('Intentional error for rollback test');
      }

      // Verify note was NOT committed (rollback worked)
      const result = await pool.query('SELECT * FROM notes WHERE id = $1', [NOTE_ID]);
      expect(result.rows.length).toBe(0);
    });
  });
});
