// packages/database/src/schema/preferences.test.ts
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { describe, it, expect } from 'vitest';
import {
  userPreferencesSchema,
  defaultUserPreferences,
  parseUserPreferences,
  validatePartialPreferences,
  safeParseUserPreferences,
  type UserPreferences,
  type PartialUserPreferences,
} from './preferences';

describe('preferences', () => {
  describe('userPreferencesSchema', () => {
    it('should parse empty object to defaults', () => {
      const result = userPreferencesSchema.parse({});
      expect(result.christianPerspective).toBe(false);
      expect(result.areaWeights.health).toBe(1.0);
      expect(result.notifications.pushEnabled).toBe(true);
      expect(result.tracking.waterGoal).toBe(2000);
    });

    it('should parse valid preferences', () => {
      // ADR-017: Updated to 6 main areas
      const input = {
        christianPerspective: true,
        areaWeights: {
          health: 0.9,
          finance: 0.8,
        },
        notifications: {
          pushEnabled: false,
          morningSummaryTime: '08:30',
        },
        tracking: {
          waterGoal: 3000,
        },
      };
      const result = userPreferencesSchema.parse(input);
      expect(result.christianPerspective).toBe(true);
      expect(result.areaWeights.health).toBe(0.9);
      expect(result.areaWeights.finance).toBe(0.8);
      expect(result.areaWeights.professional).toBe(1.0); // default
      expect(result.notifications.pushEnabled).toBe(false);
      expect(result.notifications.morningSummaryTime).toBe('08:30');
      expect(result.tracking.waterGoal).toBe(3000);
    });

    // ADR-017: areaWeights max changed from 1 to 2 (WEIGHT_CONFIG.MAX)
    it('should reject invalid areaWeights values', () => {
      expect(() =>
        userPreferencesSchema.parse({
          areaWeights: { health: 2.5 }, // > 2
        })
      ).toThrow();

      expect(() =>
        userPreferencesSchema.parse({
          areaWeights: { health: -0.1 }, // < 0
        })
      ).toThrow();
    });

    it('should reject invalid time formats', () => {
      expect(() =>
        userPreferencesSchema.parse({
          notifications: { quietHoursStart: '9:00' }, // missing leading zero
        })
      ).toThrow();

      expect(() =>
        userPreferencesSchema.parse({
          notifications: { quietHoursStart: '25:00' }, // invalid hour
        })
      ).toThrow();
    });

    it('should reject invalid tracking values', () => {
      expect(() =>
        userPreferencesSchema.parse({
          tracking: { waterGoal: -100 }, // negative
        })
      ).toThrow();

      expect(() =>
        userPreferencesSchema.parse({
          tracking: { waterGoal: 1.5 }, // not integer
        })
      ).toThrow();
    });
  });

  describe('defaultUserPreferences', () => {
    // ADR-017: 6 fixed areas with equal weights (1.0)
    it('should have correct default values', () => {
      expect(defaultUserPreferences.christianPerspective).toBe(false);
      expect(defaultUserPreferences.areaWeights.health).toBe(1.0);
      expect(defaultUserPreferences.areaWeights.finance).toBe(1.0);
      expect(defaultUserPreferences.areaWeights.professional).toBe(1.0);
      expect(defaultUserPreferences.areaWeights.learning).toBe(1.0);
      expect(defaultUserPreferences.areaWeights.spiritual).toBe(1.0);
      expect(defaultUserPreferences.areaWeights.relationships).toBe(1.0);
    });

    it('should have correct notification defaults', () => {
      expect(defaultUserPreferences.notifications.pushEnabled).toBe(true);
      expect(defaultUserPreferences.notifications.telegramEnabled).toBe(false);
      expect(defaultUserPreferences.notifications.emailEnabled).toBe(true);
      expect(defaultUserPreferences.notifications.quietHoursEnabled).toBe(true);
      expect(defaultUserPreferences.notifications.quietHoursStart).toBe('22:00');
      expect(defaultUserPreferences.notifications.quietHoursEnd).toBe('08:00');
      expect(defaultUserPreferences.notifications.morningSummary).toBe(true);
      expect(defaultUserPreferences.notifications.morningSummaryTime).toBe('07:00');
      expect(defaultUserPreferences.notifications.weeklyReport).toBe(true);
      expect(defaultUserPreferences.notifications.monthlyReport).toBe(true);
    });

    it('should have correct tracking defaults', () => {
      expect(defaultUserPreferences.tracking.waterGoal).toBe(2000);
      expect(defaultUserPreferences.tracking.sleepGoal).toBe(8);
      expect(defaultUserPreferences.tracking.exerciseGoalWeekly).toBe(150);
    });

    it('should be a valid UserPreferences type', () => {
      const prefs: UserPreferences = defaultUserPreferences;
      expect(prefs).toBeDefined();
    });
  });

  describe('parseUserPreferences', () => {
    it('should parse valid preferences', () => {
      const result = parseUserPreferences({
        christianPerspective: true,
      });
      expect(result.christianPerspective).toBe(true);
    });

    it('should throw on invalid input', () => {
      expect(() =>
        parseUserPreferences({
          areaWeights: { health: 'invalid' },
        })
      ).toThrow();
    });

    it('should fill in defaults for missing fields', () => {
      const result = parseUserPreferences({});
      expect(result.tracking.waterGoal).toBe(2000);
    });
  });

  describe('validatePartialPreferences', () => {
    it('should validate partial updates', () => {
      const result = validatePartialPreferences({
        christianPerspective: true,
      });
      expect(result.christianPerspective).toBe(true);
      expect(result.areaWeights).toBeUndefined();
    });

    it('should validate empty object', () => {
      const result = validatePartialPreferences({});
      expect(result).toEqual({});
    });

    it('should throw on invalid partial values', () => {
      expect(() =>
        validatePartialPreferences({
          areaWeights: { health: 'invalid' },
        })
      ).toThrow();
    });

    it('should return PartialUserPreferences type', () => {
      const result: PartialUserPreferences = validatePartialPreferences({
        christianPerspective: false,
      });
      expect(result).toBeDefined();
    });
  });

  describe('safeParseUserPreferences', () => {
    it('should return parsed data on valid input', () => {
      const result = safeParseUserPreferences({
        christianPerspective: true,
      });
      expect(result.christianPerspective).toBe(true);
    });

    it('should return defaults on invalid input', () => {
      const result = safeParseUserPreferences({
        areaWeights: { health: 'invalid' },
      });
      expect(result).toEqual(defaultUserPreferences);
    });

    it('should return defaults on null', () => {
      const result = safeParseUserPreferences(null);
      expect(result).toEqual(defaultUserPreferences);
    });

    it('should return defaults on undefined', () => {
      const result = safeParseUserPreferences(undefined);
      expect(result).toEqual(defaultUserPreferences);
    });

    it('should return defaults on non-object', () => {
      const result = safeParseUserPreferences('string');
      expect(result).toEqual(defaultUserPreferences);
    });
  });
});
