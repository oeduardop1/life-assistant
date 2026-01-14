-- =============================================================================
-- Migration: Memory System (ADR-012)
-- Description: Creates tables for Tool Use + Memory Consolidation architecture
-- =============================================================================

-- =============================================================================
-- Step 1: Create enums if they don't exist
-- =============================================================================
DO $$ BEGIN
    CREATE TYPE knowledge_item_type AS ENUM ('fact', 'preference', 'memory', 'insight', 'person');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE knowledge_item_source AS ENUM ('conversation', 'user_input', 'ai_inference', 'onboarding');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE consolidation_status AS ENUM ('completed', 'failed', 'partial');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- Step 2: Create user_memories table
-- Compact context (~500-800 tokens) always injected in system prompt
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Profile summary
    bio TEXT,
    occupation VARCHAR(255),
    family_context TEXT,

    -- Current state (JSONB arrays)
    current_goals JSONB NOT NULL DEFAULT '[]'::JSONB,
    current_challenges JSONB NOT NULL DEFAULT '[]'::JSONB,
    top_of_mind JSONB NOT NULL DEFAULT '[]'::JSONB,
    "values" JSONB NOT NULL DEFAULT '[]'::JSONB,

    -- Communication preferences
    communication_style VARCHAR(50),
    feedback_preferences TEXT,

    -- Learned patterns with confidence tracking
    learned_patterns JSONB NOT NULL DEFAULT '[]'::JSONB,

    -- Settings
    christian_perspective BOOLEAN DEFAULT FALSE,

    -- Versioning for optimistic locking
    version INTEGER NOT NULL DEFAULT 1,
    last_consolidated_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT user_memories_user_id_unique UNIQUE (user_id)
);

-- =============================================================================
-- Step 3: Create knowledge_items table
-- Granular, searchable facts/preferences/insights
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.knowledge_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Classification
    type knowledge_item_type NOT NULL,
    area life_area,

    -- Content
    title VARCHAR(255),
    content TEXT NOT NULL,

    -- Source tracking
    source knowledge_item_source NOT NULL,
    source_ref UUID, -- Reference to conversation/message that generated this
    inference_evidence TEXT, -- Evidence for AI inferences

    -- Confidence and validation
    confidence REAL NOT NULL DEFAULT 0.9, -- 0.0 - 1.0
    validated_by_user BOOLEAN DEFAULT FALSE,

    -- Relationships
    related_items JSONB NOT NULL DEFAULT '[]'::JSONB,
    tags JSONB NOT NULL DEFAULT '[]'::JSONB,

    -- Person-specific metadata (when type = 'person')
    person_metadata JSONB,

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for knowledge_items
CREATE INDEX IF NOT EXISTS knowledge_items_user_id_idx ON public.knowledge_items(user_id);
CREATE INDEX IF NOT EXISTS knowledge_items_user_type_idx ON public.knowledge_items(user_id, type);
CREATE INDEX IF NOT EXISTS knowledge_items_user_area_idx ON public.knowledge_items(user_id, area);
CREATE INDEX IF NOT EXISTS knowledge_items_source_idx ON public.knowledge_items(source);

-- =============================================================================
-- Step 4: Create memory_consolidations table
-- Audit log of consolidation runs
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.memory_consolidations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Time range processed
    consolidated_from TIMESTAMPTZ NOT NULL,
    consolidated_to TIMESTAMPTZ NOT NULL,

    -- Statistics
    messages_processed INTEGER NOT NULL DEFAULT 0,
    facts_created INTEGER NOT NULL DEFAULT 0,
    facts_updated INTEGER NOT NULL DEFAULT 0,
    inferences_created INTEGER NOT NULL DEFAULT 0,

    -- Results
    memory_updates JSONB, -- What was changed in user_memories
    raw_output JSONB, -- Raw LLM response for debugging

    -- Status
    status consolidation_status NOT NULL,
    error_message TEXT,

    -- Timestamps (no updated_at - this is an append-only audit log)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for memory_consolidations
CREATE INDEX IF NOT EXISTS memory_consolidations_user_id_idx ON public.memory_consolidations(user_id);
CREATE INDEX IF NOT EXISTS memory_consolidations_created_at_idx ON public.memory_consolidations(created_at);

