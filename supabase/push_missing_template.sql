-- ─────────────────────────────────────────────────
-- One-time: Push ai-right-aligned template to Supabase
-- ─────────────────────────────────────────────────
-- This template was the only one missing from template_overrides.
-- Run via Dashboard → SQL Editor, or use the app's admin template editor.
-- 
-- NOTE: If you prefer, just open the admin template editor,
-- find "Right-Aligned", make any tiny edit (even undo it),
-- and hit Save. That will auto-push it to Supabase.
-- ─────────────────────────────────────────────────

-- Verify current state
SELECT template_id FROM template_overrides 
WHERE template_id = 'ai-right-aligned';
-- Expected: 0 rows (not yet pushed)

-- After admin pushes it, verify:
-- SELECT template_id FROM template_overrides ORDER BY template_id;
-- Expected: 17 rows (all templates)
