ALTER TABLE "incomes" ADD COLUMN "recurring_group_id" uuid;--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "recurring_group_id" uuid;--> statement-breakpoint
ALTER TABLE "variable_expenses" ADD COLUMN "recurring_group_id" uuid;--> statement-breakpoint
CREATE INDEX "incomes_user_recurring_group_idx" ON "incomes" USING btree ("user_id","recurring_group_id");--> statement-breakpoint
CREATE INDEX "bills_user_recurring_group_idx" ON "bills" USING btree ("user_id","recurring_group_id");--> statement-breakpoint
CREATE INDEX "variable_expenses_user_recurring_group_idx" ON "variable_expenses" USING btree ("user_id","recurring_group_id");--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_user_recurring_group_month_year_unique" UNIQUE("user_id","recurring_group_id","month_year");--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_user_recurring_group_month_year_unique" UNIQUE("user_id","recurring_group_id","month_year");--> statement-breakpoint
ALTER TABLE "variable_expenses" ADD CONSTRAINT "variable_expenses_user_recurring_group_month_year_unique" UNIQUE("user_id","recurring_group_id","month_year");