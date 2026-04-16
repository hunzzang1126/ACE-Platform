-- ─────────────────────────────────────────────────
-- brand_kits table — Cloud sync for Brand Kit data
-- ─────────────────────────────────────────────────
-- Run this in Supabase SQL Editor to create the table.

CREATE TABLE IF NOT EXISTS brand_kits (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_brand_kits_user_id ON brand_kits(user_id);

-- RLS: users can only access their own brand kits
ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own brand kits"
    ON brand_kits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brand kits"
    ON brand_kits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brand kits"
    ON brand_kits FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own brand kits"
    ON brand_kits FOR DELETE
    USING (auth.uid() = user_id);
