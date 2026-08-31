-- Add registration_link to announcements table
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS registration_link TEXT;
