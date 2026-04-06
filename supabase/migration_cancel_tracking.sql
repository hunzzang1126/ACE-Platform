-- Add cancel_at_period_end tracking to subscriptions table
-- Run this in Supabase SQL Editor
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at timestamptz;
