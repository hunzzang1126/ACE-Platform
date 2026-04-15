-- ─────────────────────────────────────────────────
-- Clean up orphaned projects from Supabase
-- ─────────────────────────────────────────────────
-- Run this in Supabase SQL Editor (Dashboard → SQL)
-- This deletes projects that exist in the cloud but
-- are no longer referenced by any local creative set.
--
-- WARNING: This deletes PERMANENTLY. Review before running.
-- ─────────────────────────────────────────────────

-- 1. See what will be deleted (DRY RUN — safe)
SELECT p.id, p.name, p.created_at, p.deleted_at,
       CASE WHEN cs.id IS NOT NULL THEN 'HAS DATA' ELSE 'ORPHAN' END AS status
FROM projects p
LEFT JOIN creative_sets cs ON cs.id = p.id
ORDER BY p.created_at DESC;

-- 2. Delete orphan projects (no matching creative_set data)
-- DELETE FROM projects
-- WHERE id NOT IN (SELECT id FROM creative_sets);

-- 3. Delete soft-deleted projects (deleted_at IS NOT NULL)
-- DELETE FROM projects WHERE deleted_at IS NOT NULL;

-- 4. Nuclear option: delete ALL projects for a specific user
-- DELETE FROM projects WHERE user_id = 'YOUR_USER_ID_HERE';
-- DELETE FROM creative_sets WHERE user_id = 'YOUR_USER_ID_HERE';
