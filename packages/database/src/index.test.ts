// packages/database/src/index.test.ts
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect } from 'vitest';
import { getTableName } from 'drizzle-orm';
import {
  DATABASE_VERSION,
  // Client exports
  getDb,
  getPool,
  closePool,
  withUserId,
  withTransaction,
  withUserTransaction,
  schema,
  // Schema exports (sample)
  users,
  conversations,
  trackingEntries,
  notes,
  // Enum exports (sample)
  userStatusEnum,
  lifeAreaEnum,
  trackingTypeEnum,
  // Preferences exports
  userPreferencesSchema,
  defaultUserPreferences,
  parseUserPreferences,
  // Type exports
  type User,
  type Conversation,
  type TrackingEntry,
  type Note,
  type UserPreferences,
} from './index';

describe('index exports', () => {
  describe('DATABASE_VERSION', () => {
    it('should export version string', () => {
      expect(DATABASE_VERSION).toBe('0.1.0');
    });
  });

  describe('client exports', () => {
    it('should export getDb', () => {
      expect(getDb).toBeTypeOf('function');
    });

    it('should export getPool', () => {
      expect(getPool).toBeTypeOf('function');
    });

    it('should export closePool', () => {
      expect(closePool).toBeTypeOf('function');
    });

    it('should export withUserId', () => {
      expect(withUserId).toBeTypeOf('function');
    });

    it('should export withTransaction', () => {
      expect(withTransaction).toBeTypeOf('function');
    });

    it('should export withUserTransaction', () => {
      expect(withUserTransaction).toBeTypeOf('function');
    });

    it('should export schema', () => {
      expect(schema).toBeDefined();
      expect(schema.users).toBeDefined();
    });
  });

  describe('table exports', () => {
    it('should export users table', () => {
      expect(users).toBeDefined();
      expect(getTableName(users)).toBe('users');
    });

    it('should export conversations table', () => {
      expect(conversations).toBeDefined();
      expect(getTableName(conversations)).toBe('conversations');
    });

    it('should export trackingEntries table', () => {
      expect(trackingEntries).toBeDefined();
      expect(getTableName(trackingEntries)).toBe('tracking_entries');
    });

    it('should export notes table', () => {
      expect(notes).toBeDefined();
      expect(getTableName(notes)).toBe('notes');
    });
  });

  describe('enum exports', () => {
    it('should export userStatusEnum', () => {
      expect(userStatusEnum).toBeDefined();
      expect(userStatusEnum.enumName).toBe('user_status');
    });

    it('should export lifeAreaEnum', () => {
      expect(lifeAreaEnum).toBeDefined();
      expect(lifeAreaEnum.enumName).toBe('life_area');
    });

    it('should export trackingTypeEnum', () => {
      expect(trackingTypeEnum).toBeDefined();
      expect(trackingTypeEnum.enumName).toBe('tracking_type');
    });
  });

  describe('preferences exports', () => {
    it('should export userPreferencesSchema', () => {
      expect(userPreferencesSchema).toBeDefined();
    });

    it('should export defaultUserPreferences', () => {
      expect(defaultUserPreferences).toBeDefined();
      expect(defaultUserPreferences.christianPerspective).toBe(false);
    });

    it('should export parseUserPreferences', () => {
      expect(parseUserPreferences).toBeTypeOf('function');
    });
  });

  describe('type exports', () => {
    it('should export User type', () => {
      const user: User = {} as User;
      expect(user).toBeDefined();
    });

    it('should export Conversation type', () => {
      const conv: Conversation = {} as Conversation;
      expect(conv).toBeDefined();
    });

    it('should export TrackingEntry type', () => {
      const entry: TrackingEntry = {} as TrackingEntry;
      expect(entry).toBeDefined();
    });

    it('should export Note type', () => {
      const note: Note = {} as Note;
      expect(note).toBeDefined();
    });

    it('should export UserPreferences type', () => {
      const prefs: UserPreferences = {} as UserPreferences;
      expect(prefs).toBeDefined();
    });
  });
});
