-- ==========================================
-- MASTER CHAT OPTIMIZATION SCRIPT
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Ensure all users have a Profile
insert into public.profiles (id, email, full_name, role, is_active)
select 
  id, 
  email, 
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', 'Unknown User'),
  coalesce(raw_user_meta_data->>'role', 'formulator'),
  true -- Set to true for existing users to enable chat immediately
from auth.users
on conflict (id) do update 
set is_active = true; -- FORCE ALL USERS TO ACTIVE

-- Also run an explicit cleanup just in case conflict doesn't catch existing
update public.profiles set is_active = true;

-- 1.1 Update Trigger to default to active for future users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New User'),
    coalesce(new.raw_user_meta_data->>'role', 'formulator'),
    true -- Default to ACTIVE for stability
  );
  return new;
end;
$$;

-- 2. Ensure all users are in the General Workspace
insert into public.chat_members (room_id, user_id)
select '00000000-0000-0000-0000-000000000000', id 
from auth.users
on conflict (room_id, user_id) do nothing;

-- 3. Update Profiles RLS for Visibility (Allow all authenticated users to see each other)
drop policy if exists "Allow read all for authenticated" on public.profiles;
create policy "Allow read all for authenticated" 
on public.profiles
for select 
using (auth.role() = 'authenticated');

-- 4. Update Chat Members RLS (Allow all authenticated users to view membership)
-- This is critical so everyone can see the member count and list in channels
drop policy if exists "Members can view room members" on public.chat_members;
create policy "Members can view room members" 
on public.chat_members
for select 
using (auth.role() = 'authenticated');

-- 5. Enable Real-time for Chat Tables
-- This ensures messages and presence update instantly
begin;
  -- Remove existing publication if it exists to refresh
  drop publication if exists supabase_realtime;
  
  -- Re-create publication with ALL necessary tables
  create publication supabase_realtime for table 
    public.messages, 
    public.chat_rooms, 
    public.chat_members,
    public.profiles;
commit;

-- 6. Grant Replication Permissions (If needed)
-- Note: This usually requires superuser, but is worth including for completeness
-- alter user supabase_admin with replication;
