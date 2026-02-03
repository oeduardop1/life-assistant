CREATE TYPE "public"."period_of_day" AS ENUM('morning', 'afternoon', 'evening', 'anytime');--> statement-breakpoint
ALTER TABLE "habit_completions" RENAME COLUMN "date" TO "completion_date";--> statement-breakpoint
ALTER TABLE "habits" RENAME COLUMN "title" TO "name";--> statement-breakpoint
ALTER TABLE "habits" RENAME COLUMN "days_of_week" TO "frequency_days";--> statement-breakpoint
DROP INDEX "habits_is_active_idx";--> statement-breakpoint
DROP INDEX "habit_completions_date_idx";--> statement-breakpoint
ALTER TABLE "habits" ALTER COLUMN "frequency" SET DEFAULT 'daily';--> statement-breakpoint
ALTER TABLE "habit_completions" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "habit_completions" ADD COLUMN "completed_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "habit_completions" ADD COLUMN "source" varchar(50) DEFAULT 'form' NOT NULL;--> statement-breakpoint
ALTER TABLE "habits" ADD COLUMN "icon" varchar(50) DEFAULT '✓' NOT NULL;--> statement-breakpoint
ALTER TABLE "habits" ADD COLUMN "color" varchar(7);--> statement-breakpoint
ALTER TABLE "habits" ADD COLUMN "period_of_day" "period_of_day" DEFAULT 'anytime' NOT NULL;--> statement-breakpoint
ALTER TABLE "habits" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "habit_completions" ADD CONSTRAINT "habit_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "habit_completions_user_date_idx" ON "habit_completions" USING btree ("user_id","completion_date");--> statement-breakpoint
CREATE INDEX "habits_user_active_idx" ON "habits" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "habit_completions_date_idx" ON "habit_completions" USING btree ("completion_date");--> statement-breakpoint
ALTER TABLE "habit_completions" DROP COLUMN "completed";--> statement-breakpoint
ALTER TABLE "habit_completions" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "habits" DROP COLUMN "area";--> statement-breakpoint
ALTER TABLE "habits" DROP COLUMN "sub_area";--> statement-breakpoint
ALTER TABLE "habits" DROP COLUMN "times_per_period";--> statement-breakpoint
ALTER TABLE "habits" DROP COLUMN "current_streak";--> statement-breakpoint
ALTER TABLE "habits" DROP COLUMN "total_completions";--> statement-breakpoint
ALTER TABLE "habit_completions" ADD CONSTRAINT "habit_completions_habit_date_unique" UNIQUE("habit_id","completion_date");--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_user_name_unique" UNIQUE("user_id","name");