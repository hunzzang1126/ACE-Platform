-- ─────────────────────────────────────────────────
-- Add learned_skills column to ai_memory
-- ─────────────────────────────────────────────────
-- Enables cross-device sync for user-promoted
-- dynamic actions (learned skills).
-- Without this column, skillRegistry cloud sync
-- silently fails and skills only persist in localStorage.
-- ─────────────────────────────────────────────────

ALTER TABLE public.ai_memory 
ADD COLUMN IF NOT EXISTS learned_skills JSONB DEFAULT '[]'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN public.ai_memory.learned_skills IS 'User-promoted dynamic actions stored as AiSkill[] JSON. Max 20 items.';
