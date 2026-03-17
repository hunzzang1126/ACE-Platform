-- ─────────────────────────────────────────────────
-- Glid Pricing System — Supabase Migration
-- ─────────────────────────────────────────────────
-- Run this in Supabase SQL Editor.
-- Creates: subscriptions, usage_tracking, organizations, organization_members
-- ─────────────────────────────────────────────────

-- 1. Subscriptions — User plan + Stripe billing
CREATE TABLE IF NOT EXISTS subscriptions (
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

-- 2. Usage Tracking — Monthly AI consumption
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- format: YYYY-MM
    ai_generations_used INT DEFAULT 0,
    exports_used INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month)
);

-- 3. Organizations — Enterprise team management
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    plan TEXT NOT NULL DEFAULT 'enterprise' CHECK (plan IN ('starter', 'pro', 'enterprise')),
    stripe_customer_id TEXT,
    brand_cloud JSONB DEFAULT '{}',
    max_seats INT DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Organization Members — Team roster
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    UNIQUE(org_id, user_id)
);

-- ── Indexes ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_month ON usage_tracking(user_id, month);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

-- ── RLS Policies ─────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users read own subscription" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can read their own usage
CREATE POLICY "Users read own usage" ON usage_tracking
    FOR SELECT USING (auth.uid() = user_id);

-- Users can increment their own usage
CREATE POLICY "Users update own usage" ON usage_tracking
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own usage row
CREATE POLICY "Users insert own usage" ON usage_tracking
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Org members can read their org
CREATE POLICY "Org members read org" ON organizations
    FOR SELECT USING (
        id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
    );

-- Org members can read member list
CREATE POLICY "Members read org roster" ON organization_members
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
    );

-- ── Helper Function: Get or Create Usage Row ─────
CREATE OR REPLACE FUNCTION get_or_create_usage(p_user_id UUID, p_month TEXT)
RETURNS usage_tracking AS $$
DECLARE
    result usage_tracking;
BEGIN
    SELECT * INTO result FROM usage_tracking
    WHERE user_id = p_user_id AND month = p_month;
    
    IF NOT FOUND THEN
        INSERT INTO usage_tracking (user_id, month, ai_generations_used, exports_used)
        VALUES (p_user_id, p_month, 0, 0)
        RETURNING * INTO result;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Helper Function: Increment AI Usage ──────────
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID, p_count INT DEFAULT 1)
RETURNS INT AS $$
DECLARE
    current_month TEXT;
    new_count INT;
BEGIN
    current_month := to_char(NOW(), 'YYYY-MM');
    
    INSERT INTO usage_tracking (user_id, month, ai_generations_used)
    VALUES (p_user_id, current_month, p_count)
    ON CONFLICT (user_id, month) 
    DO UPDATE SET 
        ai_generations_used = usage_tracking.ai_generations_used + p_count,
        updated_at = NOW()
    RETURNING ai_generations_used INTO new_count;
    
    RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Auto-create starter subscription on new user ──
-- (Run this as a trigger or call manually after user signup)
CREATE OR REPLACE FUNCTION auto_create_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO subscriptions (user_id, plan, status)
    VALUES (NEW.id, 'starter', 'active')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION auto_create_subscription();
