-- RLS Policies for Life Assistant AI
-- As defined in docs/specs/data-model.md §6
--
-- Uses Supabase's built-in auth.uid() function which reads from request.jwt.claim.sub
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security

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
-- Note: Using (SELECT auth.uid()) instead of auth.uid() for performance
-- This ensures the function is called once per query, not once per row
-- See: https://supabase.com/docs/guides/database/database-advisors?lint=0003_auth_rls_initplan
CREATE POLICY "Users can only access own data" ON users
  FOR ALL USING (id = (SELECT auth.uid()));

-- Conversations
CREATE POLICY "Users can only access own conversations" ON conversations
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- Tracking entries
CREATE POLICY "Users can only access own tracking" ON tracking_entries
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- Life balance history
CREATE POLICY "Users can only access own scores" ON life_balance_history
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- Notes
CREATE POLICY "Users can only access own notes" ON notes
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- People
CREATE POLICY "Users can only access own people" ON people
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- Person interactions
CREATE POLICY "Users can only access own person_interactions" ON person_interactions
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- Vault items
CREATE POLICY "Users can only access own vault" ON vault_items
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- Goals
CREATE POLICY "Users can only access own goals" ON goals
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- Habits
CREATE POLICY "Users can only access own habits" ON habits
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- Habit freezes
CREATE POLICY "Users can only access own habit_freezes" ON habit_freezes
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- Notifications
CREATE POLICY "Users can only access own notifications" ON notifications
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- Reminders
CREATE POLICY "Users can only access own reminders" ON reminders
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- User integrations
CREATE POLICY "Users can only access own integrations" ON user_integrations
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- Calendar events
CREATE POLICY "Users can only access own calendar_events" ON calendar_events
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- Budgets
CREATE POLICY "Users can only access own budgets" ON budgets
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- Subscriptions
CREATE POLICY "Users can only access own subscriptions" ON subscriptions
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- Export requests
CREATE POLICY "Users can only access own export_requests" ON export_requests
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- Audit logs
CREATE POLICY "Users can only access own audit_logs" ON audit_logs
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- Policies for child tables (access through parent)
-- ============================================================================

-- Messages (access through conversation)
CREATE POLICY "Users can only access own messages" ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = (SELECT auth.uid())
    )
  );

-- Note links (access through source note)
CREATE POLICY "Users can only access own note_links" ON note_links
  FOR ALL USING (
    source_note_id IN (
      SELECT id FROM notes WHERE user_id = (SELECT auth.uid())
    )
  );

-- Person notes (access through person)
CREATE POLICY "Users can only access own person_notes" ON person_notes
  FOR ALL USING (
    person_id IN (
      SELECT id FROM people WHERE user_id = (SELECT auth.uid())
    )
  );

-- Goal milestones (access through goal)
CREATE POLICY "Users can only access own goal_milestones" ON goal_milestones
  FOR ALL USING (
    goal_id IN (
      SELECT id FROM goals WHERE user_id = (SELECT auth.uid())
    )
  );

-- Habit completions (access through habit)
CREATE POLICY "Users can only access own habit_completions" ON habit_completions
  FOR ALL USING (
    habit_id IN (
      SELECT id FROM habits WHERE user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- Memory System Tables (ADR-012)
-- ============================================================================

ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_consolidations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own user_memories" ON user_memories
  FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can only access own knowledge_items" ON knowledge_items
  FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can only access own memory_consolidations" ON memory_consolidations
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- Finance Tables (M2.2)
-- ============================================================================

ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE variable_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own incomes" ON incomes
  FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can only access own bills" ON bills
  FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can only access own variable_expenses" ON variable_expenses
  FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can only access own debts" ON debts
  FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can only access own debt_payments" ON debt_payments
  FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can only access own investments" ON investments
  FOR ALL USING (user_id = (SELECT auth.uid()));