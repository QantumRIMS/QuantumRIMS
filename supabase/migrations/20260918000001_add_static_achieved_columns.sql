-- Migration: Add static achieved columns to faculty_publication_targets
-- These store the 2026 official Excel snapshot values so we don't depend
-- on name-matching heuristics in legacy_publications for historical data.

ALTER TABLE faculty_publication_targets
  ADD COLUMN IF NOT EXISTS sci_achieved_static INTEGER,
  ADD COLUMN IF NOT EXISTS scopus_journal_achieved_static INTEGER,
  ADD COLUMN IF NOT EXISTS scopus_conference_achieved_static INTEGER;

COMMENT ON COLUMN faculty_publication_targets.sci_achieved_static
  IS 'Static achieved count seeded from official Excel report (used when live-compute is unreliable)';
COMMENT ON COLUMN faculty_publication_targets.scopus_journal_achieved_static
  IS 'Static achieved count seeded from official Excel report';
COMMENT ON COLUMN faculty_publication_targets.scopus_conference_achieved_static
  IS 'Static achieved count seeded from official Excel report';
