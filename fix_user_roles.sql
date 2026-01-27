-- =========================================================
-- FIX USER ROLES SCRIPT
-- Run this to demote users who accidentally became Admins
-- =========================================================

-- 1. List all Admins (Just to check)
select email, role, is_active from public.profiles where role = 'admin';

-- 2. DEMOTE a specific user to 'formulator'
-- Replace with the email of the user you want to demote
update public.profiles
set role = 'formulator'
where email = 'USER_TO_DEMOTE@EXAMPLE.COM' -- <--- CHANGE THIS
and role = 'admin';

-- 3. Ensure your main account stays Admin!
-- Replace with YOUR email
update public.profiles
set role = 'admin', is_active = true
where email = 'YOUR_MAIN_EMAIL@EXAMPLE.COM'; -- <--- CHANGE THIS
