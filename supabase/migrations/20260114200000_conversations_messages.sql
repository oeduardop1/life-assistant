-- =============================================================================
-- Migration: Conversations and Messages
-- Description: Creates tables for chat functionality
-- =============================================================================

-- =============================================================================
-- Step 1: Create enums if they don't exist
-- =============================================================================
DO $$ BEGIN
    CREATE TYPE conversation_type AS ENUM ('general', 'counselor', 'quick_action', 'decision', 'report');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- Step 2: Create conversations table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    type conversation_type NOT NULL DEFAULT 'general',
    title VARCHAR(255),

    -- Metadata (ex: decision_id if type='decision')
    metadata JSONB,

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS conversations_user_id_idx ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS conversations_created_at_idx ON public.conversations(created_at);

-- =============================================================================
-- Step 3: Create messages table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,

    role message_role NOT NULL,
    content TEXT NOT NULL,

    -- Metadata (tokens, model, etc)
    metadata JSONB,

    -- Actions extracted from response
    actions JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at);

-- =============================================================================
-- Step 4: Create triggers for updated_at
-- =============================================================================
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- Step 5: Enable RLS
-- =============================================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Step 6: Create RLS policies for conversations
-- =============================================================================
DROP POLICY IF EXISTS "Users can read own conversations" ON public.conversations;
CREATE POLICY "Users can read own conversations" ON public.conversations
    FOR SELECT
    USING ((SELECT public.get_current_user_id()) = user_id);

DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversations;
CREATE POLICY "Users can insert own conversations" ON public.conversations
    FOR INSERT
    WITH CHECK ((SELECT public.get_current_user_id()) = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations" ON public.conversations
    FOR UPDATE
    USING ((SELECT public.get_current_user_id()) = user_id)
    WITH CHECK ((SELECT public.get_current_user_id()) = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
CREATE POLICY "Users can delete own conversations" ON public.conversations
    FOR DELETE
    USING ((SELECT public.get_current_user_id()) = user_id);

DROP POLICY IF EXISTS "Service role has full access to conversations" ON public.conversations;
CREATE POLICY "Service role has full access to conversations" ON public.conversations
    FOR ALL
    USING (auth.role() = 'service_role');

-- =============================================================================
-- Step 7: Create RLS policies for messages
-- Messages access is controlled through conversation ownership
-- =============================================================================
DROP POLICY IF EXISTS "Users can read messages from own conversations" ON public.messages;
CREATE POLICY "Users can read messages from own conversations" ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND c.user_id = (SELECT public.get_current_user_id())
        )
    );

DROP POLICY IF EXISTS "Users can insert messages to own conversations" ON public.messages;
CREATE POLICY "Users can insert messages to own conversations" ON public.messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND c.user_id = (SELECT public.get_current_user_id())
        )
    );

DROP POLICY IF EXISTS "Service role has full access to messages" ON public.messages;
CREATE POLICY "Service role has full access to messages" ON public.messages
    FOR ALL
    USING (auth.role() = 'service_role');
