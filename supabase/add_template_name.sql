-- ─────────────────────────────────────────────────
-- Add 'name' column to template_overrides
-- ─────────────────────────────────────────────────
-- Stores the user-facing template name (e.g. "Design trends in 2026")
-- instead of relying on the auto-generated template_id.

ALTER TABLE template_overrides
ADD COLUMN IF NOT EXISTS name TEXT;

-- Populate existing rows from variant_snapshot.__customMeta.name if available
UPDATE template_overrides
SET name = variant_snapshot->'__customMeta'->>'name'
WHERE name IS NULL
AND variant_snapshot->'__customMeta'->>'name' IS NOT NULL;

-- Verify
SELECT template_id, name, width, height FROM template_overrides ORDER BY template_id;
