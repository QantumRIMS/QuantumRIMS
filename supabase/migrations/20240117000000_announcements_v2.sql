-- Migration for Announcements V2
-- Adds new category, poster_url, start_date, registration_end_date

-- 1. Drop existing constraint
ALTER TABLE announcements DROP CONSTRAINT announcements_category_check;

-- 2. Add new constraint with cfrd_circular
ALTER TABLE announcements ADD CONSTRAINT announcements_category_check 
  CHECK (category IN ('workshops', 'seminars', 'events', 'deadlines', 'funding_opportunities', 'general_notices', 'cfrd_circular'));

-- 3. Add new columns
ALTER TABLE announcements ADD COLUMN poster_url TEXT;
ALTER TABLE announcements ADD COLUMN start_date DATE;
ALTER TABLE announcements ADD COLUMN registration_end_date DATE;
