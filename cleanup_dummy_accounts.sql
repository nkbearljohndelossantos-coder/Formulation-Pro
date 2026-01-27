-- Clean up Placeholder/Dummy Accounts
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Delete profiles for the placeholder accounts
DELETE FROM public.profiles 
WHERE email IN ('earlj@formulation.pro', 'email@formulation.pro');

-- 2. Delete the auth users (This requires admin access, but if you run this in SQL editor it usually works)
-- Note: Replace these IDs if they differ, or use email match
DELETE FROM auth.users 
WHERE email IN ('earlj@formulation.pro', 'email@formulation.pro');

-- 3. Clean up any leftover registrations or test requests
DELETE FROM public.formulations 
WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.boss_requests 
WHERE boss_id NOT IN (SELECT id FROM auth.users);
