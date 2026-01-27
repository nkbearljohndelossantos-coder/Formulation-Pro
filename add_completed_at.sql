-- Add completed_at column to formulations
alter table public.formulations add column if not exists completed_at timestamp with time zone;

-- Update status to support 'completed'
update public.formulations set status = 'draft' where status is null;
alter table public.formulations alter column status set default 'draft';
