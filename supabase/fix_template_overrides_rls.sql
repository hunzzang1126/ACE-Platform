-- ═══════════════════════════════════════════════════
-- FIX: template_overrides RLS policy
-- ═══════════════════════════════════════════════════
-- Old policy used direct subquery on user_roles which has its own
-- RLS, causing potential recursion or silent failures.
-- Fix: use public.is_admin() security definer function.
-- Also add explicit INSERT/UPDATE/DELETE policies for clarity.
-- ═══════════════════════════════════════════════════

-- Drop old broken policy
DROP POLICY IF EXISTS "template_overrides_admin_write" ON template_overrides;
DROP POLICY IF EXISTS "template_overrides_select" ON template_overrides;

-- Anyone can read (all users see admin-edited templates)
CREATE POLICY "template_overrides_select"
    ON template_overrides FOR SELECT
    USING (true);

-- Admins can insert (uses security definer function to avoid RLS recursion)
CREATE POLICY "template_overrides_admin_insert"
    ON template_overrides FOR INSERT
    WITH CHECK (public.is_admin(auth.uid()));

-- Admins can update
CREATE POLICY "template_overrides_admin_update"
    ON template_overrides FOR UPDATE
    USING (public.is_admin(auth.uid()));

-- Admins can delete
CREATE POLICY "template_overrides_admin_delete"
    ON template_overrides FOR DELETE
    USING (public.is_admin(auth.uid()));
