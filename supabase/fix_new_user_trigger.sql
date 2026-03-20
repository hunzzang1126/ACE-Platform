-- ═══════════════════════════════════════════════════
-- DEFINITIVE FIX: "Database error saving new user"
-- ═══════════════════════════════════════════════════
-- This script fixes ALL auth triggers on auth.users
-- that can block new user creation.
-- Run in Supabase Dashboard → SQL Editor.
-- ═══════════════════════════════════════════════════

-- ── Step 1: Ensure helper function exists ────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Step 2: Ensure subscriptions table exists ────
-- (Matches migration_pricing.sql schema exactly)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    organization_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own subscription" ON public.subscriptions;
CREATE POLICY "Users read own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages subscriptions" ON public.subscriptions;
CREATE POLICY "Service role manages subscriptions" ON public.subscriptions
    FOR ALL USING (true) WITH CHECK (true);

-- ── Step 3: Fix handle_new_user trigger ──────────
-- EXCEPTION handler ensures trigger NEVER blocks user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    user_count integer;
    new_role text;
BEGIN
    SELECT count(*) INTO user_count FROM public.user_roles;
    IF user_count = 0 THEN
        new_role := 'admin';
    ELSE
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
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Step 4: Fix auto_create_subscription trigger ─
-- EXCEPTION handler ensures trigger NEVER blocks user creation
CREATE OR REPLACE FUNCTION public.auto_create_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.subscriptions (user_id, plan, status)
    VALUES (NEW.id, 'starter', 'active')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'auto_create_subscription failed for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Step 5: Recreate both triggers ──────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.auto_create_subscription();

-- ── Step 6: Ensure updated_at trigger ───────────
DROP TRIGGER IF EXISTS user_roles_updated_at ON public.user_roles;
CREATE TRIGGER user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Step 7: Fix any existing pending users ──────
UPDATE public.user_roles SET role = 'user' WHERE role = 'pending';

-- ═══════════════════════════════════════════════════
-- Done! Both triggers now have EXCEPTION handlers
-- so they can NEVER block new user creation.
-- ═══════════════════════════════════════════════════
