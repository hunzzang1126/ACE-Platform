-- ─────────────────────────────────────────────────
-- Migration: template_overrides
-- ─────────────────────────────────────────────────
-- Stores admin-edited template snapshots globally.
-- All authenticated users can read; only admins can write.
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS template_overrides (
    template_id TEXT PRIMARY KEY,
    variant_snapshot JSONB NOT NULL,
    width INTEGER,
    height INTEGER,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE template_overrides ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon for public templates) can read
CREATE POLICY "template_overrides_select"
    ON template_overrides FOR SELECT
    USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "template_overrides_admin_write"
    ON template_overrides FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );
