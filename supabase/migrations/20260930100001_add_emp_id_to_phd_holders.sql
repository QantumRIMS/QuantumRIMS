-- Add emp_id column to legacy_phd_holders
ALTER TABLE public.legacy_phd_holders
ADD COLUMN IF NOT EXISTS emp_id TEXT;
