-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: faculty_publication_targets
-- Creates a table to store per-faculty, per-academic-year publication targets.
-- Achieved counts are NEVER stored here — they are always computed live from
-- submissions + legacy_publications to prevent stale data.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS faculty_publication_targets (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id                   text        NOT NULL REFERENCES master_faculty(emp_id) ON DELETE CASCADE,
  academic_year            text        NOT NULL,   -- e.g. '2026'
  sci_target               integer     NOT NULL DEFAULT 0 CHECK (sci_target >= 0),
  scopus_journal_target    integer     NOT NULL DEFAULT 0 CHECK (scopus_journal_target >= 0),
  scopus_conference_target integer     NOT NULL DEFAULT 0 CHECK (scopus_conference_target >= 0),
  -- total_target = sci + journal + conference (always computed, never stored independently)
  set_by                   uuid        REFERENCES auth.users(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (emp_id, academic_year)
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION faculty_publication_targets_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS faculty_publication_targets_updated_at ON faculty_publication_targets;
CREATE TRIGGER faculty_publication_targets_updated_at
  BEFORE UPDATE ON faculty_publication_targets
  FOR EACH ROW EXECUTE FUNCTION faculty_publication_targets_set_updated_at();

-- ── RLS: DENY-ALL by default ──────────────────────────────────────────────────
-- Rationale: granting "authenticated can SELECT" would allow any logged-in
-- staff member to call supabase.from('faculty_publication_targets').select('*')
-- from the browser and see EVERY faculty member's target — bypassing the
-- server-side emp_id scoping in /api/profile/publication-target/route.ts.
-- This is the same class of RLS information leak fixed in
-- the earlier fix_submissions_rls_leak migration.
--
-- All reads and writes go exclusively through:
--   • Admin API routes  → service-role client, protected by requireAdmin()
--   • Staff profile API → service-role client, scoped server-side to the
--                         logged-in user's own emp_id (client never supplies it)
--
-- The service role bypasses RLS entirely by design — no policies needed.
ALTER TABLE faculty_publication_targets ENABLE ROW LEVEL SECURITY;
-- NO permissive SELECT / INSERT / UPDATE policies for the 'authenticated' role.
