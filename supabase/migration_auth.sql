-- ═══════════════════════════════════════════════════
-- ACE Platform — Auth & RBAC Migration
-- ═══════════════════════════════════════════════════
-- Run this SQL in the Supabase Dashboard SQL Editor
-- AFTER running the initial migration.sql
-- ═══════════════════════════════════════════════════

-- ── User Roles ──────────────────────────────────
create table if not exists public.user_roles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    role text not null default 'pending' check (role in ('admin', 'user', 'pending', 'rejected')),
    display_name text,
    avatar_url text,
    email text,
    approved_by uuid references auth.users(id),
    approved_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ── RLS for user_roles ──────────────────────────
alter table public.user_roles enable row level security;

-- Users can read their own role
create policy "Users read own role" on public.user_roles
    for select using (auth.uid() = user_id);

-- Admins can read all roles
create policy "Admins read all roles" on public.user_roles
    for select using (
        exists (
            select 1 from public.user_roles
            where user_id = auth.uid() and role = 'admin'
        )
    );

-- Admins can update any role
create policy "Admins update roles" on public.user_roles
    for update using (
        exists (
            select 1 from public.user_roles
            where user_id = auth.uid() and role = 'admin'
        )
    );

-- System can insert new roles (on signup trigger)
create policy "System inserts roles" on public.user_roles
    for insert with check (auth.uid() = user_id);

-- ── Index ───────────────────────────────────────
create index if not exists idx_user_roles_role on public.user_roles(role);

-- ── Auto-create role on signup ──────────────────
create or replace function public.handle_new_user()
returns trigger as $$
declare
    user_count integer;
    new_role text;
begin
    -- First user becomes admin, rest are pending
    select count(*) into user_count from public.user_roles;
    if user_count = 0 then
        new_role := 'admin';
    else
        new_role := 'pending';
    end if;

    insert into public.user_roles (user_id, role, display_name, avatar_url, email)
    values (
        new.id,
        new_role,
        coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url',
        new.email
    );
    return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if any, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ── Auto-update updated_at ──────────────────────
create trigger user_roles_updated_at
    before update on public.user_roles
    for each row execute function public.handle_updated_at();
