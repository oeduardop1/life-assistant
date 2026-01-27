ALTER TYPE "public"."debt_status" ADD VALUE 'overdue' BEFORE 'paid_off';--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "start_month_year" varchar(7);