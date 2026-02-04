-- Create custom_metric_definitions table
-- @see docs/specs/domains/tracking.md §4.2

CREATE TABLE "custom_metric_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(50) DEFAULT '📊' NOT NULL,
	"color" varchar(7),
	"unit" varchar(20) NOT NULL,
	"min_value" numeric(10, 2),
	"max_value" numeric(10, 2),
	"area" "life_area" DEFAULT 'learning' NOT NULL,
	"sub_area" "sub_area",
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "custom_metric_definitions" ADD CONSTRAINT "custom_metric_definitions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "custom_metric_definitions_user_id_idx" ON "custom_metric_definitions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "custom_metric_definitions_user_id_active_idx" ON "custom_metric_definitions" USING btree ("user_id","is_active");
--> statement-breakpoint
-- Partial unique index: name unique per user (case-insensitive) only for non-deleted records
CREATE UNIQUE INDEX "custom_metric_defs_user_name_unique" ON "custom_metric_definitions" (user_id, LOWER(name)) WHERE deleted_at IS NULL;
