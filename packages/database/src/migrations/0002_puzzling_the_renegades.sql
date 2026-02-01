DROP TABLE "habit_freezes" CASCADE;--> statement-breakpoint
ALTER TABLE "habits" ALTER COLUMN "frequency" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."habit_frequency";--> statement-breakpoint
CREATE TYPE "public"."habit_frequency" AS ENUM('daily', 'weekdays', 'weekends', 'custom');--> statement-breakpoint
ALTER TABLE "habits" ALTER COLUMN "frequency" SET DATA TYPE "public"."habit_frequency" USING "frequency"::"public"."habit_frequency";