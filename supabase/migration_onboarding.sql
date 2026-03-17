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
