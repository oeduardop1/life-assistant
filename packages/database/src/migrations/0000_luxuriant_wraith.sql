-- Migration: 0000_luxuriant_wraith.sql
-- Made idempotent for consolidation with Supabase migrations
-- Uses DO $$ blocks with EXCEPTION handlers for CREATE TYPE
-- Uses IF NOT EXISTS for CREATE TABLE, CREATE INDEX, etc.

-- =============================================================================
-- ENUMS (idempotent with DO $$ blocks)
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE "public"."bill_category" AS ENUM('housing', 'utilities', 'subscription', 'insurance', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."bill_status" AS ENUM('pending', 'paid', 'overdue', 'canceled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."consolidation_status" AS ENUM('completed', 'failed', 'partial');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."conversation_type" AS ENUM('general', 'counselor', 'quick_action', 'report');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."debt_status" AS ENUM('active', 'paid_off', 'settled', 'defaulted');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."exercise_intensity" AS ENUM('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."exercise_type" AS ENUM('cardio', 'strength', 'flexibility', 'sports', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."expense_category" AS ENUM('food', 'transport', 'housing', 'health', 'education', 'entertainment', 'shopping', 'bills', 'subscriptions', 'travel', 'gifts', 'investments', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."export_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'expired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."export_type" AS ENUM('full_data', 'partial_data', 'deletion_request');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."goal_status" AS ENUM('not_started', 'in_progress', 'completed', 'failed', 'canceled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."habit_frequency" AS ENUM('daily', 'weekly', 'custom');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."income_frequency" AS ENUM('monthly', 'biweekly', 'weekly', 'annual', 'irregular');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."income_type" AS ENUM('salary', 'freelance', 'bonus', 'passive', 'investment', 'gift', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."interaction_type" AS ENUM('call', 'message', 'meeting', 'email', 'gift', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."investment_type" AS ENUM('emergency_fund', 'retirement', 'short_term', 'long_term', 'education', 'custom');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."knowledge_item_source" AS ENUM('conversation', 'user_input', 'ai_inference');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."knowledge_item_type" AS ENUM('fact', 'preference', 'memory', 'insight', 'person');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."life_area" AS ENUM('health', 'finance', 'professional', 'learning', 'spiritual', 'relationships');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'read', 'dismissed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."notification_type" AS ENUM('reminder', 'alert', 'report', 'insight', 'milestone', 'social');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."relationship_type" AS ENUM('family', 'friend', 'work', 'acquaintance', 'romantic', 'mentor', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."sub_area" AS ENUM('physical', 'mental', 'leisure', 'budget', 'savings', 'debts', 'investments', 'career', 'business', 'formal', 'informal', 'practice', 'community', 'family', 'romantic', 'social');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."subscription_status" AS ENUM('active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid', 'paused');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."tracking_type" AS ENUM('weight', 'water', 'sleep', 'exercise', 'expense', 'income', 'investment', 'habit', 'mood', 'energy', 'custom');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."user_plan" AS ENUM('free', 'pro', 'premium');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."user_status" AS ENUM('pending', 'active', 'suspended', 'canceled', 'deleted');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."vault_category" AS ENUM('personal', 'financial', 'work', 'health', 'legal', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."vault_item_type" AS ENUM('credential', 'document', 'card', 'note', 'file');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- =============================================================================
-- HELPER FUNCTION: updated_at trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';--> statement-breakpoint

-- =============================================================================
-- TABLES (with IF NOT EXISTS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"avatar_url" text,
	"height" numeric(5, 2),
	"birth_date" date,
	"timezone" varchar(50) DEFAULT 'America/Sao_Paulo' NOT NULL,
	"locale" varchar(10) DEFAULT 'pt-BR' NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"preferences" jsonb DEFAULT '{"christianPerspective":false,"areaWeights":{"health":1,"finance":1,"professional":1,"learning":0.8,"spiritual":0.5,"relationships":1},"notifications":{"pushEnabled":true,"telegramEnabled":false,"emailEnabled":true,"quietHoursEnabled":true,"quietHoursStart":"22:00","quietHoursEnd":"08:00","morningSummary":true,"morningSummaryTime":"07:00","weeklyReport":true,"monthlyReport":true},"tracking":{"waterGoal":2000,"sleepGoal":8,"exerciseGoalWeekly":150},"onboarding":{"profileComplete":false,"areasComplete":false,"telegramComplete":false,"telegramSkipped":false,"tutorialComplete":false,"tutorialSkipped":false}}'::jsonb NOT NULL,
	"plan" "user_plan" DEFAULT 'free' NOT NULL,
	"plan_expires_at" timestamp with time zone,
	"stripe_customer_id" varchar(255),
	"status" "user_status" DEFAULT 'pending' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"onboarding_completed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "conversation_type" DEFAULT 'general' NOT NULL,
	"title" varchar(255),
	"metadata" jsonb,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"actions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tracking_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "tracking_type" NOT NULL,
	"area" "life_area" NOT NULL,
	"sub_area" "sub_area",
	"value" numeric(10, 2) NOT NULL,
	"unit" varchar(20),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"entry_date" date NOT NULL,
	"entry_time" timestamp with time zone,
	"source" varchar(50) DEFAULT 'form' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "life_balance_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"snapshot_date" date NOT NULL,
	"overall_score" integer NOT NULL,
	"area_scores" jsonb NOT NULL,
	"weights_used" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "life_balance_history_user_date_unique" UNIQUE("user_id","snapshot_date")
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "note_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_note_id" uuid NOT NULL,
	"target_note_id" uuid NOT NULL,
	"link_text" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"excerpt" varchar(500),
	"folder" varchar(255),
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"nickname" varchar(100),
	"relationship" "relationship_type" NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"birthday" date,
	"anniversary" date,
	"preferences" jsonb DEFAULT '{"interests":[],"dislikes":[],"giftIdeas":[],"dietaryRestrictions":[],"importantTopics":[]}'::jsonb NOT NULL,
	"contact_frequency_days" integer,
	"last_contact" date,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "person_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "interaction_type" NOT NULL,
	"date" date NOT NULL,
	"notes" text,
	"conversation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "person_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "vault_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "vault_item_type" NOT NULL,
	"category" "vault_category" NOT NULL,
	"name" varchar(255) NOT NULL,
	"encrypted_data" "bytea" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "goal_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"target_value" numeric(10, 2) NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"area" "life_area" NOT NULL,
	"sub_area" "sub_area",
	"target_value" numeric(10, 2) NOT NULL,
	"current_value" numeric(10, 2) DEFAULT '0' NOT NULL,
	"unit" varchar(50) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "goal_status" DEFAULT 'not_started' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "habit_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"habit_id" uuid NOT NULL,
	"date" date NOT NULL,
	"completed" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "habits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"area" "life_area" NOT NULL,
	"sub_area" "sub_area",
	"frequency" "habit_frequency" NOT NULL,
	"days_of_week" jsonb DEFAULT '[]'::jsonb,
	"times_per_period" integer,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"total_completions" integer DEFAULT 0 NOT NULL,
	"reminder_time" time,
	"reminder_enabled" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"scheduled_for" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"remind_at" timestamp with time zone NOT NULL,
	"repeat_pattern" varchar(50),
	"repeat_until" timestamp with time zone,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "user_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"external_id" varchar(255),
	"credentials" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_error" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"calendar_id" varchar(255) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"location" varchar(500),
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"timezone" varchar(50),
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurrence_rule" varchar(255),
	"status" varchar(20) DEFAULT 'confirmed' NOT NULL,
	"synced_at" timestamp with time zone NOT NULL,
	"etag" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"category" "expense_category",
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"spent_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_user_year_month_category_unique" UNIQUE("user_id","year","month","category")
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_subscription_id" varchar(255) NOT NULL,
	"stripe_price_id" varchar(255) NOT NULL,
	"stripe_customer_id" varchar(255) NOT NULL,
	"status" "subscription_status" NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"trial_start" timestamp with time zone,
	"trial_end" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "incomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "income_type" NOT NULL,
	"frequency" "income_frequency" NOT NULL,
	"expected_amount" numeric(12, 2) NOT NULL,
	"actual_amount" numeric(12, 2),
	"is_recurring" boolean DEFAULT true NOT NULL,
	"month_year" varchar(7) NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" "bill_category" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"due_day" integer NOT NULL,
	"status" "bill_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"is_recurring" boolean DEFAULT true NOT NULL,
	"month_year" varchar(7) NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "variable_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" "expense_category" NOT NULL,
	"expected_amount" numeric(12, 2) NOT NULL,
	"actual_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"month_year" varchar(7) NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"creditor" varchar(255),
	"total_amount" numeric(12, 2) NOT NULL,
	"is_negotiated" boolean DEFAULT true NOT NULL,
	"total_installments" integer,
	"installment_amount" numeric(12, 2),
	"current_installment" integer DEFAULT 1 NOT NULL,
	"due_day" integer,
	"status" "debt_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "debt_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"debt_id" uuid NOT NULL,
	"installment_number" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"month_year" varchar(7) NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "investments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "investment_type" NOT NULL,
	"goal_amount" numeric(12, 2),
	"current_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"monthly_contribution" numeric(12, 2),
	"deadline" date,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "export_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "export_type" NOT NULL,
	"status" "export_status" DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"file_url" varchar(1000),
	"file_expires_at" timestamp with time zone,
	"file_size_bytes" integer,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "habit_freezes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"habit_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource" varchar(100) NOT NULL,
	"resource_id" uuid,
	"metadata" jsonb,
	"ip" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "user_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bio" text,
	"occupation" varchar(255),
	"family_context" text,
	"current_goals" jsonb DEFAULT '[]'::jsonb,
	"current_challenges" jsonb DEFAULT '[]'::jsonb,
	"top_of_mind" jsonb DEFAULT '[]'::jsonb,
	"values" jsonb DEFAULT '[]'::jsonb,
	"communication_style" varchar(50),
	"feedback_preferences" text,
	"learned_patterns" jsonb DEFAULT '[]'::jsonb,
	"christian_perspective" boolean DEFAULT false,
	"version" integer DEFAULT 1 NOT NULL,
	"last_consolidated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_memories_user_id_unique" UNIQUE("user_id")
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "knowledge_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "knowledge_item_type" NOT NULL,
	"area" "life_area",
	"sub_area" "sub_area",
	"title" varchar(255),
	"content" text NOT NULL,
	"source" "knowledge_item_source" NOT NULL,
	"source_ref" uuid,
	"inference_evidence" text,
	"confidence" real DEFAULT 0.9 NOT NULL,
	"validated_by_user" boolean DEFAULT false,
	"related_items" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"person_metadata" jsonb,
	"superseded_by_id" uuid,
	"superseded_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "memory_consolidations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"consolidated_from" timestamp with time zone NOT NULL,
	"consolidated_to" timestamp with time zone NOT NULL,
	"messages_processed" integer DEFAULT 0 NOT NULL,
	"facts_created" integer DEFAULT 0 NOT NULL,
	"facts_updated" integer DEFAULT 0 NOT NULL,
	"inferences_created" integer DEFAULT 0 NOT NULL,
	"memory_updates" jsonb,
	"raw_output" jsonb,
	"status" "consolidation_status" NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- =============================================================================
-- FOREIGN KEYS (idempotent - PostgreSQL ignores duplicate constraints)
-- =============================================================================

DO $$ BEGIN
    ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "tracking_entries" ADD CONSTRAINT "tracking_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "life_balance_history" ADD CONSTRAINT "life_balance_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "note_links" ADD CONSTRAINT "note_links_source_note_id_notes_id_fk" FOREIGN KEY ("source_note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "note_links" ADD CONSTRAINT "note_links_target_note_id_notes_id_fk" FOREIGN KEY ("target_note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "people" ADD CONSTRAINT "people_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "person_interactions" ADD CONSTRAINT "person_interactions_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "person_interactions" ADD CONSTRAINT "person_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "person_notes" ADD CONSTRAINT "person_notes_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "person_notes" ADD CONSTRAINT "person_notes_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "vault_items" ADD CONSTRAINT "vault_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "goal_milestones" ADD CONSTRAINT "goal_milestones_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "habit_completions" ADD CONSTRAINT "habit_completions_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "user_integrations" ADD CONSTRAINT "user_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "incomes" ADD CONSTRAINT "incomes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "bills" ADD CONSTRAINT "bills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "variable_expenses" ADD CONSTRAINT "variable_expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "debts" ADD CONSTRAINT "debts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "investments" ADD CONSTRAINT "investments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "export_requests" ADD CONSTRAINT "export_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "habit_freezes" ADD CONSTRAINT "habit_freezes_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "habit_freezes" ADD CONSTRAINT "habit_freezes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "user_memories" ADD CONSTRAINT "user_memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "memory_consolidations" ADD CONSTRAINT "memory_consolidations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- =============================================================================
-- INDEXES (idempotent with IF NOT EXISTS)
-- =============================================================================

CREATE INDEX IF NOT EXISTS "conversations_user_id_idx" ON "conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_created_at_idx" ON "conversations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_conversation_id_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tracking_entries_user_id_idx" ON "tracking_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tracking_entries_user_id_type_idx" ON "tracking_entries" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tracking_entries_user_id_date_idx" ON "tracking_entries" USING btree ("user_id","entry_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tracking_entries_entry_date_idx" ON "tracking_entries" USING btree ("entry_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "life_balance_history_user_id_idx" ON "life_balance_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "life_balance_history_snapshot_date_idx" ON "life_balance_history" USING btree ("snapshot_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "note_links_source_idx" ON "note_links" USING btree ("source_note_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "note_links_target_idx" ON "note_links" USING btree ("target_note_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notes_user_id_idx" ON "notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notes_user_id_folder_idx" ON "notes" USING btree ("user_id","folder");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notes_title_idx" ON "notes" USING btree ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "people_user_id_idx" ON "people" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "people_name_idx" ON "people" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "person_interactions_person_id_idx" ON "person_interactions" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "person_interactions_date_idx" ON "person_interactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "person_notes_person_id_idx" ON "person_notes" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "person_notes_note_id_idx" ON "person_notes" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vault_items_user_id_idx" ON "vault_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vault_items_category_idx" ON "vault_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goal_milestones_goal_id_idx" ON "goal_milestones" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goals_user_id_idx" ON "goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goals_status_idx" ON "goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habit_completions_habit_id_idx" ON "habit_completions" USING btree ("habit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habit_completions_date_idx" ON "habit_completions" USING btree ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habits_user_id_idx" ON "habits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habits_is_active_idx" ON "habits" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_status_idx" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_scheduled_for_idx" ON "notifications" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_user_id_idx" ON "reminders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_remind_at_idx" ON "reminders" USING btree ("remind_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_completed_idx" ON "reminders" USING btree ("completed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_integrations_user_id_idx" ON "user_integrations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_integrations_provider_idx" ON "user_integrations" USING btree ("provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_integrations_user_provider_unique" ON "user_integrations" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_events_user_id_idx" ON "calendar_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_events_external_id_idx" ON "calendar_events" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_events_start_time_idx" ON "calendar_events" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_events_user_id_start_time_idx" ON "calendar_events" USING btree ("user_id","start_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "budgets_user_id_idx" ON "budgets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "budgets_year_month_idx" ON "budgets" USING btree ("year","month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_stripe_subscription_id_idx" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incomes_user_id_idx" ON "incomes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incomes_month_year_idx" ON "incomes" USING btree ("month_year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incomes_user_id_month_year_idx" ON "incomes" USING btree ("user_id","month_year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incomes_type_idx" ON "incomes" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_user_id_idx" ON "bills" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_month_year_idx" ON "bills" USING btree ("month_year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_user_id_month_year_idx" ON "bills" USING btree ("user_id","month_year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_status_idx" ON "bills" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_due_day_idx" ON "bills" USING btree ("due_day");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "variable_expenses_user_id_idx" ON "variable_expenses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "variable_expenses_month_year_idx" ON "variable_expenses" USING btree ("month_year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "variable_expenses_user_id_month_year_idx" ON "variable_expenses" USING btree ("user_id","month_year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "variable_expenses_category_idx" ON "variable_expenses" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "debts_user_id_idx" ON "debts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "debts_status_idx" ON "debts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "debts_is_negotiated_idx" ON "debts" USING btree ("is_negotiated");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "debt_payments_user_id_idx" ON "debt_payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "debt_payments_debt_id_idx" ON "debt_payments" USING btree ("debt_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "debt_payments_user_month_year_idx" ON "debt_payments" USING btree ("user_id","month_year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "investments_user_id_idx" ON "investments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "investments_type_idx" ON "investments" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "export_requests_user_id_idx" ON "export_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "export_requests_status_idx" ON "export_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "export_requests_requested_at_idx" ON "export_requests" USING btree ("requested_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habit_freezes_habit_id_idx" ON "habit_freezes" USING btree ("habit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habit_freezes_user_id_idx" ON "habit_freezes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habit_freezes_date_range_idx" ON "habit_freezes" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_items_user_id_idx" ON "knowledge_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_items_user_type_idx" ON "knowledge_items" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_items_user_area_idx" ON "knowledge_items" USING btree ("user_id","area");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_items_source_idx" ON "knowledge_items" USING btree ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_items_user_active_scope_idx" ON "knowledge_items" USING btree ("user_id","type","area");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memory_consolidations_user_id_idx" ON "memory_consolidations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memory_consolidations_created_at_idx" ON "memory_consolidations" USING btree ("created_at");--> statement-breakpoint

-- =============================================================================
-- TRIGGERS: updated_at (idempotent - DROP IF EXISTS + CREATE)
-- =============================================================================

DROP TRIGGER IF EXISTS set_updated_at_users ON users;
CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at_conversations ON conversations;
CREATE TRIGGER set_updated_at_conversations BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at_tracking_entries ON tracking_entries;
CREATE TRIGGER set_updated_at_tracking_entries BEFORE UPDATE ON tracking_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at_notes ON notes;
CREATE TRIGGER set_updated_at_notes BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at_people ON people;
CREATE TRIGGER set_updated_at_people BEFORE UPDATE ON people FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at_vault_items ON vault_items;
CREATE TRIGGER set_updated_at_vault_items BEFORE UPDATE ON vault_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at_goals ON goals;
CREATE TRIGGER set_updated_at_goals BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at_habits ON habits;
CREATE TRIGGER set_updated_at_habits BEFORE UPDATE ON habits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at_reminders ON reminders;
CREATE TRIGGER set_updated_at_reminders BEFORE UPDATE ON reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at_user_integrations ON user_integrations;
CREATE TRIGGER set_updated_at_user_integrations BEFORE UPDATE ON user_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at_calendar_events ON calendar_events;
CREATE TRIGGER set_updated_at_calendar_events BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at_budgets ON budgets;
CREATE TRIGGER set_updated_at_budgets BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at_subscriptions ON subscriptions;
CREATE TRIGGER set_updated_at_subscriptions BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at_incomes ON incomes;
CREATE TRIGGER set_updated_at_incomes BEFORE UPDATE ON incomes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at_bills ON bills;
CREATE TRIGGER set_updated_at_bills BEFORE UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at_variable_expenses ON variable_expenses;
CREATE TRIGGER set_updated_at_variable_expenses BEFORE UPDATE ON variable_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at_debts ON debts;
CREATE TRIGGER set_updated_at_debts BEFORE UPDATE ON debts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at_investments ON investments;
CREATE TRIGGER set_updated_at_investments BEFORE UPDATE ON investments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at_export_requests ON export_requests;
CREATE TRIGGER set_updated_at_export_requests BEFORE UPDATE ON export_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at_user_memories ON user_memories;
CREATE TRIGGER set_updated_at_user_memories BEFORE UPDATE ON user_memories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at_knowledge_items ON knowledge_items;
CREATE TRIGGER set_updated_at_knowledge_items BEFORE UPDATE ON knowledge_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

-- =============================================================================
-- AUTH TRIGGER: Sync auth.users to public.users (from Supabase auth)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';--> statement-breakpoint

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DO $$ BEGIN
    CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION WHEN undefined_table THEN
    -- auth.users doesn't exist in this context (e.g., pure Drizzle test)
    null;
END $$;
