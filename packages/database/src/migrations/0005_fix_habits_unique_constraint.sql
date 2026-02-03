-- Fix habits unique constraint to allow recreating soft-deleted habits
-- The original constraint prevented creating a habit with the same name as a deleted one

-- Drop the existing constraint that applies to all rows (including soft-deleted)
ALTER TABLE "habits" DROP CONSTRAINT IF EXISTS "habits_user_name_unique";--> statement-breakpoint

-- Create a partial unique index that only applies to non-deleted habits
-- This allows creating a new habit with the same name after the old one was soft-deleted
CREATE UNIQUE INDEX "habits_user_name_unique" ON "habits" ("user_id", "name") WHERE "deleted_at" IS NULL;
