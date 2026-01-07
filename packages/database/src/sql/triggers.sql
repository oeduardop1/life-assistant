-- Triggers for Life Assistant AI
-- As defined in DATA_MODEL.md §7

-- ============================================================================
-- 7.1 Updated At Trigger
-- ============================================================================

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tracking_entries_updated_at
  BEFORE UPDATE ON tracking_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_decisions_updated_at
  BEFORE UPDATE ON decisions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_decision_options_updated_at
  BEFORE UPDATE ON decision_options
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_people_updated_at
  BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vault_items_updated_at
  BEFORE UPDATE ON vault_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_export_requests_updated_at
  BEFORE UPDATE ON export_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 7.2 Note Excerpt Trigger
-- ============================================================================

-- Generate excerpt automatically
CREATE OR REPLACE FUNCTION generate_note_excerpt()
RETURNS TRIGGER AS $$
BEGIN
  NEW.excerpt = LEFT(
    regexp_replace(NEW.content, E'[\\n\\r]+', ' ', 'g'),
    200
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_notes_excerpt
  BEFORE INSERT OR UPDATE OF content ON notes
  FOR EACH ROW EXECUTE FUNCTION generate_note_excerpt();

-- ============================================================================
-- 7.3 Habit Streak Update Trigger
-- ============================================================================

-- Update streak when completing habit
CREATE OR REPLACE FUNCTION update_habit_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_habit habits%ROWTYPE;
  v_last_completion date;
  v_expected_date date;
BEGIN
  SELECT * INTO v_habit FROM habits WHERE id = NEW.habit_id;

  -- Find last completion before this one
  SELECT MAX(date) INTO v_last_completion
  FROM habit_completions
  WHERE habit_id = NEW.habit_id
    AND date < NEW.date
    AND completed = true;

  -- Calculate expected date based on frequency
  IF v_habit.frequency = 'daily' THEN
    v_expected_date := NEW.date - INTERVAL '1 day';
  ELSIF v_habit.frequency = 'weekly' THEN
    v_expected_date := NEW.date - INTERVAL '7 days';
  ELSE
    v_expected_date := NEW.date - INTERVAL '1 day';
  END IF;

  -- If completed and is sequence
  IF NEW.completed THEN
    IF v_last_completion IS NULL OR v_last_completion >= v_expected_date THEN
      -- Increment streak
      UPDATE habits
      SET
        current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        total_completions = total_completions + 1
      WHERE id = NEW.habit_id;
    ELSE
      -- Reset streak
      UPDATE habits
      SET
        current_streak = 1,
        total_completions = total_completions + 1
      WHERE id = NEW.habit_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_habit_streak_trigger
  AFTER INSERT ON habit_completions
  FOR EACH ROW EXECUTE FUNCTION update_habit_streak();

-- ============================================================================
-- Special Indexes
-- ============================================================================

-- Full-text search index for notes (Portuguese)
CREATE INDEX notes_content_search_idx ON notes
USING gin(to_tsvector('portuguese', title || ' ' || content));

-- Vector index for embeddings (HNSW for cosine similarity)
-- Requires pgvector extension
CREATE INDEX embeddings_vector_idx ON embeddings
USING hnsw (embedding vector_cosine_ops);

-- GIN indexes for JSONB fields
CREATE INDEX idx_user_preferences_gin ON users USING GIN (preferences);
CREATE INDEX idx_people_preferences_gin ON people USING GIN (preferences);
CREATE INDEX idx_vault_metadata_gin ON vault_items USING GIN (metadata);
CREATE INDEX idx_tracking_metadata_gin ON tracking_entries USING GIN (metadata);

-- GIN indexes for arrays (tags)
CREATE INDEX idx_notes_tags_gin ON notes USING GIN (tags);
CREATE INDEX idx_people_tags_gin ON people USING GIN (tags);
