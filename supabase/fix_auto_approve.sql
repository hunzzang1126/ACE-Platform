-- ═══════════════════════════════════════════════════
-- FIX: Auto-approve OAuth users, email verification for others
-- ═══════════════════════════════════════════════════
-- OAuth (Google/GitHub): user role immediately
-- Email signup: user role immediately (Supabase handles email verification)
-- First user: admin role
-- ═══════════════════════════════════════════════════

-- Replace the trigger function
create or replace function public.handle_new_user()
returns trigger as $$
declare
    user_count integer;
    new_role text;
begin
    -- First user becomes admin
    select count(*) into user_count from public.user_roles;
    if user_count = 0 then
        new_role := 'admin';
    else
        -- All subsequent users get 'user' role directly
        -- OAuth users are already verified by provider
        -- Email users are verified via Supabase email confirmation
        new_role := 'user';
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

-- Also fix existing pending users to 'user'
UPDATE public.user_roles SET role = 'user' WHERE role = 'pending';
