-- Migration: Add extended target columns to faculty_publication_targets
-- These columns store the additional targets from the 2026 publication targets Excel

ALTER TABLE faculty_publication_targets
  ADD COLUMN IF NOT EXISTS student_publication_target integer NOT NULL DEFAULT 0 CHECK (student_publication_target >= 0),
  ADD COLUMN IF NOT EXISTS utility_patent_target       integer NOT NULL DEFAULT 0 CHECK (utility_patent_target >= 0),
  ADD COLUMN IF NOT EXISTS design_patent_target        integer NOT NULL DEFAULT 0 CHECK (design_patent_target >= 0),
  ADD COLUMN IF NOT EXISTS copyright_target            integer NOT NULL DEFAULT 0 CHECK (copyright_target >= 0),
  ADD COLUMN IF NOT EXISTS funding_target              bigint  NOT NULL DEFAULT 0 CHECK (funding_target >= 0),
  ADD COLUMN IF NOT EXISTS consultancy_target          bigint  NOT NULL DEFAULT 0 CHECK (consultancy_target >= 0),
  ADD COLUMN IF NOT EXISTS designation                 text,
  ADD COLUMN IF NOT EXISTS faculty_type                text;

COMMENT ON COLUMN faculty_publication_targets.student_publication_target IS 'Target for student co-authored publications';
COMMENT ON COLUMN faculty_publication_targets.utility_patent_target      IS 'Target for utility patents filed';
COMMENT ON COLUMN faculty_publication_targets.design_patent_target       IS 'Target for design patents filed';
COMMENT ON COLUMN faculty_publication_targets.copyright_target           IS 'Target for copyrights registered';
COMMENT ON COLUMN faculty_publication_targets.funding_target             IS 'Target funding amount in INR';
COMMENT ON COLUMN faculty_publication_targets.consultancy_target         IS 'Target consultancy revenue in INR';
COMMENT ON COLUMN faculty_publication_targets.designation                IS 'Faculty designation in the academic year (e.g. Prof., Asst. Prof.)';
COMMENT ON COLUMN faculty_publication_targets.faculty_type               IS 'Doctorate, Non-Doctorate, etc.';
