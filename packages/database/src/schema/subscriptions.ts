// packages/database/src/schema/subscriptions.ts
// Subscriptions table (Stripe local copy) as defined in docs/specs/data-model.md §4.15

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { subscriptionStatusEnum } from './enums';
import { users } from './users';

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Stripe references
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 })
      .notNull()
      .unique(),
    stripePriceId: varchar('stripe_price_id', { length: 255 }).notNull(),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).notNull(),

    // Status
    status: subscriptionStatusEnum('status').notNull(),

    // Period
    currentPeriodStart: timestamp('current_period_start', {
      withTimezone: true,
    }).notNull(),
    currentPeriodEnd: timestamp('current_period_end', {
      withTimezone: true,
    }).notNull(),

    // Cancellation
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),

    // Trial
    trialStart: timestamp('trial_start', { withTimezone: true }),
    trialEnd: timestamp('trial_end', { withTimezone: true }),

    // Metadata from Stripe
    metadata: jsonb('metadata'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('subscriptions_user_id_idx').on(table.userId),
    index('subscriptions_stripe_subscription_id_idx').on(
      table.stripeSubscriptionId
    ),
    index('subscriptions_status_idx').on(table.status),
  ]
);

// Types
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
