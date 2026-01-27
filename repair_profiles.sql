-- ==========================================
-- REPAIR SCRIPT: Run this in Supabase SQL Editor
-- ==========================================

-- 1. Backfill Missing Profiles
-- This finds users in 'auth.users' who don't have a row in 'public.profiles' and creates one.
insert into public.profiles (id, email, full_name, role, is_active)
select 
  id, 
  email, 
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', 'Unknown User'),
  coalesce(raw_user_meta_data->>'role', 'formulator'),
  false -- Default to inactive
from auth.users
where id not in (select id from public.profiles);

-- 2. Verify Admin Policy (Re-run to be safe)
create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

drop policy if exists "Allow read all for Admins" on public.profiles;
create policy "Allow read all for Admins" on public.profiles
  for select using (public.is_admin());

-- 3. Verify Trigger (Re-run to be safe)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  is_first_user boolean;
  assigned_role text;
begin
  -- Check if this is the first user
  select count(*) = 0 into is_first_user from public.profiles;

  -- Get role from metadata (set by client during signup)
  assigned_role := coalesce(new.raw_user_meta_data->>'role', 'formulator');
  
  -- If first user, force Admin role
  if is_first_user then
    assigned_role := 'admin';
  end if;

  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New User'),
    assigned_role,
    is_first_user
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
