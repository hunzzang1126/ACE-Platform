-- ─────────────────────────────────────────────────
-- AI Memory — Persistent per-user AI context
-- ─────────────────────────────────────────────────
-- Stores user preferences, design history, and
-- conversation summaries to make the AI smarter
-- across sessions. ~5KB per user.
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_memory (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- User preferences (style, color, font preferences)
    preferences JSONB DEFAULT '{}'::jsonb,
    
    -- Recent design history (prompts, feedback, styles used)
    design_history JSONB DEFAULT '[]'::jsonb,
    
    -- Conversation summary for context continuity
    conversation_summary TEXT DEFAULT '',
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Users can only read/write their own memory
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own AI memory"
    ON public.ai_memory FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI memory"
    ON public.ai_memory FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI memory"
    ON public.ai_memory FOR UPDATE
    USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_ai_memory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_memory_updated_at
    BEFORE UPDATE ON public.ai_memory
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_memory_timestamp();
