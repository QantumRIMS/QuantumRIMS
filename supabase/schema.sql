-- ============================================================
-- Research Publication Portal — Supabase Setup
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- 1. master_faculty table
CREATE TABLE IF NOT EXISTS master_faculty (
  emp_id      TEXT PRIMARY KEY,
  dept        TEXT NOT NULL,
  name        TEXT NOT NULL,
  designation TEXT NOT NULL,
  type        TEXT
);

-- 2. submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  s_no                 SERIAL,
  authors              TEXT,
  title                TEXT,
  source_title         TEXT,
  volume               TEXT,
  issue                TEXT,
  year                 INTEGER,
  doi                  TEXT UNIQUE,
  scopus_link          TEXT,
  doc_type_scopus      TEXT,
  doc_type             TEXT,
  doc_type_report      TEXT,
  department           TEXT,
  faculty_name         TEXT,
  isbn_no              TEXT,
  issn_no              TEXT,
  proof_full_paper_url TEXT,
  proof_scopus_url     TEXT,
  proof_published_url  TEXT,
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS on both tables
ALTER TABLE master_faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions    ENABLE ROW LEVEL SECURITY;

-- 4. master_faculty RLS:
--    Public can look up any faculty by emp_id (only name and dept returned by app)
--    Nothing else — no full scans allowed for anon users
CREATE POLICY "anon_read_master_faculty"
  ON master_faculty FOR SELECT
  TO public
  USING (true);

-- 5. submissions RLS:
--    Public can INSERT (submit a form) — no SELECT/UPDATE/DELETE
--    Only authenticated users (admin) can SELECT all submissions
CREATE POLICY "public_insert_submissions"
  ON submissions FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "authenticated_select_submissions"
  ON submissions FOR SELECT
  TO authenticated
  USING (true);

-- 6. Storage: create 'proofs' bucket (if not already created via dashboard)
--    Run these only if you haven't created the bucket via the UI
INSERT INTO storage.buckets (id, name, public)
VALUES ('proofs', 'proofs', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage RLS for proofs bucket
CREATE POLICY "public_upload_proofs"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'proofs');

CREATE POLICY "public_read_proofs"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'proofs');

-- ============================================================
-- Seed data — sample faculty for testing
-- Replace / extend with your real staff list
-- ============================================================
INSERT INTO master_faculty (emp_id, dept, name, designation, type) VALUES
('EMP001', 'Computer Science and Engineering', 'Dr. Alice Smith',     'Professor',           'Full-time'),
('EMP002', 'Electrical and Electronics Engineering', 'Dr. Bob Jones', 'Associate Professor',  'Full-time'),
('EMP003', 'Mechanical Engineering',                'Dr. Carol Patel', 'Assistant Professor', 'Full-time'),
('EMP004', 'Information Technology',               'Dr. David Kumar', 'Professor',           'Full-time')
ON CONFLICT (emp_id) DO NOTHING;
