-- Fix users email unique constraint to allow recreating accounts with same email after deletion
-- The original constraint prevented re-registering with the same email after account deletion

-- Drop the existing constraint that applies to all rows (including soft-deleted)
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_unique";--> statement-breakpoint

-- Create a partial unique index that only applies to non-deleted users
-- This allows creating a new account with the same email after the old one was soft-deleted
CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email") WHERE "deleted_at" IS NULL;
