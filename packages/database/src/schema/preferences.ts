// packages/database/src/schema/preferences.ts
// Zod schema for JSONB preferences field as defined in DATA_MODEL.md §3.3

import { z } from 'zod';

// Schema Zod for runtime validation
export const userPreferencesSchema = z.object({
  // Christian perspective enabled
  christianPerspective: z.boolean().default(false),

  // Life area weights (0.0 to 1.0)
  areaWeights: z
    .object({
      health: z.number().min(0).max(1).default(1.0),
      financial: z.number().min(0).max(1).default(1.0),
      relationships: z.number().min(0).max(1).default(1.0),
      career: z.number().min(0).max(1).default(1.0),
      personal_growth: z.number().min(0).max(1).default(0.8),
      leisure: z.number().min(0).max(1).default(0.8),
      spirituality: z.number().min(0).max(1).default(0.5),
      mental_health: z.number().min(0).max(1).default(1.0),
    })
    .default({}),

  // Notification settings
  notifications: z
    .object({
      pushEnabled: z.boolean().default(true),
      telegramEnabled: z.boolean().default(false),
      emailEnabled: z.boolean().default(true),
      quietHoursEnabled: z.boolean().default(true),
      quietHoursStart: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .default('22:00'),
      quietHoursEnd: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .default('08:00'),
      morningSummary: z.boolean().default(true),
      morningSummaryTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .default('07:00'),
      weeklyReport: z.boolean().default(true),
      monthlyReport: z.boolean().default(true),
    })
    .default({}),

  // Tracking goals
  tracking: z
    .object({
      waterGoal: z.number().int().positive().default(2000), // ml
      sleepGoal: z.number().positive().default(8), // hours
      exerciseGoalWeekly: z.number().int().positive().default(150), // minutes
    })
    .default({}),
});

// Type inferred from schema
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

// Default value
export const defaultUserPreferences: UserPreferences =
  userPreferencesSchema.parse({});

// Function to validate and merge with defaults
export function parseUserPreferences(data: unknown): UserPreferences {
  return userPreferencesSchema.parse(data);
}

// Partial schema for updates
const partialPreferencesSchema = userPreferencesSchema.partial();

// Type for partial preferences
export type PartialUserPreferences = z.infer<typeof partialPreferencesSchema>;

// Function for partial validation (update)
export function validatePartialPreferences(
  data: unknown
): PartialUserPreferences {
  return partialPreferencesSchema.parse(data);
}

// Safe parse that returns default on error
export function safeParseUserPreferences(data: unknown): UserPreferences {
  const result = userPreferencesSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  return defaultUserPreferences;
}
