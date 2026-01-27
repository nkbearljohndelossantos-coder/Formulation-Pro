-- Chat Module Schema for Supabase

-- 1. Chat Rooms Table
create table if not exists public.chat_rooms (
  id uuid default gen_random_uuid() primary key,
  name text,
  type text not null check (type in ('group', 'private')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id)
);

-- 2. Chat Members Table
create table if not exists public.chat_members (
  room_id uuid references public.chat_rooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (room_id, user_id)
);

-- 3. Messages Table
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.chat_rooms(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  message text,
  file_url text,
  file_type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Storage Bucket for Chat Files
-- Note: Create 'chat-attachments' bucket in Supabase Dashboard manually or via API
-- Ensure the bucket is public or has proper RLS

-- Enable Row Level Security
alter table public.chat_rooms enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;

-- --- RLS POLICIES ---

-- Chat Rooms: Only members can see rooms they belong to
drop policy if exists "Members can view their rooms" on public.chat_rooms;
create policy "Members can view their rooms" 
on public.chat_rooms 
for select 
using (
  exists (
    select 1 from public.chat_members 
    where room_id = public.chat_rooms.id 
    and user_id = auth.uid()
  )
);

-- Chat Members: Only members can see other members in their rooms
drop policy if exists "Members can view room members" on public.chat_members;
create policy "Members can view room members" 
on public.chat_members 
for select 
using (
  exists (
    select 1 from public.chat_members as my_membership
    where my_membership.room_id = public.chat_members.room_id 
    and my_membership.user_id = auth.uid()
  )
);

drop policy if exists "Users can join rooms" on public.chat_members;
create policy "Users can join rooms" 
on public.chat_members 
for insert 
with check (auth.uid() = user_id);

-- Messages: Only members can read messages in a room
drop policy if exists "Members can read room messages" on public.messages;
create policy "Members can read room messages" 
on public.messages 
for select 
using (
  exists (
    select 1 from public.chat_members 
    where room_id = public.messages.room_id 
    and user_id = auth.uid()
  )
);

-- Messages: Only members can insert messages in a room
drop policy if exists "Members can send messages" on public.messages;
create policy "Members can send messages" 
on public.messages 
for insert 
with check (
  exists (
    select 1 from public.chat_members 
    where room_id = public.messages.room_id 
    and user_id = auth.uid()
  )
  and sender_id = auth.uid()
);

-- Messages: Only sender can delete their own message
drop policy if exists "Senders can delete own messages" on public.messages;
create policy "Senders can delete own messages" 
on public.messages 
for delete 
using (
  sender_id = auth.uid()
);

-- --- HELPER VIEWS/FUNCTIONS ---

-- Function to get or create a private room between two users
create or replace function get_or_create_private_room(target_user_id uuid)
returns uuid as $$
declare
    existing_room_id uuid;
    new_room_id uuid;
begin
    -- Check if a private room already exists between auth.uid() and target_user_id
    select r.id into existing_room_id
    from public.chat_rooms r
    join public.chat_members m1 on r.id = m1.room_id
    join public.chat_members m2 on r.id = m2.room_id
    where r.type = 'private'
    and m1.user_id = auth.uid()
    and m2.user_id = target_user_id;

    if existing_room_id is not null then
        return existing_room_id;
    end if;

    -- Create new room
    insert into public.chat_rooms (type) 
    values ('private') 
    returning id into new_room_id;

    -- Add both members
    insert into public.chat_members (room_id, user_id) 
    values (new_room_id, auth.uid()), (new_room_id, target_user_id);

    return new_room_id;
end;
$$ language plpgsql security definer;

-- --- SEEDING & AUTOMATION ---

-- 1. Create General Room
insert into public.chat_rooms (id, name, type)
values ('00000000-0000-0000-0000-000000000000', 'General Workspace', 'group')
on conflict (id) do nothing;

-- 2. Trigger to add every new user to General Room
create or replace function public.join_general_room()
returns trigger as $$
begin
    insert into public.chat_members (room_id, user_id)
    values ('00000000-0000-0000-0000-000000000000', new.id)
    on conflict do nothing;
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_join_chat on auth.users;
create trigger on_auth_user_created_join_chat
  after insert on auth.users
  for each row execute procedure public.join_general_room();

-- 3. Retroactively add existing users to General Room
insert into public.chat_members (room_id, user_id)
select '00000000-0000-0000-0000-000000000000', id from auth.users
on conflict do nothing;
