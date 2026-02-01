ALTER TABLE "tracking_entries" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."tracking_type";--> statement-breakpoint
CREATE TYPE "public"."tracking_type" AS ENUM('weight', 'water', 'sleep', 'exercise', 'mood', 'energy', 'custom');--> statement-breakpoint
ALTER TABLE "tracking_entries" ALTER COLUMN "type" SET DATA TYPE "public"."tracking_type" USING "type"::"public"."tracking_type";