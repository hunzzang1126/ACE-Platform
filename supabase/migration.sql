-- ═══════════════════════════════════════════════════
-- ACE Platform — Supabase Schema Migration
-- ═══════════════════════════════════════════════════
-- Run this SQL in the Supabase Dashboard SQL Editor:
--   1. Go to https://supabase.com/dashboard
--   2. Select your project
--   3. Click "SQL Editor" in the left sidebar
--   4. Paste this entire file
--   5. Click "Run"
-- ═══════════════════════════════════════════════════

-- ── Enable UUID extension ──
create extension if not exists "uuid-ossp";

-- ═══════════════════════════════════════════════════
-- TABLE: projects (dashboard-level project metadata)
-- ═══════════════════════════════════════════════════
create table if not exists public.projects (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade,
    name text not null default 'Untitled Project',
    folder_id uuid,
    variant_count integer default 1,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    deleted_at timestamptz  -- soft delete (trash)
);

-- ═══════════════════════════════════════════════════
-- TABLE: creative_sets (full design data per project)
-- ═══════════════════════════════════════════════════
create table if not exists public.creative_sets (
    id uuid primary key default uuid_generate_v4(),
    project_id uuid references public.projects(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    data jsonb not null default '{}',  -- full CreativeSet JSON
    version integer default 1,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════
-- TABLE: folders (for dashboard organization)
-- ═══════════════════════════════════════════════════
create table if not exists public.folders (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade,
    name text not null,
    parent_id uuid references public.folders(id) on delete set null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════
-- RLS (Row Level Security) — users can only see their own data
-- ═══════════════════════════════════════════════════
alter table public.projects enable row level security;
alter table public.creative_sets enable row level security;
alter table public.folders enable row level security;

-- Projects: user owns their own data
create policy "Users read own projects" on public.projects
    for select using (auth.uid() = user_id);
create policy "Users insert own projects" on public.projects
    for insert with check (auth.uid() = user_id);
create policy "Users update own projects" on public.projects
    for update using (auth.uid() = user_id);
create policy "Users delete own projects" on public.projects
    for delete using (auth.uid() = user_id);

-- Creative Sets: user owns their own data
create policy "Users read own creative_sets" on public.creative_sets
    for select using (auth.uid() = user_id);
create policy "Users insert own creative_sets" on public.creative_sets
    for insert with check (auth.uid() = user_id);
create policy "Users update own creative_sets" on public.creative_sets
    for update using (auth.uid() = user_id);
create policy "Users delete own creative_sets" on public.creative_sets
    for delete using (auth.uid() = user_id);

-- Folders: user owns their own data
create policy "Users read own folders" on public.folders
    for select using (auth.uid() = user_id);
create policy "Users insert own folders" on public.folders
    for insert with check (auth.uid() = user_id);
create policy "Users update own folders" on public.folders
    for update using (auth.uid() = user_id);
create policy "Users delete own folders" on public.folders
    for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════
-- INDEXES for performance
-- ═══════════════════════════════════════════════════
create index if not exists idx_projects_user on public.projects(user_id);
create index if not exists idx_creative_sets_project on public.creative_sets(project_id);
create index if not exists idx_creative_sets_user on public.creative_sets(user_id);
create index if not exists idx_folders_user on public.folders(user_id);

-- ═══════════════════════════════════════════════════
-- STORAGE BUCKET for image/video assets
-- ═══════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('ace-assets', 'ace-assets', true)
on conflict (id) do nothing;

-- Storage policy: authenticated users can upload/read
create policy "Users upload own assets" on storage.objects
    for insert with check (bucket_id = 'ace-assets' and auth.role() = 'authenticated');
create policy "Public read assets" on storage.objects
    for select using (bucket_id = 'ace-assets');

-- ═══════════════════════════════════════════════════
-- auto-update updated_at trigger
-- ═══════════════════════════════════════════════════
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
    before update on public.projects
    for each row execute function public.handle_updated_at();

create trigger creative_sets_updated_at
    before update on public.creative_sets
    for each row execute function public.handle_updated_at();

create trigger folders_updated_at
    before update on public.folders
    for each row execute function public.handle_updated_at();
