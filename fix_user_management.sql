-- FIX USER MANAGEMENT & MIGRATION SCRIPT
-- Run this script in the Supabase SQL Editor to repair permissions and migrate roles.

-- 1. FIX: Redefine is_admin with proper security context to avoid RLS recursion
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- 2. FIX: Reset RLS Policies for Profiles
-- Ensure Admins can definitely read/update all profiles
drop policy if exists "Allow all for authenticated users" on public.profiles;
drop policy if exists "Allow read all for Admins" on public.profiles;
drop policy if exists "Allow update all for Admins" on public.profiles;

-- Basic policy: Users see themselves
create policy "Allow all for authenticated users" on public.profiles
  for all using (auth.uid() = id);

-- Admin policy: Admins see everyone
create policy "Allow read all for Admins" on public.profiles
  for select using (public.is_admin());

-- Admin policy: Admins can update everyone
create policy "Allow update all for Admins" on public.profiles
  for update using (public.is_admin());

-- 3. MIGRATION: Convert 'viewer' role to 'compounding'
-- This fixes the issue where dropdowns might show 'Admin' for legacy viewers
update public.profiles
set role = 'compounding'
where role = 'viewer';

-- 4. FIX: Ensure handle_new_user is secure
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  assigned_role text;
begin
  assigned_role := coalesce(new.raw_user_meta_data->>'role', 'formulator');
  
  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New User'),
    assigned_role,
    false
  );
  return new;
end;
$$;

-- 5. FIX: Ensure System Settings has the newCompounding Code if missing
insert into public.system_settings (key, value)
values ('reg_code_compounding', 'COMP-2026')
on conflict (key) do nothing;
