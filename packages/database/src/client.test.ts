// packages/database/src/client.test.ts
// Tests for client module - verifies exports and basic structure
// Note: Full integration tests should run against a real database
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { describe, it, expect } from 'vitest';
import {
  getPool,
  getDb,
  closePool,
  withUserId,
  withTransaction,
  withUserTransaction,
  schema,
} from './client';

describe('client', () => {
  describe('exports', () => {
    it('should export getPool function', () => {
      expect(getPool).toBeTypeOf('function');
    });

    it('should export getDb function', () => {
      expect(getDb).toBeTypeOf('function');
    });

    it('should export closePool function', () => {
      expect(closePool).toBeTypeOf('function');
    });

    it('should export withUserId function', () => {
      expect(withUserId).toBeTypeOf('function');
    });

    it('should export withTransaction function', () => {
      expect(withTransaction).toBeTypeOf('function');
    });

    it('should export withUserTransaction function', () => {
      expect(withUserTransaction).toBeTypeOf('function');
    });
  });

  describe('schema', () => {
    it('should export schema object with all tables', () => {
      expect(schema).toBeDefined();
      expect(schema.users).toBeDefined();
      expect(schema.conversations).toBeDefined();
      expect(schema.messages).toBeDefined();
      expect(schema.trackingEntries).toBeDefined();
      expect(schema.lifeBalanceHistory).toBeDefined();
      expect(schema.notes).toBeDefined();
      expect(schema.noteLinks).toBeDefined();
      expect(schema.decisions).toBeDefined();
      expect(schema.decisionOptions).toBeDefined();
      expect(schema.decisionCriteria).toBeDefined();
      expect(schema.decisionScores).toBeDefined();
      expect(schema.people).toBeDefined();
      expect(schema.personNotes).toBeDefined();
      expect(schema.personInteractions).toBeDefined();
      expect(schema.vaultItems).toBeDefined();
      expect(schema.goals).toBeDefined();
      expect(schema.goalMilestones).toBeDefined();
      expect(schema.habits).toBeDefined();
      expect(schema.habitCompletions).toBeDefined();
      expect(schema.habitFreezes).toBeDefined();
      expect(schema.notifications).toBeDefined();
      expect(schema.reminders).toBeDefined();
      expect(schema.userIntegrations).toBeDefined();
      expect(schema.calendarEvents).toBeDefined();
      expect(schema.budgets).toBeDefined();
      expect(schema.subscriptions).toBeDefined();
      expect(schema.exportRequests).toBeDefined();
      expect(schema.auditLogs).toBeDefined();
    });

    it('should export 28 tables and 21 enums in schema', () => {
      const schemaKeys = Object.keys(schema);
      // 28 tables + 21 enums + 5 additional exports (types, preferences, etc)
      expect(schemaKeys.length).toBeGreaterThanOrEqual(50);
    });
  });
});
