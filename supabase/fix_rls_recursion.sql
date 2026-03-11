-- ═══════════════════════════════════════════════════
-- FIX: Infinite recursion in user_roles RLS policies
-- ═══════════════════════════════════════════════════
-- The old "Admins read all roles" policy queried user_roles
-- inside user_roles RLS, causing infinite recursion.
-- Fix: use a security definer function that bypasses RLS.
-- ═══════════════════════════════════════════════════

-- Step 1: Drop old broken policies
drop policy if exists "Users read own role" on public.user_roles;
drop policy if exists "Admins read all roles" on public.user_roles;
drop policy if exists "Admins update roles" on public.user_roles;
drop policy if exists "System inserts roles" on public.user_roles;

-- Step 2: Create a helper function that bypasses RLS to check admin status
create or replace function public.is_admin(check_user_id uuid)
returns boolean as $$
    select exists (
        select 1 from public.user_roles
        where user_id = check_user_id and role = 'admin'
    );
$$ language sql security definer stable;

-- Step 3: Re-create policies using the helper function
-- Any authenticated user can read their own role
create policy "Users read own role" on public.user_roles
    for select using (auth.uid() = user_id);

-- Admins can read ALL roles (uses security definer function to avoid recursion)
create policy "Admins read all roles" on public.user_roles
    for select using (public.is_admin(auth.uid()));

-- Admins can update any role
create policy "Admins update roles" on public.user_roles
    for update using (public.is_admin(auth.uid()));

-- System can insert new roles (on signup trigger)
create policy "System inserts roles" on public.user_roles
    for insert with check (auth.uid() = user_id);
