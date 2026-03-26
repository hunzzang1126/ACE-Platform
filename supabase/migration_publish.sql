-- ═══════════════════════════════════════════════════
-- ACE Platform — Social Publishing Migration
-- ═══════════════════════════════════════════════════
-- Run this SQL in the Supabase Dashboard SQL Editor
-- AFTER running migration_auth.sql
-- ═══════════════════════════════════════════════════

-- ── Connected Social Accounts (per user) ─────────
create table if not exists public.user_social_accounts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    platform text not null check (platform in ('instagram', 'facebook', 'google_ads')),
    platform_user_id text,
    account_name text,
    account_avatar text,
    access_token text not null,
    refresh_token text,
    token_expires_at timestamptz,
    scopes text[],
    connected_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(user_id, platform, platform_user_id)
);

alter table public.user_social_accounts enable row level security;

-- Users can only see/manage their own accounts
create policy "Users manage own social accounts" on public.user_social_accounts
    for all using (auth.uid() = user_id);

create index if not exists idx_social_accounts_user on public.user_social_accounts(user_id);
create index if not exists idx_social_accounts_platform on public.user_social_accounts(platform);

-- Auto-update updated_at
create trigger social_accounts_updated_at
    before update on public.user_social_accounts
    for each row execute function public.handle_updated_at();

-- ── Publish History ──────────────────────────────
create table if not exists public.publish_history (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    creative_set_id text not null,
    variant_id text,
    variant_label text,
    platform text not null check (platform in ('instagram', 'facebook', 'google_ads')),
    platform_post_id text,
    social_account_id uuid references public.user_social_accounts(id) on delete set null,
    status text not null default 'pending' check (status in ('pending', 'publishing', 'published', 'failed', 'scheduled')),
    scheduled_at timestamptz,
    published_at timestamptz,
    caption text,
    hashtags text[],
    headlines text[],
    image_url text,
    image_width integer,
    image_height integer,
    error_message text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.publish_history enable row level security;

create policy "Users manage own publish history" on public.publish_history
    for all using (auth.uid() = user_id);

create index if not exists idx_publish_user on public.publish_history(user_id);
create index if not exists idx_publish_creative on public.publish_history(creative_set_id);
create index if not exists idx_publish_status on public.publish_history(status);
create index if not exists idx_publish_platform on public.publish_history(platform);

create trigger publish_history_updated_at
    before update on public.publish_history
    for each row execute function public.handle_updated_at();

-- ── Campaign Metrics (cached from platform APIs) ─
create table if not exists public.campaign_metrics (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    publish_id uuid references public.publish_history(id) on delete cascade,
    platform text not null,
    metric_date date not null,
    impressions integer default 0,
    clicks integer default 0,
    reach integer default 0,
    engagement integer default 0,
    likes integer default 0,
    comments integer default 0,
    shares integer default 0,
    saves integer default 0,
    views integer default 0,
    ctr numeric(5,4) default 0,
    cost_cents integer default 0,
    conversions integer default 0,
    fetched_at timestamptz default now(),
    unique(publish_id, metric_date)
);

alter table public.campaign_metrics enable row level security;

create policy "Users read own metrics" on public.campaign_metrics
    for select using (auth.uid() = user_id);

create index if not exists idx_metrics_publish on public.campaign_metrics(publish_id);
create index if not exists idx_metrics_date on public.campaign_metrics(metric_date);
