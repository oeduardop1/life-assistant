-- RLS Policies for Life Assistant AI
-- As defined in docs/specs/data-model.md §6

-- ============================================================================
-- Helper function to get user_id from session context
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.user_id() RETURNS uuid AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.user_id', true), '')::uuid,
    NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid
  );
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Enable RLS on all user-scoped tables
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_balance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_freezes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Policies for tables with direct user_id
-- ============================================================================

-- Users
-- Note: Using (SELECT auth.user_id()) instead of auth.user_id() for performance
-- This ensures the function is called once per query, not once per row
-- See: https://supabase.com/docs/guides/database/database-advisors?lint=0003_auth_rls_initplan
CREATE POLICY "Users can only access own data" ON users
  FOR ALL USING (id = (SELECT auth.user_id()));

-- Conversations
CREATE POLICY "Users can only access own conversations" ON conversations
  FOR ALL USING (user_id = (SELECT auth.user_id()));

-- Tracking entries
CREATE POLICY "Users can only access own tracking" ON tracking_entries
  FOR ALL USING (user_id = (SELECT auth.user_id()));

-- Life balance history
CREATE POLICY "Users can only access own scores" ON life_balance_history
  FOR ALL USING (user_id = (SELECT auth.user_id()));

-- Notes
CREATE POLICY "Users can only access own notes" ON notes
  FOR ALL USING (user_id = (SELECT auth.user_id()));

-- People
CREATE POLICY "Users can only access own people" ON people
  FOR ALL USING (user_id = (SELECT auth.user_id()));

-- Person interactions
CREATE POLICY "Users can only access own person_interactions" ON person_interactions
  FOR ALL USING (user_id = (SELECT auth.user_id()));

-- Vault items
CREATE POLICY "Users can only access own vault" ON vault_items
  FOR ALL USING (user_id = (SELECT auth.user_id()));

-- Goals
CREATE POLICY "Users can only access own goals" ON goals
  FOR ALL USING (user_id = (SELECT auth.user_id()));

-- Habits
CREATE POLICY "Users can only access own habits" ON habits
  FOR ALL USING (user_id = (SELECT auth.user_id()));

-- Habit freezes
CREATE POLICY "Users can only access own habit_freezes" ON habit_freezes
  FOR ALL USING (user_id = (SELECT auth.user_id()));

-- Notifications
CREATE POLICY "Users can only access own notifications" ON notifications
  FOR ALL USING (user_id = (SELECT auth.user_id()));

-- Reminders
CREATE POLICY "Users can only access own reminders" ON reminders
  FOR ALL USING (user_id = (SELECT auth.user_id()));

-- User integrations
CREATE POLICY "Users can only access own integrations" ON user_integrations
  FOR ALL USING (user_id = (SELECT auth.user_id()));

-- Calendar events
CREATE POLICY "Users can only access own calendar_events" ON calendar_events
  FOR ALL USING (user_id = (SELECT auth.user_id()));

-- Budgets
CREATE POLICY "Users can only access own budgets" ON budgets
  FOR ALL USING (user_id = (SELECT auth.user_id()));

-- Subscriptions
CREATE POLICY "Users can only access own subscriptions" ON subscriptions
  FOR ALL USING (user_id = (SELECT auth.user_id()));

-- Export requests
CREATE POLICY "Users can only access own export_requests" ON export_requests
  FOR ALL USING (user_id = (SELECT auth.user_id()));

-- Audit logs
CREATE POLICY "Users can only access own audit_logs" ON audit_logs
  FOR ALL USING (user_id = (SELECT auth.user_id()));

-- ============================================================================
-- Policies for child tables (access through parent)
-- ============================================================================

-- Messages (access through conversation)
CREATE POLICY "Users can only access own messages" ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = (SELECT auth.user_id())
    )
  );

-- Note links (access through source note)
CREATE POLICY "Users can only access own note_links" ON note_links
  FOR ALL USING (
    source_note_id IN (
      SELECT id FROM notes WHERE user_id = (SELECT auth.user_id())
    )
  );

-- Person notes (access through person)
CREATE POLICY "Users can only access own person_notes" ON person_notes
  FOR ALL USING (
    person_id IN (
      SELECT id FROM people WHERE user_id = (SELECT auth.user_id())
    )
  );

-- Goal milestones (access through goal)
CREATE POLICY "Users can only access own goal_milestones" ON goal_milestones
  FOR ALL USING (
    goal_id IN (
      SELECT id FROM goals WHERE user_id = (SELECT auth.user_id())
    )
  );

-- Habit completions (access through habit)
CREATE POLICY "Users can only access own habit_completions" ON habit_completions
  FOR ALL USING (
    habit_id IN (
      SELECT id FROM habits WHERE user_id = (SELECT auth.user_id())
    )
  );
