ALTER TABLE legacy_publications 
ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false;
