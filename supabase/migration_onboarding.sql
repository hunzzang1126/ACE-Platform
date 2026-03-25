-- ═══════════════════════════════════════════════════
-- Glid Platform — Onboarding Column Migration
-- ═══════════════════════════════════════════════════
-- Adds has_completed_onboarding + preferred_language
-- to existing user_roles table.
-- Run in Supabase Dashboard → SQL Editor.
-- ═══════════════════════════════════════════════════

-- Add onboarding flag (defaults to false for existing users)
ALTER TABLE public.user_roles
    ADD COLUMN IF NOT EXISTS has_completed_onboarding boolean NOT NULL DEFAULT false;

-- Add preferred language (defaults to 'English')
ALTER TABLE public.user_roles
    ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'English';

-- ═══════════════════════════════════════════════════
-- RPC: complete_onboarding
-- ═══════════════════════════════════════════════════
-- Security Definer function that bypasses RLS so that
-- authenticated users can update ONLY their own 
-- onboarding status. The admin-only UPDATE policy on
-- user_roles stays intact — this is the safe path.
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.complete_onboarding(
    p_language text DEFAULT 'English'
)
RETURNS void AS $$
BEGIN
    UPDATE public.user_roles
    SET has_completed_onboarding = true,
        preferred_language = p_language,
        updated_at = now()
    WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
