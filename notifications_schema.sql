-- Notifications Table and System
-- Run this in your Supabase SQL Editor

-- 1. Create Notifications Table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  message text,
  type text default 'info',
  is_read boolean default false,
  link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Only users can see their own notifications
drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications" on public.notifications
  for select using (auth.uid() = user_id);

-- Only users can update their own notifications (mark as read)
drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

-- 2. Notification Triggers

-- Trigger Function: Notify Boss on Task Completion (Compounding)
create or replace function public.notify_on_production_complete()
returns trigger
language plpgsql
security definer
as $$
declare
  recipient_id uuid;
begin
  if new.status = 'completed' and old.status != 'completed' then
    -- Get the formulator who created this
    recipient_id := new.user_id;
    
    insert into public.notifications (user_id, title, message, type, link)
    values (
      recipient_id,
      'Production Completed',
      'Task for ' || new.product_name || ' (Lot: ' || new.lot_number || ') has been completed.',
      'success',
      'index.html' -- Redirect to dashboard
    );
  end if;
  return new;
end;
$$;

-- Apply trigger to formulations
drop trigger if exists on_production_complete on public.formulations;
create trigger on_production_complete
  after update on public.formulations
  for each row execute procedure public.notify_on_production_complete();


-- Trigger Function: Notify Formulators on New Boss Request
create or replace function public.notify_on_boss_request()
returns trigger
language plpgsql
security definer
as $$
declare
  formulator_record record;
begin
  -- Notify all active formulators/chemists
  for formulator_record in 
    select id from public.profiles 
    where (role = 'formulator' or role = 'chemist' or role = 'admin') 
    and is_active = true
  loop
    insert into public.notifications (user_id, title, message, type, link)
    values (
      formulator_record.id,
      'New Boss Request',
      'A new request for ' || new.product_name || ' has been submitted by ' || (select email from auth.users where id = new.boss_id) || '.',
      'info',
      'boss-request.html?view=' || new.id
    );
  end loop;
  return new;
end;
$$;

-- Apply trigger to boss_requests
drop trigger if exists on_new_boss_request on public.boss_requests;
create trigger on_new_boss_request
  after insert on public.boss_requests
  for each row execute procedure public.notify_on_boss_request();


-- 3. Enable Real-time for Notifications
-- Note: Ensure this is added to the 'supabase_realtime' publication
begin;
  -- If you already have a publication named 'supabase_realtime', add to it
  -- or refresh the whole publication
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table 
    public.messages, 
    public.chat_rooms, 
    public.chat_members,
    public.profiles,
    public.notifications;
commit;
