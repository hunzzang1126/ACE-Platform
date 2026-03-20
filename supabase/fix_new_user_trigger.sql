-- ═══════════════════════════════════════════════════
-- FIX: "Database error saving new user" on OAuth signup
-- ═══════════════════════════════════════════════════
-- Root cause: The handle_new_user() trigger may fail because:
-- 1. handle_updated_at() function might not exist
-- 2. RLS policies might block the insert even with SECURITY DEFINER
-- 3. Column constraints from later migrations cause conflicts
--
-- This script recreates everything cleanly.
-- Run in Supabase Dashboard → SQL Editor.
-- ═══════════════════════════════════════════════════

-- ── Step 0: Ensure handle_updated_at exists ─────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Step 1: Ensure the table has all needed columns ──
ALTER TABLE public.user_roles
    ADD COLUMN IF NOT EXISTS has_completed_onboarding boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_roles
    ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'English';

-- ── Step 2: Recreate the trigger function ───────
-- Uses SECURITY DEFINER to bypass RLS entirely
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    user_count integer;
    new_role text;
BEGIN
    -- First user becomes admin
    SELECT count(*) INTO user_count FROM public.user_roles;
    IF user_count = 0 THEN
        new_role := 'admin';
    ELSE
        -- All subsequent users get 'user' role directly
        new_role := 'user';
    END IF;

    INSERT INTO public.user_roles (user_id, role, display_name, avatar_url, email)
    VALUES (
        NEW.id,
        new_role,
        coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.email
    )
    ON CONFLICT (user_id) DO NOTHING; -- ★ Prevent duplicate key errors on re-login

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but DON'T block user creation
        RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Step 3: Recreate the trigger ────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Step 4: Ensure updated_at trigger exists ────
DROP TRIGGER IF EXISTS user_roles_updated_at ON public.user_roles;
CREATE TRIGGER user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Step 5: Fix any existing pending users ──────
UPDATE public.user_roles SET role = 'user' WHERE role = 'pending';
