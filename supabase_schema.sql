-- Database Schema for Formulation Pro
-- Run this in your Supabase SQL Editor

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  role text default 'formulator',
  is_active boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure is_active column exists (Definitive Fix for PGRST204)
alter table public.profiles add column if not exists is_active boolean default false;

-- Bootstrap existing users to be active (Safety Strap)
update public.profiles set is_active = true where is_active is null;

-- 2. Formulations Table
create table if not exists public.formulations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null,
  lot_number text not null,
  customer text,
  product_name text not null,
  total_weight numeric not null,
  bottle_type text,
  bottle_qty integer,
  status text default 'draft',
  version text default 'V1.0',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Formulation Ingredients Table
create table if not exists public.formulation_ingredients (
  id uuid default gen_random_uuid() primary key,
  formulation_id uuid references public.formulations on delete cascade not null,
  ingredient_name text,
  percentage numeric,
  calculated_weight numeric,
  phase text,
  is_label boolean default false,
  label_text text,
  decimal_places integer default 2,
  rounding_mode text default 'round',
  sort_order integer
);

-- 4. Existing Ingredients Table
create table if not exists public.existing_ingredients (
  id uuid default gen_random_uuid() primary key,
  formulation_id uuid references public.formulations on delete cascade not null,
  ingredient_name text,
  existing_weight numeric
);

-- 5. Boss Requests Table
create table if not exists public.boss_requests (
  id uuid default gen_random_uuid() primary key,
  boss_id uuid references auth.users on delete cascade not null,
  type text,
  product_name text,
  customer text,
  target_weight numeric,
  priority text default 'medium',
  deadline date,
  specifications text,
  formulator_id uuid references auth.users,
  status text default 'pending',
  attachments jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for all tables
alter table public.profiles enable row level security;
alter table public.formulations enable row level security;
alter table public.formulation_ingredients enable row level security;
alter table public.existing_ingredients enable row level security;
alter table public.boss_requests enable row level security;

-- Setup Basic RLS Policies (Idempotent)
drop policy if exists "Allow all for authenticated users" on public.profiles;
create policy "Allow all for authenticated users" on public.profiles for all using (auth.uid() = id);

-- Helper function to check if user is admin (Bypasses RLS to avoid recursion)
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

drop policy if exists "Allow read all for authenticated" on public.profiles;
create policy "Allow read all for authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "Allow update all for Admins" on public.profiles;
create policy "Allow update all for Admins" on public.profiles
  for update using (public.is_admin());

drop policy if exists "Allow full access for Admins" on public.system_settings;
create policy "Allow full access for Admins" on public.system_settings
  for all using (public.is_admin());

drop policy if exists "Allow all for owner" on public.formulations;
create policy "Allow all for owner" on public.formulations for all using (auth.uid() = user_id);

drop policy if exists "Allow all for owner" on public.formulation_ingredients;
create policy "Allow all for owner" on public.formulation_ingredients for all 
  using (exists (select 1 from public.formulations where id = formulation_id and user_id = auth.uid()));

drop policy if exists "Allow all for owner" on public.existing_ingredients;
create policy "Allow all for owner" on public.existing_ingredients for all 
  using (exists (select 1 from public.formulations where id = formulation_id and user_id = auth.uid()));

drop policy if exists "Allow all for owner" on public.boss_requests;
create policy "Allow all for owner" on public.boss_requests for all using (auth.uid() = boss_id);

-- 6. System Settings Table (Updated for Role-Based Codes)
create table if not exists public.system_settings (
  key text primary key,
  value text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default codes for each role
insert into public.system_settings (key, value) values 
  ('reg_code_admin', 'ADMIN-MASTER-2026'),
  ('reg_code_formulator', 'FORM-2026'),
  ('reg_code_chemist', 'CHEM-2026'),
  ('reg_code_compounding', 'COMP-2026'),
  ('reg_code_regulator_viewer', 'REG-2026')
on conflict (key) do nothing;

-- Enable RLS for system_settings
alter table public.system_settings enable row level security;

-- Policies for system_settings
drop policy if exists "Allow read for all authenticated" on public.system_settings;
create policy "Allow read for all authenticated" on public.system_settings 
  for select using (auth.role() = 'authenticated');

drop policy if exists "Allow full access for Admins" on public.system_settings;
create policy "Allow full access for Admins" on public.system_settings
  for all using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );

-- 7. Registration Code Validation Function (Security Definer to bypass RLS for signup)
create or replace function public.validate_registration_code(input_code text)
returns text
language plpgsql
security definer
as $$
declare
  found_key text;
begin
  select key into found_key
  from public.system_settings
  where value = input_code
  and key like 'reg_code_%'
  limit 1;

  if found_key is null then
    return null;
  else
    return replace(found_key, 'reg_code_', '');
  end if;
end;
$$;

grant execute on function public.validate_registration_code(text) to anon, authenticated;

-- 8. Trigger for New User Creation (The Correct Way to Handle Profiles)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  assigned_role text;
begin
  -- Get role from metadata (set by client during signup)
  assigned_role := coalesce(new.raw_user_meta_data->>'role', 'formulator');
  
  -- Insert profile
  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New User'),
    assigned_role,
    true -- Default to ACTIVE for stability (Admin can still deactivate later)
  );

  return new;
end;
$$;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
