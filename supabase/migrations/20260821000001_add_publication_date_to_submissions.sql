-- Add publication_date to submissions table
-- This allows staff to record when their paper was published.
-- Month is derived server-side from this date.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS publication_date DATE;