-- =============================================================================
-- Step 5: Create update_updated_at trigger function (if not exists)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Step 6: Create triggers for updated_at
-- =============================================================================
DROP TRIGGER IF EXISTS update_user_memories_updated_at ON public.user_memories;
CREATE TRIGGER update_user_memories_updated_at
    BEFORE UPDATE ON public.user_memories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_knowledge_items_updated_at ON public.knowledge_items;
CREATE TRIGGER update_knowledge_items_updated_at
    BEFORE UPDATE ON public.knowledge_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- Step 7: Enable RLS on new tables
-- =============================================================================
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_consolidations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Step 8: Create RLS policies for user_memories
-- =============================================================================
DROP POLICY IF EXISTS "Users can read own memory" ON public.user_memories;
CREATE POLICY "Users can read own memory" ON public.user_memories
    FOR SELECT
    USING ((SELECT auth.user_id()) = user_id);

DROP POLICY IF EXISTS "Users can insert own memory" ON public.user_memories;
CREATE POLICY "Users can insert own memory" ON public.user_memories
    FOR INSERT
    WITH CHECK ((SELECT auth.user_id()) = user_id);

DROP POLICY IF EXISTS "Users can update own memory" ON public.user_memories;
CREATE POLICY "Users can update own memory" ON public.user_memories
    FOR UPDATE
    USING ((SELECT auth.user_id()) = user_id)
    WITH CHECK ((SELECT auth.user_id()) = user_id);

DROP POLICY IF EXISTS "Service role has full access to user_memories" ON public.user_memories;
CREATE POLICY "Service role has full access to user_memories" ON public.user_memories
    FOR ALL
    USING (auth.role() = 'service_role');

-- =============================================================================
-- Step 9: Create RLS policies for knowledge_items
-- =============================================================================
DROP POLICY IF EXISTS "Users can read own knowledge items" ON public.knowledge_items;
CREATE POLICY "Users can read own knowledge items" ON public.knowledge_items
    FOR SELECT
    USING ((SELECT auth.user_id()) = user_id);

DROP POLICY IF EXISTS "Users can insert own knowledge items" ON public.knowledge_items;
CREATE POLICY "Users can insert own knowledge items" ON public.knowledge_items
    FOR INSERT
    WITH CHECK ((SELECT auth.user_id()) = user_id);

DROP POLICY IF EXISTS "Users can update own knowledge items" ON public.knowledge_items;
CREATE POLICY "Users can update own knowledge items" ON public.knowledge_items
    FOR UPDATE
    USING ((SELECT auth.user_id()) = user_id)
    WITH CHECK ((SELECT auth.user_id()) = user_id);

DROP POLICY IF EXISTS "Users can delete own knowledge items" ON public.knowledge_items;
CREATE POLICY "Users can delete own knowledge items" ON public.knowledge_items
    FOR DELETE
    USING ((SELECT auth.user_id()) = user_id);

DROP POLICY IF EXISTS "Service role has full access to knowledge_items" ON public.knowledge_items;
CREATE POLICY "Service role has full access to knowledge_items" ON public.knowledge_items
    FOR ALL
    USING (auth.role() = 'service_role');

-- =============================================================================
-- Step 10: Create RLS policies for memory_consolidations (read-only for users)
-- =============================================================================
DROP POLICY IF EXISTS "Users can read own consolidations" ON public.memory_consolidations;
CREATE POLICY "Users can read own consolidations" ON public.memory_consolidations
    FOR SELECT
    USING ((SELECT auth.user_id()) = user_id);

DROP POLICY IF EXISTS "Service role has full access to memory_consolidations" ON public.memory_consolidations;
CREATE POLICY "Service role has full access to memory_consolidations" ON public.memory_consolidations
    FOR ALL
    USING (auth.role() = 'service_role');

-- =============================================================================
-- Step 11: Create auth.user_id function if it doesn't exist
-- This function reads the user_id from the session context set by the API
-- =============================================================================
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.user_id', TRUE)::UUID,
        auth.uid()
    );
EXCEPTION
    WHEN invalid_text_representation THEN
        RETURN auth.uid();
END;
$$ LANGUAGE plpgsql STABLE;
