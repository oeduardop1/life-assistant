// src/__tests__/integration/migrations.integration.test.ts
// Integration tests for database migrations
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/life_assistant';

describe('Migrations Integration Tests', () => {
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({ connectionString: DATABASE_URL });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Schema verification', () => {
    it('should have all expected tables', async () => {
      const result = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      const tableNames = result.rows.map((r) => r.table_name);

      // Verify core tables exist
      const expectedTables = [
        'users',
        'conversations',
        'messages',
        'tracking_entries',
        'life_balance_history',
        'notes',
        'note_links',
        'people',
        'person_notes',
        'person_interactions',
        'vault_items',
        'goals',
        'goal_milestones',
        'habits',
        'habit_completions',
        'habit_freezes',
        'notifications',
        'reminders',
        'user_integrations',
        'calendar_events',
        'budgets',
        'subscriptions',
        'export_requests',
        'audit_logs',
      ];

      for (const table of expectedTables) {
        expect(tableNames).toContain(table);
      }
    });

    it('should have all expected enums', async () => {
      const result = await pool.query(`
        SELECT typname
        FROM pg_type
        WHERE typtype = 'e'
        AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ORDER BY typname
      `);

      const enumNames = result.rows.map((r) => r.typname);

      const expectedEnums = [
        'conversation_type',
        'exercise_intensity',
        'exercise_type',
        'expense_category',
        'export_status',
        'export_type',
        'goal_status',
        'habit_frequency',
        'interaction_type',
        'life_area',
        'message_role',
        'notification_status',
        'notification_type',
        'relationship_type',
        'subscription_status',
        'tracking_type',
        'user_plan',
        'user_status',
        'vault_category',
        'vault_item_type',
      ];

      for (const enumName of expectedEnums) {
        expect(enumNames).toContain(enumName);
      }
    });
  });

  describe('Foreign key constraints', () => {
    it('should have foreign key from conversations to users', async () => {
      const result = await pool.query(`
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'conversations'
          AND kcu.column_name = 'user_id'
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].foreign_table_name).toBe('users');
      expect(result.rows[0].foreign_column_name).toBe('id');
    });

    it('should have foreign key from messages to conversations', async () => {
      const result = await pool.query(`
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'messages'
          AND kcu.column_name = 'conversation_id'
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].foreign_table_name).toBe('conversations');
    });

    it('should cascade delete messages when conversation is deleted', async () => {
      // Create test data
      const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      const convId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

      await pool.query(
        "INSERT INTO users (id, email, name, status) VALUES ($1, 'cascade@test.com', 'Cascade Test', 'active')",
        [userId]
      );
      await pool.query(
        "INSERT INTO conversations (id, user_id, type, title) VALUES ($1, $2, 'general', 'Test')",
        [convId, userId]
      );
      await pool.query(
        "INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'user', 'Test message')",
        [convId]
      );

      // Verify message exists
      const beforeDelete = await pool.query(
        'SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1',
        [convId]
      );
      expect(parseInt(beforeDelete.rows[0].count)).toBe(1);

      // Delete conversation
      await pool.query('DELETE FROM conversations WHERE id = $1', [convId]);

      // Verify message was cascade deleted
      const afterDelete = await pool.query(
        'SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1',
        [convId]
      );
      expect(parseInt(afterDelete.rows[0].count)).toBe(0);

      // Cleanup
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    });
  });

  describe('Indexes', () => {
    it('should have index on users.email', async () => {
      const result = await pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'users'
        AND indexdef LIKE '%email%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have index on tracking_entries.user_id', async () => {
      const result = await pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'tracking_entries'
        AND indexdef LIKE '%user_id%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have composite index on tracking_entries (user_id, entry_date)', async () => {
      const result = await pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'tracking_entries'
        AND indexdef LIKE '%user_id%entry_date%'
      `);

      expect(result.rows.length).toBe(1);
    });
  });

  describe('Extensions', () => {
    it('should have uuid-ossp extension', async () => {
      const result = await pool.query(`
        SELECT extname FROM pg_extension WHERE extname = 'uuid-ossp'
      `);

      expect(result.rows.length).toBe(1);
    });

  });

  describe('RLS enabled', () => {
    it('should have RLS enabled on sensitive tables', async () => {
      const result = await pool.query(`
        SELECT relname, relrowsecurity
        FROM pg_class
        WHERE relname IN ('users', 'notes', 'tracking_entries', 'vault_items', 'conversations')
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      `);

      for (const row of result.rows) {
        expect(row.relrowsecurity).toBe(true);
      }
    });
  });

  describe('Drizzle migrations table', () => {
    it('should have drizzle migrations tracking table', async () => {
      const result = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'drizzle'
        OR table_name = '__drizzle_migrations'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have at least one migration recorded', async () => {
      // Try both possible table locations
      let result;
      try {
        result = await pool.query('SELECT COUNT(*) as count FROM drizzle.__drizzle_migrations');
      } catch {
        result = await pool.query('SELECT COUNT(*) as count FROM __drizzle_migrations');
      }

      expect(parseInt(result.rows[0].count)).toBeGreaterThanOrEqual(1);
    });
  });
});
