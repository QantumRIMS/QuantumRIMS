-- Migration: Add patent_type column to legacy_patents
-- Allows distinguishing between Utility Patent, Design Patent, and Copyright

ALTER TABLE legacy_patents
  ADD COLUMN IF NOT EXISTS patent_type text DEFAULT 'Utility' 
  CHECK (patent_type IN ('Utility', 'Design', 'Copyright'));

COMMENT ON COLUMN legacy_patents.patent_type IS 'Type of IP: Utility (default), Design, or Copyright';

-- Update existing rows: default everything to Utility
UPDATE legacy_patents SET patent_type = 'Utility' WHERE patent_type IS NULL;
