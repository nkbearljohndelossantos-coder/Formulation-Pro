-- =========================================================
-- CONFIRM EMAILS SCRIPT
-- Run this in Supabase SQL Editor to bypass email verification
-- =========================================================

-- 1. Confirm all users' emails
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;

-- 2. Ensure they are active in profiles
update public.profiles
set is_active = true
where is_active = false;
