// packages/database/src/schema/users.ts
// Users table as defined in docs/specs/data-model.md §4.1

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  decimal,
  date,
} from 'drizzle-orm/pg-core';
import { userStatusEnum, userPlanEnum } from './enums';
import { defaultUserPreferences } from './preferences';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Auth (synced from Supabase Auth)
  email: varchar('email', { length: 255 }).notNull().unique(),

  // Profile
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),

  // Physical data (for health calculations like BMI)
  height: decimal('height', { precision: 5, scale: 2 }), // height in cm
  birthDate: date('birth_date'), // date of birth

  // Settings
  timezone: varchar('timezone', { length: 50 })
    .notNull()
    .default('America/Sao_Paulo'),
  locale: varchar('locale', { length: 10 }).notNull().default('pt-BR'),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),

  // Preferences (JSONB - validated by Zod in application layer)
  preferences: jsonb('preferences').notNull().$type<typeof defaultUserPreferences>().default(defaultUserPreferences),

  // Plan & Billing
  plan: userPlanEnum('plan').notNull().default('free'),
  planExpiresAt: timestamp('plan_expires_at', { withTimezone: true }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),

  // Status
  status: userStatusEnum('status').notNull().default('pending'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  onboardingCompletedAt: timestamp('onboarding_completed_at', {
    withTimezone: true,
  }),

  // Soft delete
  deletedAt: timestamp('deleted_at', { withTimezone: true }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
