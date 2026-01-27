-- =========================================================
-- PROMOTE USER TO ADMIN SCRIPT
-- Run this in Supabase SQL Editor
-- =========================================================

-- Replace 'YOUR_EMAIL@EXAMPLE.COM' with the actual email of the user you want to promote
-- Make sure to keep the single quotes!

update public.profiles
set role = 'admin', is_active = true
where email = 'YOUR_EMAIL@EXAMPLE.COM'; -- <--- CHANGE THIS EMAIL

-- Verify the change
select * from public.profiles where role = 'admin';
