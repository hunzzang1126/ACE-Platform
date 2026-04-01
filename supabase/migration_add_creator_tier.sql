-- ─────────────────────────────────────────────────
-- Migration: Add 'creator' tier to plan CHECK constraints
-- ─────────────────────────────────────────────────
-- Run this in Supabase SQL Editor on live DB.
-- This modifies the CHECK constraint to accept 'creator' as a valid plan.
-- ─────────────────────────────────────────────────

-- 1. Drop old CHECK constraint on subscriptions.plan
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

-- 2. Add new CHECK constraint with 'creator'
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
    CHECK (plan IN ('starter', 'creator', 'pro', 'enterprise'));

-- 3. Drop old CHECK constraint on organizations.plan
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_check;

-- 4. Add new CHECK constraint with 'creator'
ALTER TABLE organizations ADD CONSTRAINT organizations_plan_check
    CHECK (plan IN ('starter', 'creator', 'pro', 'enterprise'));

-- Verify
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'subscriptions'::regclass AND contype = 'c';
