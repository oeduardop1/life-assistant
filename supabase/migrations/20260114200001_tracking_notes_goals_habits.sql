-- =============================================================================
-- Migration: Tracking, Notes, Goals, Habits
-- Description: Creates core app tables for tracking, notes, goals and habits
-- =============================================================================

-- =============================================================================
-- Step 1: Create enums if they don't exist
-- =============================================================================
DO $$ BEGIN
    CREATE TYPE tracking_type AS ENUM ('weight', 'water', 'sleep', 'exercise', 'meal', 'medication', 'expense', 'income', 'investment', 'habit', 'mood', 'energy', 'custom');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE goal_status AS ENUM ('not_started', 'in_progress', 'completed', 'failed', 'canceled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE habit_frequency AS ENUM ('daily', 'weekly', 'custom');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- Step 2: Create tracking_entries table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tracking_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    type tracking_type NOT NULL,
    area life_area NOT NULL,

    value DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20),

    metadata JSONB NOT NULL DEFAULT '{}',

    entry_date DATE NOT NULL,
    entry_time TIMESTAMPTZ,

    source VARCHAR(50) NOT NULL DEFAULT 'form',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tracking_entries_user_id_idx ON public.tracking_entries(user_id);
CREATE INDEX IF NOT EXISTS tracking_entries_user_id_type_idx ON public.tracking_entries(user_id, type);
CREATE INDEX IF NOT EXISTS tracking_entries_user_id_date_idx ON public.tracking_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS tracking_entries_entry_date_idx ON public.tracking_entries(entry_date);

-- =============================================================================
-- Step 3: Create notes table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    excerpt VARCHAR(500),

    folder VARCHAR(255),
    tags JSONB NOT NULL DEFAULT '[]',

    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,

    deleted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS notes_user_id_folder_idx ON public.notes(user_id, folder);
CREATE INDEX IF NOT EXISTS notes_title_idx ON public.notes(title);

-- =============================================================================
-- Step 4: Create note_links table (wikilinks)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.note_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    target_note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,

    link_text VARCHAR(255),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS note_links_source_idx ON public.note_links(source_note_id);
CREATE INDEX IF NOT EXISTS note_links_target_idx ON public.note_links(target_note_id);

-- =============================================================================
-- Step 5: Create goals table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    description TEXT,
    area life_area NOT NULL,

    target_value DECIMAL(10, 2) NOT NULL,
    current_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    status goal_status NOT NULL DEFAULT 'not_started',

    deleted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS goals_user_id_idx ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS goals_status_idx ON public.goals(status);

-- =============================================================================
-- Step 6: Create goal_milestones table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.goal_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    target_value DECIMAL(10, 2) NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,

    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS goal_milestones_goal_id_idx ON public.goal_milestones(goal_id);

-- =============================================================================
-- Step 7: Create habits table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    description TEXT,
    area life_area NOT NULL,

    frequency habit_frequency NOT NULL,
    days_of_week JSONB DEFAULT '[]',
    times_per_period INTEGER,

    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    total_completions INTEGER NOT NULL DEFAULT 0,

    reminder_time TIME,
    reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    deleted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS habits_user_id_idx ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS habits_is_active_idx ON public.habits(is_active);

-- =============================================================================
-- Step 8: Create habit_completions table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.habit_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,

    date DATE NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS habit_completions_habit_id_idx ON public.habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS habit_completions_date_idx ON public.habit_completions(date);

-- =============================================================================
-- Step 9: Create triggers for updated_at
-- =============================================================================
DROP TRIGGER IF EXISTS update_tracking_entries_updated_at ON public.tracking_entries;
CREATE TRIGGER update_tracking_entries_updated_at
    BEFORE UPDATE ON public.tracking_entries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_notes_updated_at ON public.notes;
CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_goals_updated_at ON public.goals;
CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_habits_updated_at ON public.habits;
CREATE TRIGGER update_habits_updated_at
    BEFORE UPDATE ON public.habits
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- Step 10: Enable RLS
-- =============================================================================
ALTER TABLE public.tracking_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Step 11: Create RLS policies for tracking_entries
-- =============================================================================
CREATE POLICY "Users can manage own tracking entries" ON public.tracking_entries
    FOR ALL
    USING ((SELECT public.get_current_user_id()) = user_id)
    WITH CHECK ((SELECT public.get_current_user_id()) = user_id);

CREATE POLICY "Service role has full access to tracking_entries" ON public.tracking_entries
    FOR ALL
    USING (auth.role() = 'service_role');

-- =============================================================================
-- Step 12: Create RLS policies for notes
-- =============================================================================
CREATE POLICY "Users can manage own notes" ON public.notes
    FOR ALL
    USING ((SELECT public.get_current_user_id()) = user_id)
    WITH CHECK ((SELECT public.get_current_user_id()) = user_id);

CREATE POLICY "Service role has full access to notes" ON public.notes
    FOR ALL
    USING (auth.role() = 'service_role');

-- RLS for note_links (through note ownership)
CREATE POLICY "Users can manage links in own notes" ON public.note_links
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id = source_note_id
            AND n.user_id = (SELECT public.get_current_user_id())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id = source_note_id
            AND n.user_id = (SELECT public.get_current_user_id())
        )
    );

CREATE POLICY "Service role has full access to note_links" ON public.note_links
    FOR ALL
    USING (auth.role() = 'service_role');

-- =============================================================================
-- Step 13: Create RLS policies for goals
-- =============================================================================
CREATE POLICY "Users can manage own goals" ON public.goals
    FOR ALL
    USING ((SELECT public.get_current_user_id()) = user_id)
    WITH CHECK ((SELECT public.get_current_user_id()) = user_id);

CREATE POLICY "Service role has full access to goals" ON public.goals
    FOR ALL
    USING (auth.role() = 'service_role');

-- RLS for goal_milestones (through goal ownership)
CREATE POLICY "Users can manage milestones in own goals" ON public.goal_milestones
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.goals g
            WHERE g.id = goal_id
            AND g.user_id = (SELECT public.get_current_user_id())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.goals g
            WHERE g.id = goal_id
            AND g.user_id = (SELECT public.get_current_user_id())
        )
    );

CREATE POLICY "Service role has full access to goal_milestones" ON public.goal_milestones
    FOR ALL
    USING (auth.role() = 'service_role');

-- =============================================================================
-- Step 14: Create RLS policies for habits
-- =============================================================================
CREATE POLICY "Users can manage own habits" ON public.habits
    FOR ALL
    USING ((SELECT public.get_current_user_id()) = user_id)
    WITH CHECK ((SELECT public.get_current_user_id()) = user_id);

CREATE POLICY "Service role has full access to habits" ON public.habits
    FOR ALL
    USING (auth.role() = 'service_role');

-- RLS for habit_completions (through habit ownership)
CREATE POLICY "Users can manage completions for own habits" ON public.habit_completions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.habits h
            WHERE h.id = habit_id
            AND h.user_id = (SELECT public.get_current_user_id())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.habits h
            WHERE h.id = habit_id
            AND h.user_id = (SELECT public.get_current_user_id())
        )
    );

CREATE POLICY "Service role has full access to habit_completions" ON public.habit_completions
    FOR ALL
    USING (auth.role() = 'service_role');
