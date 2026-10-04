-- Add emp_id column to legacy_publications
ALTER TABLE public.legacy_publications
ADD COLUMN emp_id VARCHAR(50);

-- Also add emp_id to submissions if it's there (assuming submissions might need it)
-- First check if submissions table exists, we'll just add it to legacy_publications for now.
