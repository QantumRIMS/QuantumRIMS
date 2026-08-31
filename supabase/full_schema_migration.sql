-- ============================================================
-- CARF Full Schema Migration
-- Generated: 2026-08-29
-- Run this ONCE in a fresh Supabase project SQL Editor.
--
-- PREREQUISITES (enable in new Supabase project first):
-- 1. pgcrypto extension (for gen_random_uuid() on Postgres < 13)
--    -> Supabase enables this by default, but verify under Database > Extensions.
-- 2. uuid-ossp extension (for uuid_generate_v4() used in legacy tables)
--    -> Go to Database > Extensions > search 'uuid-ossp' > Enable it.
-- 3. The 'proofs' and 'seed-fund-scans' Storage Buckets referenced
--    in this script are created via INSERT INTO storage.buckets.
--    These will succeed on a fresh project.
-- 4. The storage.objects RLS policies assume the storage extension
--    is already enabled (it is by default in Supabase).
-- 5. auth.users table: auth schema is managed by Supabase — do not
--    create it manually. All REFERENCES auth.users(id) will work.
-- 6. After running, seed master_faculty separately (see Step 4 in
--    the migration guide) — this script does NOT seed any staff data.
-- ============================================================


-- ============================================================
-- MIGRATION: 20240101000000_init.sql
-- ============================================================

-- Create master_faculty table
CREATE TABLE master_faculty (
    emp_id TEXT PRIMARY KEY,
    dept TEXT NOT NULL,
    name TEXT NOT NULL,
    designation TEXT NOT NULL,
    type TEXT
);

-- Create submissions table
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    s_no SERIAL,
    authors TEXT,
    title TEXT,
    source_title TEXT,
    volume TEXT,
    issue TEXT,
    year INTEGER,
    doi TEXT UNIQUE,
    scopus_link TEXT,
    doc_type_scopus TEXT,
    doc_type TEXT,
    doc_type_report TEXT,
    department TEXT,
    faculty_name TEXT,
    isbn_no TEXT,
    issn_no TEXT,
    proof_full_paper_url TEXT,
    proof_scopus_url TEXT,
    proof_published_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE master_faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- RLS for master_faculty (public can read)
CREATE POLICY "Public read access for master_faculty"
ON master_faculty FOR SELECT
TO public
USING (true);

-- RLS for submissions (public can insert, authenticated can read/export)
CREATE POLICY "Public insert access for submissions"
ON submissions FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Authenticated read access for submissions"
ON submissions FOR SELECT
TO authenticated
USING (true);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('proofs', 'proofs', true);

-- Storage RLS for proofs (public can upload to any path)
CREATE POLICY "Public insert access for proofs"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'proofs');

CREATE POLICY "Public read access for proofs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'proofs');


-- ============================================================
-- MIGRATION: 20240102000000_staff_auth.sql
-- ============================================================

-- ============================================================
-- Migration: Staff Authentication
-- Run manually in the Supabase Dashboard → SQL Editor
-- DO NOT run before the code deployment is ready to test.
-- ============================================================

-- 1. Add auth columns to master_faculty
ALTER TABLE master_faculty
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) UNIQUE,
  ADD COLUMN IF NOT EXISTS is_registered BOOLEAN NOT NULL DEFAULT false;

-- 2. Add submitted_by to submissions
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id);

-- 3. Drop old public SELECT policy on master_faculty
DROP POLICY IF EXISTS "Public read access for master_faculty" ON master_faculty;

-- Replace with: authenticated staff can only read their own row
CREATE POLICY "Staff read own faculty row"
ON master_faculty FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 4. Drop old public INSERT policy on submissions
DROP POLICY IF EXISTS "Public insert access for submissions" ON submissions;

-- Replace with: authenticated users can insert
CREATE POLICY "Authenticated insert for submissions"
ON submissions FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Keep existing authenticated SELECT on submissions (unchanged)
-- "Authenticated read access for submissions" already exists — no change needed.

-- 6. Tighten storage: proofs INSERT from public → authenticated
DROP POLICY IF EXISTS "Public insert access for proofs" ON storage.objects;

CREATE POLICY "Authenticated insert access for proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proofs');

-- ============================================================
-- After running: verify in Table Editor that master_faculty
-- now has columns: user_id, is_registered
-- ============================================================


-- ============================================================
-- MIGRATION: 20240103000000_scope_submissions_rls.sql
-- ============================================================

-- Drop the existing broad select policy
DROP POLICY IF EXISTS "authenticated_select_submissions" ON submissions;

-- Create the new scoped policy so authenticated staff can only select their own submissions
CREATE POLICY "own_select_submissions" ON submissions
FOR SELECT TO authenticated USING (submitted_by = auth.uid());


-- ============================================================
-- MIGRATION: 20240104000000_approval_workflow.sql
-- ============================================================

-- Add new columns for approval workflow
ALTER TABLE submissions ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE submissions ADD COLUMN rejection_remark TEXT;
ALTER TABLE submissions ADD COLUMN reviewed_at TIMESTAMPTZ;

-- Backfill existing rows so old submissions aren't stuck pending
UPDATE submissions SET status = 'approved' WHERE status = 'pending';

-- Allow staff to update their OWN submissions ONLY if they are rejected
CREATE POLICY "own_update_rejected_submissions" ON submissions
FOR UPDATE TO authenticated
USING (submitted_by = auth.uid() AND status = 'rejected')
WITH CHECK (submitted_by = auth.uid());


-- ============================================================
-- MIGRATION: 20240105000000_incentive_module.sql
-- ============================================================

-- Create the incentive applications table
CREATE TABLE incentive_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) UNIQUE,
    applicant_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
    category TEXT NOT NULL CHECK (category IN (
        'sci_journal','esci_scopus_journal','conference','book_chapter',
        'book','patent','citations'
    )),
    author_count INTEGER,
    author_position INTEGER,
    impact_factor NUMERIC,
    journal_quartile TEXT CHECK (journal_quartile IN ('Q1','Q2','Q3','Q4') OR journal_quartile IS NULL),
    self_citation_count INTEGER NOT NULL DEFAULT 0,
    calculated_amount NUMERIC,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    rejection_remark TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE incentive_applications ENABLE ROW LEVEL SECURITY;

-- Trigger to enforce submission ownership and approved status on insert
CREATE OR REPLACE FUNCTION check_incentive_submission_validity()
RETURNS TRIGGER AS $$
DECLARE
    sub_status TEXT;
    sub_owner UUID;
BEGIN
    SELECT status, submitted_by INTO sub_status, sub_owner FROM submissions WHERE id = NEW.submission_id;
    
    IF sub_owner != NEW.applicant_id THEN
        RAISE EXCEPTION 'You can only apply for incentives on your own submissions.';
    END IF;
    
    IF sub_status != 'approved' THEN
        RAISE EXCEPTION 'You can only apply for incentives on approved submissions.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_incentive_submission_validity
BEFORE INSERT ON incentive_applications
FOR EACH ROW
EXECUTE FUNCTION check_incentive_submission_validity();

-- RLS Policies
-- Staff can INSERT their own, trigger ensures validity
CREATE POLICY "own_insert_incentive" ON incentive_applications
FOR INSERT TO authenticated
WITH CHECK (applicant_id = auth.uid());

-- Staff can SELECT their own
CREATE POLICY "own_select_incentive" ON incentive_applications
FOR SELECT TO authenticated
USING (applicant_id = auth.uid());

-- Staff can UPDATE their own, but only if rejected
CREATE POLICY "own_update_rejected_incentive" ON incentive_applications
FOR UPDATE TO authenticated
USING (applicant_id = auth.uid() AND status = 'rejected')
WITH CHECK (applicant_id = auth.uid());


-- ============================================================
-- MIGRATION: 20240106000000_incentive_categories.sql
-- ============================================================

ALTER TABLE incentive_applications ADD COLUMN h_index INTEGER;
ALTER TABLE incentive_applications ADD COLUMN publisher_tier TEXT CHECK (publisher_tier IN ('springer_elsevier_acm', 'wiley_igi_other'));
ALTER TABLE incentive_applications ADD COLUMN book_type TEXT CHECK (book_type IN ('authored', 'edited'));
ALTER TABLE incentive_applications ADD COLUMN patent_type TEXT CHECK (patent_type IN ('application', 'grant', 'design'));
ALTER TABLE incentive_applications ADD COLUMN patent_forms_confirmed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE incentive_applications ADD COLUMN citation_count INTEGER;


-- ============================================================
-- MIGRATION: 20240107000000_performance_indexes.sql
-- ============================================================

-- Performance indexes for Research Publication Portal
-- Run this in the Supabase SQL Editor.
--
-- These indexes support the most common query patterns:
--   - Staff portal: fetch submissions by submitted_by user
--   - Admin: list/filter submissions by status, department, year
--   - Admin: list/filter incentive_applications by status, applicant, submission
--   - Portal layout: resolve faculty by user_id on every page load

-- submissions table
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_by
  ON submissions(submitted_by);

CREATE INDEX IF NOT EXISTS idx_submissions_status
  ON submissions(status);

CREATE INDEX IF NOT EXISTS idx_submissions_department
  ON submissions(department);

CREATE INDEX IF NOT EXISTS idx_submissions_year
  ON submissions(year);

-- Composite: admin's most common query — filter by status, newest-first
CREATE INDEX IF NOT EXISTS idx_submissions_status_created
  ON submissions(status, created_at DESC);

-- master_faculty table
CREATE INDEX IF NOT EXISTS idx_master_faculty_user_id
  ON master_faculty(user_id);

-- incentive_applications table
CREATE INDEX IF NOT EXISTS idx_incentive_applications_applicant_id
  ON incentive_applications(applicant_id);

CREATE INDEX IF NOT EXISTS idx_incentive_applications_submission_id
  ON incentive_applications(submission_id);

CREATE INDEX IF NOT EXISTS idx_incentive_applications_status
  ON incentive_applications(status);

CREATE INDEX IF NOT EXISTS idx_incentive_applications_category
  ON incentive_applications(category);

-- Composite: admin's most common incentive query — filter by status, newest-first
CREATE INDEX IF NOT EXISTS idx_incentive_status_created
  ON incentive_applications(status, created_at DESC);


-- ============================================================
-- MIGRATION: 20240108000000_seed_fund_screening.sql
-- ============================================================

-- Seed Fund Requests table (CFRD/IRSF/01)
CREATE TABLE seed_fund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
  title TEXT NOT NULL,
  funding_agency TEXT,
  announcement_details TEXT,
  pi_name_designation TEXT NOT NULL,
  co_investigators TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_remark TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE seed_fund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own seed fund requests"
  ON seed_fund_requests FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Users can view their own seed fund requests"
  ON seed_fund_requests FOR SELECT
  USING (auth.uid() = applicant_id);

CREATE POLICY "Users can update their own rejected seed fund requests"
  ON seed_fund_requests FOR UPDATE
  USING (auth.uid() = applicant_id AND status = 'rejected')
  WITH CHECK (auth.uid() = applicant_id AND status = 'rejected');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_seed_fund_applicant_id
  ON seed_fund_requests(applicant_id);

CREATE INDEX IF NOT EXISTS idx_seed_fund_status
  ON seed_fund_requests(status);

CREATE INDEX IF NOT EXISTS idx_seed_fund_status_created
  ON seed_fund_requests(status, created_at DESC);


-- ============================================================
-- MIGRATION: 20240109000000_seed_fund_requisition.sql
-- ============================================================

-- Seed Fund Requisitions table (CFRD/SM/RF/01 v2.0)
CREATE TABLE seed_fund_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id UUID NOT NULL REFERENCES seed_fund_requests(id) UNIQUE,
  applicant_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
  title TEXT NOT NULL,
  amount_requested NUMERIC NOT NULL CHECK (amount_requested > 0),
  objectives TEXT NOT NULL,
  expected_utilization TEXT NOT NULL,
  pi_name_designation TEXT NOT NULL,
  co_investigators TEXT,
  proposed_location TEXT,
  duration_months INTEGER,
  reviewer_feedback TEXT,
  expected_outcomes TEXT,
  additional_resources TEXT,
  collaborating_industry TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_remark TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Function to check screening eligibility before insert/update on requisitions
CREATE OR REPLACE FUNCTION check_seed_fund_screening_approved()
RETURNS trigger AS $$
BEGIN
  -- Verify the screening request belongs to the applicant and is approved
  IF NOT EXISTS (
    SELECT 1 FROM seed_fund_requests
    WHERE id = NEW.screening_id
    AND applicant_id = NEW.applicant_id
    AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Invalid screening request: must belong to the applicant and be approved';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_valid_screening_before_requisition
  BEFORE INSERT OR UPDATE OF screening_id ON seed_fund_requisitions
  FOR EACH ROW EXECUTE FUNCTION check_seed_fund_screening_approved();

-- RLS
ALTER TABLE seed_fund_requisitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own seed fund requisitions"
  ON seed_fund_requisitions FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Users can view their own seed fund requisitions"
  ON seed_fund_requisitions FOR SELECT
  USING (auth.uid() = applicant_id);

CREATE POLICY "Users can update their own rejected seed fund requisitions"
  ON seed_fund_requisitions FOR UPDATE
  USING (auth.uid() = applicant_id AND status = 'rejected')
  WITH CHECK (auth.uid() = applicant_id AND status = 'rejected');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_seed_requisitions_applicant_id
  ON seed_fund_requisitions(applicant_id);

CREATE INDEX IF NOT EXISTS idx_seed_requisitions_status
  ON seed_fund_requisitions(status);

CREATE INDEX IF NOT EXISTS idx_seed_requisitions_status_created
  ON seed_fund_requisitions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seed_requisitions_screening_id
  ON seed_fund_requisitions(screening_id);


-- ============================================================
-- MIGRATION: 20240110000000_seed_fund_final_submission.sql
-- ============================================================

-- ============================================================
-- Step 3: Seed Fund Final Submission
-- CFRD/SM/RF/01 — full proposal uploaded as a scanned document
-- ============================================================

-- 1. TABLE
CREATE TABLE IF NOT EXISTS seed_fund_final_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID NOT NULL REFERENCES seed_fund_requisitions(id) UNIQUE,
  applicant_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
  scanned_document_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_remark TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TRIGGER — verify requisition belongs to applicant and is approved
CREATE OR REPLACE FUNCTION check_seed_fund_requisition_approved()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM seed_fund_requisitions
    WHERE id = NEW.requisition_id
      AND applicant_id = NEW.applicant_id
      AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Invalid requisition: must belong to the applicant and be approved';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_valid_requisition_before_final_submission
  BEFORE INSERT OR UPDATE OF requisition_id ON seed_fund_final_submissions
  FOR EACH ROW EXECUTE FUNCTION check_seed_fund_requisition_approved();

-- 3. ROW-LEVEL SECURITY
ALTER TABLE seed_fund_final_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own seed fund final submissions"
  ON seed_fund_final_submissions FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Users can view their own seed fund final submissions"
  ON seed_fund_final_submissions FOR SELECT
  USING (auth.uid() = applicant_id);

-- Only update while status = 'rejected' (re-upload after rejection)
CREATE POLICY "Users can update their own rejected final submissions"
  ON seed_fund_final_submissions FOR UPDATE
  USING (auth.uid() = applicant_id AND status = 'rejected')
  WITH CHECK (auth.uid() = applicant_id AND status = 'rejected');

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_seed_final_applicant_id
  ON seed_fund_final_submissions(applicant_id);

CREATE INDEX IF NOT EXISTS idx_seed_final_status
  ON seed_fund_final_submissions(status);

CREATE INDEX IF NOT EXISTS idx_seed_final_status_created
  ON seed_fund_final_submissions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seed_final_requisition_id
  ON seed_fund_final_submissions(requisition_id);

-- 5. STORAGE BUCKET: seed-fund-scans
INSERT INTO storage.buckets (id, name, public)
VALUES ('seed-fund-scans', 'seed-fund-scans', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload seed fund scans"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'seed-fund-scans');

-- Public read access
CREATE POLICY "Public read access for seed fund scans"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'seed-fund-scans');

-- Allow authenticated users to update/replace their own uploads
CREATE POLICY "Authenticated users can update seed fund scans"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'seed-fund-scans');


-- ============================================================
-- MIGRATION: 20240111000000_seed_fund_consolidation.sql
-- ============================================================

-- Step 1 fields
DROP TABLE IF EXISTS seed_fund_final_submissions CASCADE;
DROP TABLE IF EXISTS seed_fund_requisitions CASCADE;
DROP TABLE IF EXISTS seed_fund_requests CASCADE;

CREATE TABLE seed_fund_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
  
  -- Step 1 fields
  title TEXT NOT NULL,
  funding_agency TEXT,
  announcement_details TEXT,
  pi_name_designation TEXT NOT NULL,
  co_investigators TEXT,
  
  -- Step 2 fields
  amount_requested NUMERIC NOT NULL CHECK (amount_requested > 0),
  objectives TEXT NOT NULL,
  expected_utilization TEXT NOT NULL,
  proposed_location TEXT,
  duration_months INTEGER,
  reviewer_feedback TEXT,
  expected_outcomes TEXT,
  additional_resources TEXT,
  collaborating_industry TEXT,
  
  -- Step 3
  scanned_document_url TEXT NOT NULL,
  
  -- Review
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_remark TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE seed_fund_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own seed fund applications"
  ON seed_fund_applications FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Users can view their own seed fund applications"
  ON seed_fund_applications FOR SELECT
  USING (auth.uid() = applicant_id);

CREATE POLICY "Users can update their own rejected applications"
  ON seed_fund_applications FOR UPDATE
  USING (auth.uid() = applicant_id AND status = 'rejected')
  WITH CHECK (auth.uid() = applicant_id AND status = 'pending');

CREATE INDEX IF NOT EXISTS idx_seed_apps_applicant_id ON seed_fund_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_seed_apps_status ON seed_fund_applications(status);
CREATE INDEX IF NOT EXISTS idx_seed_apps_status_created ON seed_fund_applications(status, created_at DESC);


-- ============================================================
-- MIGRATION: 20240112000000_seed_fund_three_uploads.sql
-- ============================================================

-- Migration: 20240112000000_seed_fund_three_uploads.sql
-- Add multiple document upload support to Seed Fund applications

-- Rename the old column
ALTER TABLE seed_fund_applications 
RENAME COLUMN scanned_document_url TO project_document_url;

-- Add new columns for the auto-generated forms
ALTER TABLE seed_fund_applications 
ADD COLUMN screening_form_url TEXT;

ALTER TABLE seed_fund_applications 
ADD COLUMN requisition_form_url TEXT;

-- Note: We do not add NOT NULL to the new columns at the DB level to avoid breaking existing rows.
-- The application layer will enforce required presence of these fields for new submissions.


-- ============================================================
-- MIGRATION: 20240113000000_seed_fund_ppt_submission.sql
-- ============================================================

-- 20240113000000_seed_fund_ppt_submission.sql
CREATE TABLE seed_fund_ppt_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES seed_fund_applications(id) UNIQUE,
  applicant_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
  ppt_file_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_remark TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE seed_fund_ppt_submissions ENABLE ROW LEVEL SECURITY;

-- Trigger to verify application_id belongs to the applicant and is approved
CREATE OR REPLACE FUNCTION check_ppt_application_validity()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM seed_fund_applications
    WHERE id = NEW.application_id
      AND applicant_id = NEW.applicant_id
      AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Application does not belong to user or is not approved.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER verify_ppt_application_before_insert
  BEFORE INSERT ON seed_fund_ppt_submissions
  FOR EACH ROW
  EXECUTE FUNCTION check_ppt_application_validity();

-- Policies for staff (applicant)
CREATE POLICY "Staff can view own PPT submissions"
  ON seed_fund_ppt_submissions FOR SELECT
  USING (applicant_id = auth.uid());

CREATE POLICY "Staff can insert own PPT submissions"
  ON seed_fund_ppt_submissions FOR INSERT
  WITH CHECK (applicant_id = auth.uid());

CREATE POLICY "Staff can update own rejected PPT submissions"
  ON seed_fund_ppt_submissions FOR UPDATE
  USING (applicant_id = auth.uid() AND status = 'rejected')
  WITH CHECK (applicant_id = auth.uid() AND status = 'pending');

-- Indexes
CREATE INDEX idx_ppt_applicant_id ON seed_fund_ppt_submissions(applicant_id);
CREATE INDEX idx_ppt_status ON seed_fund_ppt_submissions(status);
CREATE INDEX idx_ppt_status_created ON seed_fund_ppt_submissions(status, created_at);
CREATE INDEX idx_ppt_application_id ON seed_fund_ppt_submissions(application_id);


-- ============================================================
-- MIGRATION: 20240114000000_seed_fund_project_documents.sql
-- ============================================================

-- 20240114000000_seed_fund_project_documents.sql
CREATE TABLE seed_fund_project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES seed_fund_applications(id) UNIQUE,
  applicant_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
  release_request_url TEXT,
  deliverable_report_url TEXT,
  additional_release_request_url TEXT,
  completion_report_url TEXT,
  certificate_declaration_url TEXT,
  utilization_certificate_url TEXT,
  closer_checklist_url TEXT,
  incomplete_closure_url TEXT,
  seed_fund_closure_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  rejection_remark TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE seed_fund_project_documents ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION check_seed_docs_validity()
RETURNS TRIGGER AS $$
BEGIN
  -- The application must belong to the caller, AND the linked PPT must be approved
  IF NOT EXISTS (
    SELECT 1 FROM seed_fund_applications a
    JOIN seed_fund_ppt_submissions p ON a.id = p.application_id
    WHERE a.id = NEW.application_id
      AND a.applicant_id = NEW.applicant_id
      AND p.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Application does not belong to user or PPT is not approved.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER verify_seed_docs_before_insert
  BEFORE INSERT ON seed_fund_project_documents
  FOR EACH ROW
  EXECUTE FUNCTION check_seed_docs_validity();

CREATE POLICY "Staff can view own seed fund project documents"
  ON seed_fund_project_documents FOR SELECT
  USING (applicant_id = auth.uid());

CREATE POLICY "Staff can insert own seed fund project documents"
  ON seed_fund_project_documents FOR INSERT
  WITH CHECK (applicant_id = auth.uid());

CREATE POLICY "Staff can update own rejected seed fund project documents"
  ON seed_fund_project_documents FOR UPDATE
  USING (applicant_id = auth.uid() AND status = 'rejected')
  WITH CHECK (applicant_id = auth.uid() AND status = 'pending');

CREATE INDEX idx_seed_docs_applicant_id ON seed_fund_project_documents(applicant_id);
CREATE INDEX idx_seed_docs_status ON seed_fund_project_documents(status);
CREATE INDEX idx_seed_docs_status_created ON seed_fund_project_documents(status, created_at);
CREATE INDEX idx_seed_docs_application_id ON seed_fund_project_documents(application_id);


-- ============================================================
-- MIGRATION: 20240115000000_reports.sql
-- ============================================================

CREATE TABLE report_manual_stats (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- singleton row
    faculty_phd_percent NUMERIC,
    au_research_supervisors_count INTEGER,
    research_funds_total NUMERIC,
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO report_manual_stats (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE research_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year TEXT NOT NULL,
    department TEXT,
    pi_co_investigator TEXT,
    project_title TEXT NOT NULL,
    project_type TEXT,
    funding_agency TEXT,
    period TEXT,
    grant_amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE report_manual_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_grants ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_research_grants_year ON research_grants(academic_year);


-- ============================================================
-- MIGRATION: 20240116000000_add_new_manual_stats.sql
-- ============================================================

ALTER TABLE report_manual_stats ADD COLUMN consultancy_project_total NUMERIC DEFAULT 0;
ALTER TABLE report_manual_stats ADD COLUMN au_research_scholars_count INTEGER DEFAULT 0;


-- ============================================================
-- MIGRATION: 20240116000000_announcements.sql
-- ============================================================

-- ============================================================
-- Announcements feature
-- ============================================================

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN (
    'workshops', 'seminars', 'events', 'deadlines',
    'funding_opportunities', 'general_notices'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  event_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff can read active announcements; all writes are service-role only
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read active announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ----------------------------------------------------------------

CREATE TABLE announcement_reads (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff can read and upsert their own row (no sensitive data)
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own read-receipt"
  ON announcement_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can upsert own read-receipt"
  ON announcement_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own read-receipt"
  ON announcement_reads FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------
-- Indexes
CREATE INDEX idx_announcements_category ON announcements(category);
CREATE INDEX idx_announcements_active_created ON announcements(is_active, created_at DESC);


-- ============================================================
-- MIGRATION: 20240117000000_announcements_v2.sql
-- ============================================================

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


-- ============================================================
-- MIGRATION: 20240118000000_announcement_funding_agency.sql
-- ============================================================

ALTER TABLE announcements ADD COLUMN funding_agency TEXT;


-- ============================================================
-- MIGRATION: 20240119000000_legacy_reports_data.sql
-- ============================================================

CREATE TABLE legacy_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  s_no INTEGER,
  authors TEXT,
  title TEXT,
  source_title TEXT,
  volume TEXT,
  issue TEXT,
  year INTEGER,
  doi TEXT,
  link TEXT,
  document_type_scopus TEXT,
  document_type_report TEXT,
  department TEXT,
  faculty_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE legacy_patents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year TEXT,
  department TEXT,
  application_number TEXT,
  status TEXT,
  inventors TEXT,
  title TEXT,
  applicants TEXT,
  filed_date DATE,
  published_or_granted_date DATE,
  publication_or_grant_number TEXT,
  assignee TEXT,
  proof_link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE legacy_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE legacy_patents ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_legacy_pub_year ON legacy_publications(year);
CREATE INDEX idx_legacy_patent_year ON legacy_patents(academic_year);


-- ============================================================
-- MIGRATION: 20240120000000_add_date_to_publications.sql
-- ============================================================

ALTER TABLE legacy_publications 
ADD COLUMN publication_date DATE,
ADD COLUMN publication_month TEXT;


-- ============================================================
-- MIGRATION: 20240121000000_fix_submissions_rls_leak.sql
-- ============================================================

DROP POLICY IF EXISTS "Authenticated read access for submissions" ON submissions;


-- ============================================================
-- MIGRATION: 20240122000000_announcement_registration_link.sql
-- ============================================================

-- Add registration_link to announcements table
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS registration_link TEXT;


-- ============================================================
-- MIGRATION: 20260717154219_consultancy_applications.sql
-- ============================================================

create table consultancy_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references auth.users(id) not null,
  project_title text not null,
  pi_email text,
  pi_mobile text,
  client_name text,
  client_city text,
  client_state text,
  client_pincode text,
  contact_person_name text,
  contact_designation text,
  contact_email text,
  contact_phone text,
  objectives text,
  nature_of_work text,
  scope_expected_outcomes text,
  deliverables text,
  project_timeline text,
  consultancy_fee numeric,
  payment_terms text, -- 'advance' | 'installments' | 'after_completion'
  payment_terms_schedule text, -- only used when payment_terms = 'installments'
  involves_ip boolean default false,
  requires_ethics_approval boolean default false,
  proposal_form_url text,       -- signed/scanned copy of the auto-generated Proposal Form, re-uploaded
  mou_url text,
  work_monitoring_url text,
  payment_receipt_url text,
  work_expense_report_url text,
  expenditure_documentation_checklist_url text,
  audit_statement_url text,
  agreement_closure_url text,
  revenue_sharing_url text,
  closer_checklist_url text,
  status text not null default 'pending', -- pending | approved | rejected
  rejection_remark text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table consultancy_applications enable row level security;

create policy "own_insert_consultancy" on consultancy_applications
  for insert with check (auth.uid() = applicant_id);

create policy "own_select_consultancy" on consultancy_applications
  for select using (auth.uid() = applicant_id);

create policy "own_update_rejected_consultancy" on consultancy_applications
  for update using (auth.uid() = applicant_id and status = 'rejected')
  with check (auth.uid() = applicant_id and status = 'pending');


-- ============================================================
-- MIGRATION: 20260717224200_add_female_faculty_percent.sql
-- ============================================================



-- ============================================================
-- MIGRATION: 20260718000000_project_grant_applications.sql
-- ============================================================

create table project_grant_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references auth.users(id) not null,
  research_project_title text not null,
  funding_agency text,
  project_announcement_details text,
  submission_deadline date,
  co_investigators text,
  collaborating_industry text,
  project_duration_months numeric,
  total_proposed_budget numeric,
  external_reviewer_feedback text,
  expected_outcomes_papers text,
  expected_outcomes_patents text,
  expected_outcomes_infrastructure text,
  additional_resources text,
  proposal_form_url text, -- signed/scanned copy, re-uploaded after download
  status text not null default 'pending',
  rejection_remark text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table project_grant_applications enable row level security;

create policy "own_insert_project_grants" on project_grant_applications
  for insert with check (auth.uid() = applicant_id);

create policy "own_select_project_grants" on project_grant_applications
  for select using (auth.uid() = applicant_id);

create policy "own_update_rejected_project_grants" on project_grant_applications
  for update using (auth.uid() = applicant_id and status = 'rejected')
  with check (auth.uid() = applicant_id and status = 'pending');


-- ============================================================
-- MIGRATION: 20260720000000_phd_holders.sql
-- ============================================================

create table legacy_phd_holders (
  id uuid primary key default gen_random_uuid(),
  s_no int,
  dept text,
  name text not null,
  created_at timestamptz not null default now()
);
alter table legacy_phd_holders enable row level security;


-- ============================================================
-- MIGRATION: 20260720000001_phd_completion_requests.sql
-- ============================================================

create table phd_completion_requests (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references auth.users(id) not null,
  emp_id text references master_faculty(emp_id) not null,
  previous_type text not null, -- snapshot of type at request time, e.g. 'Doing Ph.D in SECE'
  status text not null default 'pending', -- pending | approved | rejected
  rejection_remark text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table phd_completion_requests enable row level security;

create policy "own_insert_phd_request" on phd_completion_requests
  for insert with check (auth.uid() = applicant_id);
create policy "own_select_phd_request" on phd_completion_requests
  for select using (auth.uid() = applicant_id);


-- ============================================================
-- MIGRATION: 20260720000002_profile_edit_requests.sql
-- ============================================================

alter table phd_completion_requests rename to profile_edit_requests;

alter table profile_edit_requests
  add column if not exists requested_name text,
  add column if not exists requested_designation text,
  add column if not exists requested_dept text,
  add column if not exists requested_type text,
  add column if not exists previous_name text,
  add column if not exists previous_designation text,
  add column if not exists previous_dept text;

comment on column profile_edit_requests.requested_type is 'Only set when the request includes a PhD/type change; null otherwise.';

-- The policies automatically apply to the renamed table, but if we need to rename them to match the new scope (optional but cleaner):
-- alter policy "own_insert_phd_request" on profile_edit_requests rename to "own_insert_profile_edit_request";
-- alter policy "own_select_phd_request" on profile_edit_requests rename to "own_select_profile_edit_request";


-- ============================================================
-- MIGRATION: 20260721000000_legacy_seed_fund.sql
-- ============================================================

create table legacy_seed_fund_grants (
  id uuid primary key default gen_random_uuid(),
  s_no text,
  academic_year text,
  dept text,
  project_title text,
  faculty_name text,
  duration text,
  amount_sanctioned numeric,
  created_at timestamptz not null default now()
);
alter table legacy_seed_fund_grants enable row level security;


-- ============================================================
-- MIGRATION: 20260721000001_legacy_research_supervisors.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS legacy_research_supervisors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year TEXT,
    ref_no TEXT,
    supervisor_name TEXT,
    department TEXT,
    research_area TEXT,
    current_scholars_count INTEGER,
    slots_available INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE legacy_research_supervisors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for legacy_research_supervisors"
    ON legacy_research_supervisors FOR SELECT
    USING (true);

CREATE POLICY "Allow admin all access for legacy_research_supervisors"
    ON legacy_research_supervisors FOR ALL
    USING (
        auth.role() = 'authenticated' AND
        (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'super_admin')
    );


-- ============================================================
-- MIGRATION: 20260721000002_legacy_research_scholars.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS legacy_research_scholars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year TEXT,
    research_centre TEXT,
    supervisor_name TEXT,
    scholar_name TEXT,
    au_registration_number TEXT,
    year_of_registration DATE,
    scholar_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE legacy_research_scholars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for legacy_research_scholars"
    ON legacy_research_scholars FOR SELECT
    USING (true);

CREATE POLICY "Allow admin all access for legacy_research_scholars"
    ON legacy_research_scholars FOR ALL
    USING (
        auth.role() = 'authenticated' AND
        (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'super_admin')
    );


-- ============================================================
-- MIGRATION: 20260721000003_legacy_incentives.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS legacy_incentives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incentive_year TEXT,
    department TEXT,
    faculty_name TEXT,
    paper_title TEXT,
    publication_type TEXT,
    received_amount NUMERIC,
    amount_credited_date DATE,
    phd_status TEXT,
    submitted_date DATE,
    date_of_publication DATE,
    file_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE legacy_incentives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for legacy_incentives"
    ON legacy_incentives FOR SELECT
    USING (true);

CREATE POLICY "Allow admin all access for legacy_incentives"
    ON legacy_incentives FOR ALL
    USING (
        auth.role() = 'authenticated' AND
        (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'super_admin')
    );


-- ============================================================
-- MIGRATION: 20260802000001_legacy_consultancy.sql
-- ============================================================

-- Migration: legacy_consultancy table
CREATE TABLE IF NOT EXISTS legacy_consultancy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year TEXT,
    department TEXT,
    project_date DATE,
    faculty_name TEXT,
    project_title TEXT,
    funding_agency TEXT,
    amount NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE legacy_consultancy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for legacy_consultancy"
    ON legacy_consultancy FOR SELECT
    USING (true);

CREATE POLICY "Allow admin all access for legacy_consultancy"
    ON legacy_consultancy FOR ALL
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- MIGRATION: 20260803000000_add_is_duplicate_to_publications.sql
-- ============================================================

ALTER TABLE legacy_publications 
ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false;


-- ============================================================
-- MIGRATION: 20260814000000_add_jurisdiction_to_patents.sql
-- ============================================================

ALTER TABLE legacy_patents ADD COLUMN jurisdiction text;

-- Set default to India for 12-digit application numbers
UPDATE legacy_patents 
SET jurisdiction = 'India' 
WHERE LENGTH(application_number) = 12;

-- Set to 'Unknown' or null for others (default is null, but we can explicitly set 'Unknown' if we want, or leave null. The prompt says: "leave it null/"Unknown" for these 5 specific 7-digit-number records rather than guessing a country for them.")
-- We will leave it as NULL, and the UI will show "Unconfirmed / needs review" if jurisdiction is NULL or 'Unknown'.


-- ============================================================
-- MIGRATION: 20260821000001_add_publication_date_to_submissions.sql
-- ============================================================

-- Add publication_date to submissions table
-- This allows staff to record when their paper was published.
-- Month is derived server-side from this date.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS publication_date DATE;


-- ============================================================
-- MIGRATION: 20260828000000_funding_agencies.sql
-- ============================================================

CREATE TABLE funding_agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  s_no integer,
  section text CHECK (section IN ('National', 'International')),
  agency_name text NOT NULL,
  website text,
  contact_details text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Note: Seeding data will be handled by an initialization script rather than migration file, 
-- or we can inject it right here if it's not too long. Since 153 rows is about 1500 lines, 
-- let's write a node script to generate the INSERT statement and append it to this file.

-- Seed Data
INSERT INTO funding_agencies (s_no, section, agency_name, website, contact_details) VALUES
  (1, 'National', 'Aeronautical Development Agency (ADA)', 'https://www.ada.gov.in/', 'Aeronautical Development Agency Ministry of Defence, PBNo: 1718 Vimanapura Post Bengaluru – 560017, India Phone : 080-25233060/25087002 Fax : 080-25238493'),
  (2, 'National', 'Aeronautical Research & Development Board (DRDO-ARDB)', 'https://https://drdo.gov.in/aeronautics', 'AR&DB Secretariat, Ministry of Defence (R&D), A Wing, DRDO Bhawan, New Delhi -110 011 Secretary AR & DB, 323, Tel: 011-26131576-78,80 Email: ardb@hqr.drdo.in'),
  (3, 'National', 'Agricultural Produce Cess Fund (APCF)', 'http://www.icar.org.in/', 'Director General (ICAR) ICAR, Krishi Bhawan, New Delhi-110 001 Tel: 91-11-23382629, 91-11-23386711 Fax: 91-11-23384773 E-mail: opcf@vsnl.net.in'),
  (4, 'National', 'Agriculture and processed Food Products (APEDA)', 'http://apeda.gov.in/apedawebsite/index.html', '3rd Floor, NCUI Building 3, Siri Institutional Area, August Kranti Marg, (Opp. Asiad Village), New Delhi – 110 016, India Phone: 91-11-26513204, 26513219, 26514572, 26526196 / 98, 26534186, 26534870, 26850301 Fax: 91-11-26526187 E-mail: headq@apeda.gov.in'),
  (5, 'National', 'All India Council for Technical Education (AICTE)', 'http://www.aicte-india.org/', 'Adviser-II,RID Bureau, All India Council for Technical Education, NBCC Building, East Wing, 4th Floor, Pragati Vihar, Bhisham Pitamah Marg, New Delhi –110 003,Telefax No: (011) 24369632, E-mail: rid@aicte.ernet.in'),
  (6, 'National', 'Animal Husbandry, Dairying & Fisheries (AHDF)', 'http://dahd.nic.in', 'Deptt. of Animal Husbandry Joint Commissioner ( Meat & Meat Products), Dept. of Animal Husbandry & Dairy, Ministry of Agriculture, Govt. of India, Jawahar Lal Nehru Building, Gate no. 322,'),
  (7, 'National', 'Atomic Energy Regulatory Board (AERB)', 'http://www.aerb.gov.in/', 'Atomic Energy Regulatory Board Niyamak Bhavan, Anushaktinagar, Mumbai Tel: 22-25990100 Fax: 22-25583230 Email:webmaster@aerb.gov.in'),
  (8, 'National', 'Board of Research in Nuclear Sciences (BRNS)', 'https://brns.res.in/', '1st Floor, Central Complex, BARC, Trombay, Mumbai Tel:022 2559 0813 Email: helpdesk.brns@barc.gov.in brns.symp@barc.gov.in'),
  (9, 'National', 'British Council (BC)', 'www.bc.res.in', '17 Kasturba Gandhi Marg, New Delhi Tel: 0120-4569000 / 6684353 Fax: 11 2371 0717 Email:Aastha.Jindal@ britishcouncil.org'),
  (10, 'National', 'Building Materials & Technology Promotion Council (BM&TPC)', 'http://www.bmtpc.org/', 'Ministry of Housing & Urban Affairs, Government of India, Core 5 -A, First Floor , India Habitat Centre, Lodi Road, New Delhi- 110 003, India Phone: 91-11-24636705, 24638097 Fax: 91-11-24642849 E-mail: info@bmtpc.org'),
  (11, 'National', 'Center for Educational Testing & Evaluation (CET&E)', 'https://cete.ku.edu/', '1122 West Campus Road, 735 Joseph R. Pearson Hall,Lawrence, KS 66045-7575 Tel: 785-864-3537 Fax: 785-864-3566 Email: cetesubmissions@ku.edu.'),
  (12, 'National', 'Central Power Research Institute (CPRI)', 'http://www.cpri.in/', 'CENTRAL POWER RESEARCH INSTITUTE Prof.Sir C.V.Raman Road,Post Box No: 8066, SadaShiva Nagar (p.o), Bangalore,India , Pincode : 560 080 Phone : +91-80-23602457 Fax : +91-80-23601213 Email : dgcpri@cpri.in'),
  (13, 'National', 'Centre for Wind Energy Technology (CWET)', 'http://niwe.res.in/', 'The Director,National Institute of Wind Energy, Pallikaranai, Chennai Tel: 044-22463982 / 22463983/29001167 Fax : 044-2246 3980'),
  (14, 'National', 'Chennai Petroleum Corporation Limited (CPCL)', 'https://www.cpcl.co.in/', '536, Anna Salai, Thiru Vi Ka Kudiyiruppu, Teynampet, Chennai Tel: 044 2434 9519'),
  (15, 'National', 'Central Institute of Classical Tamil (CICT)', 'https://www.cict.in/index_english.ph', 'The Director Central Institute of Classical Tamil Institute of Road Transport Campus Plot No:40, 100 Feet Road, Taramani, Chennai – 600113. E-mail: director@cict.in, registrar@cict.in Tel:044 – 22540124, 22540125 Fax : 044 – 22540143'),
  (16, 'National', 'Combat Vehicles Research and Development Establishment (CVRDE)', 'https://drdo.gov.in/labs-and-establish', 'Director, Combat Vehicles Research & Development Estt. (CVRDE) Avadi, Chennai – 600054 Tel. No. : 044-26383722, 044-26364001 Fax : 044-26385112, 044-26383661 Email : director@cvrde.drdo.in'),
  (17, 'National', 'Commissioner of Horticulture and Plantation Crops (CH&PC)', 'http://tnhorticulture.tn.gov.in/horti/tnhorticulture/doh', 'DIRECTORATE OF HORTICULTURE AND PLANTATION CROPS 3rd Floor, Agriculture complex, Ezhilagam, Chepauk, Chennai- 600 005. Tel: 044 4262 6222'),
  (18, 'National', 'Consumer Protection through Science & Technology (CPTST)', 'http://www.scienceandsociety-dst.org', 'The Head, Science for Equity, Empowerment & Development (SEED) Division, Department of Science & Technology, Systems Division, Technology Bhawan, New Mehruali Road, New Delhi – 110016 Tel: 011-26864570, 011-26590355 Fax: 26864570 Email: chander.m@nic.in'),
  (19, 'National', 'Consumer Welfare Fund (CWF)', 'http://consumeraffairs.nic.in', 'Ministry of Civil Supplies, Krishi Bhavan, New Delhi Tel: 011-23485793 Fax: 011-23485793 E-mail:ccwf@vsnl.net.in'),
  (20, 'National', 'Corporation of Chennai', 'http://www.chennaicorporation.gov.in/', 'Greater Chennai Corporation, Ripon Building, Chennai -600003. Tel: 044-25619300 Email: specialofficer@chennai'),
  (21, 'National', 'Council for Advancement of Peoples Action and Rural Technology (CAPART)', 'http://capart.nic.in/', 'India Habitat Centre, Zone-V-A, 2nd Floor, Lodhi Road, New Delhi Tel: 11-24642391/93 Fax: 11-2464 8607 E-mail: helpdesk@capart.nic.in'),
  (22, 'National', 'Council of Scientific and Industrial Research (CSIR)', 'http://www.csir.res.in', 'The Head, Human Resource Development Group Council of Scientific and Industrial Research, CSIR Complex, Anusandhan Bhawan, 2 Rafi Ahmed Kidwai Marg, New Delhi – 110001 Tel: +91-11-23737889 E-mail: csircx@nda.vsnl.net.in'),
  (23, 'National', 'Defence Research & Development Establishment (DRDE)', 'https://www.drdo.gov.in/labs-and-est', 'Defence Research & Development Establishment (DRDE), Defence Research & Development Organisation, Govt. Of India, Ministry of Defence Jhansi Road, Gwalior-474002 Phone : 0751-2341550, 0751-2340730 Fax : 0751-2341148 Email : director@drde.drdo.in'),
  (24, 'National', 'Defence Research & Development Laboratory (DRDL)', 'https://www.drdo.gov.in/labs-and-est', 'Director, Defence Research & Development Laboratory, Kanchanbagh Hyderabad-500058 Phone : 0091 40 24583000 Fax : 040-24340109 E-mail ID : director@drdl.drdo.in'),
  (25, 'National', 'Defence Research and Development Organisation (DRDO)', 'http://www.drdo.gov.in', 'Ministry of Defence, B Wing, Sena Bhavan, New Delhi Tel: 011-23017661 Fax: 011-23017582 E-mail: erip_er@hqr.drdo.in'),
  (26, 'National', 'Department of Animal Husbandry (DAH)', 'http://www.dahd.nic.in', 'Ministry of Agriculture, Jawahar Lal Nehru Building, Gate no. 322, Ist Floor, New Delhi Tel: 011- 24459732 Fax: 011- 24459732 E-mail: ahd@vsnl.net.in'),
  (27, 'National', 'Department of Atomic Energy (DAE)', 'http://www.dae.nic.in/brns', 'The Scientific Secretary (BRNS), Department of Atomic Energy, Directors office, Ist Floor, Central Complex, BARC, Mumbai- 400 085. Tel: 91-22-25590813 Fax: 91-22-25505050 e-mail: brns@barc.gov.in'),
  (28, 'National', 'Department of Biotechnology (DBT)', 'http://www.dbtindia.nic.in', 'The Director ( R& D), Department Biotechnology, Block no. 2, Floor 7, Room no. 12, CGO Complex, Lodhi Road, New Delhi 110 003. e-mail: Shaila@dbt.nic.in Tel: 011-24363748 Fax: 011-24362884'),
  (29, 'National', 'Department of Chemicals & Petrochemicals (DC&P)', 'http://www.chemicals.nic.in', '344, A-wing, 3rd floor, Shastri Bhawan, New Delhi Tel: No.23386752'),
  (30, 'National', 'Department of Education (DOEd)', 'http://www.mhrd.gov.in', 'The Deputy Education Adviser (T), Division TD, VI, Department of Education, Ministry of Human Resource Development, ShastriBhawan, New Delhi. e-mail:dhe-mhrd@nic.in Fax: 011-2382365/23011097/2384093 Tel: 011- 23782296/23383936-44'),
  (31, 'National', 'Department of Electronics and Information Technology (DEIT)', 'http://meity.gov.in/', 'Ministry of Electronics and Information Technology (Government of India) Electronics Niketan, 6, CGO Complex, Lodhi Road, New Delhi – 110003 E-mail : webmaster[at] meity[dot] gov[dot]in Phone No : +91-11-24301851, 11-24361951 Fax : +91-11-24364799'),
  (32, 'National', 'Department of Food Processing Industries, Govt. of India (DFPI)', 'http://www.mofpi.nic.in', 'Ministry of Agriculture, Department of Food Processing Industries, PanchsheelBhawan, ; August Karant iBhawan, New Delhi 110049. Email: spim-pi@nic.in Fax: 011- 26492863,26493228 Tel: 011-26492216, 26492174, 26492476'),
  (33, 'National', 'Department of Information Technology (DIT)', 'http://www.delhi.gov.in/wps/wcm/connect/DoIT_IT/doit_it/homehttps://dot.gov.in/circular-and-notifications/2323', 'Ministry of Communications Department of Telecommunications Sanchar Bhawan, 20 Ashoka Road New Delhi- 110001 Tel: 011-23372071'),
  (34, 'National', 'Department of Non Conventional Energy Sources (DNES)', 'http://www.mnre.gov.in', 'The Secretary, Department of Non Conventional Energy Sources, Block No. 14, CGO Complex, Lodhi Road, New Delhi, 110003 e-mail: aktripathi@nic.in Fax: 011- 24362772/24361298 Tel: 24361481/24362772'),
  (35, 'National', 'Department of Ocean Technology (DOT)', 'www.dod.nic.in', 'The Director ,Ocean Research & Manpower Development Programme Department of Ocean Development ,Block 12, CGO Complex, Lodi Road New Delhi – 110 003 ,Tel. No.: (011) 24306839, 24362278 ,Fax No.: (011) 24360336,24360779 E-mail: venkat@dod.delhi.nic.in'),
  (36, 'National', 'Department of Science and Technology (DST)', 'http://www.dst.gov.in/', 'The Secretary, Department of Science and Tecnology, Govt. of India,Technology Bhawan, New Mehrali Road, New Delhi Tel: 011- 23012312, 23017660,26864570 Fax: 011-23016857 E-mail: dstinfo@nic.in'),
  (37, 'National', 'Department of Scientific & Industrial Research (DSIR)', 'http://www.dsir.gov.in/', 'Department of Scientific & Industrial Research ,Ministry of Science & Technology Technology Bhawan, New Mehrali Road, New Delhi – 110016 Tel: 011-26567373, 26864570, 26516078 Fax: 26567373 / 26516078 E-mail: taas@alpha.nic.in'),
  (38, 'National', 'Department of Space (DOS)', 'http://www.dos.gov.in', 'The Scientific Secretary, ISRO Headquarters, F-Block, AntarikshBhavan, New BEL Road, Bangalore. 560 094 Fax: ( +91 )80 23511984 Tel: (+91)80 23415275 e-mail: scientificsecretary@isro.gov.in'),
  (39, 'National', 'European Union', 'https://europa.eu/european-union/ind', 'Rue de la Loi / Wetstraat, 175 B-1048 Bruxelles/Brussel Belgique/België Tel:00 800 67 89 10 11'),
  (40, 'National', 'Forests Research Institute Group Coordinator (Research) (FRIGR)', 'http://www.fridu.edu.in/', 'Forest Research Institute, Post Office New Forest, Dehradun e-mail: hooda@icfre.org, groupco_fri_icfre. org Tel: 0135 – 2752670, Fax: 0135 – 2756865 EBPAX No. 2757021-26 Extn. 4316'),
  (41, 'National', 'Haryana Operational Pilot Project (HOPP)', 'http://agriharyana.nic.in/hopp.htm', 'H.No. 239, Sector 4, Puanchkula (Haryana) Tel: 0172-2764538 Fax: 0172-2764538 E-mail: hopp@hry.nic.in'),
  (42, 'National', 'Haryana State Council for Science & Technology (HSCST)', 'http://www.dstharyana.org', 'Sedtor-2, Panchkula, (Haryana) Tel: 0172-2563439, 2560339 Fax: 0172-2560018'),
  (43, 'National', 'Indian Council of Agricultural Research (ICAR)', 'http://www.icar.org.in/', 'Krishi Bhavan, Dr.Rajender Prasad Road, New Delhi Tel: 91-11-25841760 Fax: 91-11-25843932 E-mail: ddgedn@icar.org.in'),
  (44, 'National', 'Life Sciences Research Board (LSRB)', 'http://www.icmr.nic.in/', 'Agricultural Produce Cess Fund ICAR, Krishi Bhawan, New Delhi Tel: 11- 2388991 Fax: 11- 238899 E-mail:opcf@vsnl.net.in'),
  (45, 'National', 'Indian Council of Social Science Research (ICSSR)', 'http://www.icssr.vsnl.net.in', 'Box. 10528, Aruna Asaf Ali Marg, New Delhi Tel: 011- 26321689 Fax: 26321689 E-mail: icssr@ride. vsnl.net.in'),
  (46, 'National', 'Indian Council of Medical Research (ICMR)', 'www.icmr.nic.in', 'Director General, Indian Council of Medical Research , V. Ramalingaswami Bhawan ,Post Box No. 4911, Ansari Nagar , New Delhi- 110029 , Tel.No: 91-11-26588895, 91-11-26588980 ,91-11-26588707, 91-11-26589794, 91-11-26589336 ,Fax: 91-11- 26588662 ,E-mail: icmrhqds@sansad.nic.in'),
  (47, 'National', 'Indian Institute of Maize Research (IIMR)', 'http://www.iimr.res.in/', 'Directorate of Maize Research, ICAR, PUSA, New Delhi Tel: 011- 25795543 Fax: 011- 25795543 E-mail:mrd@vsnl.net.in'),
  (48, 'National', 'Indian Institute of Rice Research (IIRR)', 'http://www.drricar.org/', 'Directorate of Rice Research, ICAR, Rajender Nagar, Hyderabad Tel: 040- 25406879-80 Fax: 040- 25406879 E-mail: rrd@ernet.com'),
  (49, 'National', 'Indian National Centre for Ocean Information Services (INCOIS)', 'http://www.incois.gov.in/portal/index', '“Ocean Valley”, Pragathi Nagar (BO), Nizampet (SO), Telangana Tel: +91-40-23886000 Fax: +91-40-23892910'),
  (50, 'National', 'Indian National Committee on Irrigation & Drainage (INCI&D)', 'http://www.insaindia.res.in/', 'Bahadur Shah, Zafar Marg, Delhi Tel: 11-23221931-1950 Fax: 23235648'),
  (52, 'National', 'Indian Space Research Organisation (ISRO)', 'http://www.isro.gov.in/', 'Antariksh Bhavan, New BEL Road, Bangalore Tel: 22172264 / 22172260'),
  (53, 'National', 'Indira Gandhi Centre for Atomic Research (IGCAR)', 'http://www.igcar.ernet.in/', 'Department of Atomic Energy, Kalpakkam Tel: (044)-27480066 / (044)-27481179 Fax: (044)-27480066'),
  (54, 'National', 'Indo French Centre for the Promotion of Advanced Research (IFCPAR)', 'http://www.cefipra.org/', '5B, Ground Floor, India Habitat Centre, Lodhi Road, New Delhi Tel: 11 2468 2251 / 2463 3567 Fax: 11 2464 8632'),
  (55, 'National', 'India Meteorological Department (IMD)', 'www.imd.gov.in', 'The Director General of Meteorology Antarctic & Project Evaluation Cell, DGM’s Office India Meteorological Department (IMD) Mausam Bhawan, Lodi Road, New Delhi – 110 003 Tel. No: (011) 24618241 to 7 Extn. 4318 Fax: (011) 24699216, 24623220 E-mail: apec@mail.imdmail.gov.in'),
  (56, 'National', 'Industrial Management and Training Institute (IMTI)', 'https://imti.edu/', '233 Mill St #1, Waterbury, CT 06706, USA Tel: +1 203-753-7910'),
  (57, 'National', 'Instrument Development Programme ( IDP)', 'web:www.scienceandsociety-dst.org', 'The Adviser, Instrument Dev. Division, Dept. of Sci.& Technology, Technology Bhawan, New Mehrauli Road, New Delhi 110016. Tel: 011-26864577 Fax:011-26864577'),
  (58, 'National', 'Integrated Child Development Services (ICDS)', 'http://wcd.nic.in/schemes/integrated-', 'Ministry of Women and Child Development, Government of India Shastri Bhawan, New Delhi 011-23381611 nic-mwcd@gov.in'),
  (59, 'National', 'Intensification of Research in High Priority Areas (IRHPA)', 'http://www.serb.gov.in', 'The Adviser, STP, Department of Sci. & Technology, Technology Bhawan, New mehrauli Road, New Delhi.-110 016 e-mail: sunilag@alpha.nic.in Fax: 26864570, 26863847 Tel: 011- 26567373'),
  (60, 'National', 'Inter-University Accelerator Centre (IUAC)', 'http://www.iuac.res.in/', 'Aruna Asaf Ali Marg, Near Vasant Kunj, New Delhi Tel: 011-2689-3955 / 9232 / 9233 Fax: 011-2689-3666'),
  (61, 'National', 'International Advanced Research Centre for Powder Metallurgy & New Materials (IARCPM&NM)', 'https://www.arci.res.in/', 'Balapur P.O., Hyderabad, Telangana Tel: 040-2445 2200 Fax: 040-2444 2699'),
  (62, 'National', 'International Council for Local Environmental Initiatives (ICEI)', 'http://www.iclei.org/', 'Ground Floor, NSIC-STP Complex, NSIC Bhawan, Okhla Industrial Estate, New Delhi Tel:11 4106 7220 Fax: 11 4106 7221'),
  (63, 'National', 'International Federation for Women in Agriculture (IFWA)', 'https://www.ifad.org/', 'Division of Agricultural Extension, ICAR, New Delhi Tel: 11-23387293 Fax : 11-23387293 E-mail: ifwa@vsnl.net.in'),
  (64, 'National', 'International Foundation for Science (IFS)', 'http://www.ifs.se', 'Grev Turegatan 19, S.114 38, STOCKHOLM, SWEDEN Tel: 46 545 81800 Fax: +46 8 545 818 01 E-mail: info@ifs.se'),
  (65, 'National', 'International Maize and Wheat Improvement Center (UM&WIC)', 'http://www.cimmyt.org', 'Rice Wheat Consortium, CIMMYT Office for India CG Block, NASC Complex, Dev Prakash Shastri Marg, New Delhi Tel:011-274436678 Fax: 274436678 E-mail: cimmyt@vsnl.net.in'),
  (66, 'National', 'Life Sciences Research Board (LSRB)', 'https://www.drdo.gov.in/life-sciences-research-board/about-us', 'Member Secretary, LSRB Defence Research & Development Organization Ministry of Defence Room No. 399, 3rd Floor, DRDO HQrs, DRDO Bhawan, Rajaji Marg, New Delhi-110011 Phone : 011-23007894 Fax : 011-23012652 Email ID : lsrb@hqr.drdo.in'),
  (67, 'National', 'Ministry of Agriculture (MoA)', 'http://www.agricoop.nic.in', 'The Commissioner of Agriculture, Ministry of Agriculture, New Delhi Tel: 23383370, 23782691 Fax: 23792037 E-mail: secy-agri@nic.in'),
  (68, 'National', 'Ministry of Coal & Mines (MCM)', 'www.scienceandtech.cmpdi.co.in', 'General Manager (S&T) , Central Mine Planning & Design Institute Department of Coal ,Gondwana Place, Konke Road Ranchi – 834 008 ,(Jharkhand) ,Tel. No: (0651) 2231148 Fax. No: (0651) 2231447, E-mail: cmpdihq@cmpdi.co.in'),
  (69, 'National', 'Ministry of Defence (MD)', 'http://www.mod.nic.in/', 'Room No 155, E-Block, Ministry of Defence, New Delhi.'),
  (70, 'National', 'Ministry of Earth Sciences (MES)', 'http://www.moes.gov.in/', 'Prithvi Bhavan, Opp. India Habitat Centre, Lodhi Road, New Delhi Phone : +91-11-24669578'),
  (71, 'National', 'Ministry of Environment & Forests (MEOF)', 'http://www.moef.nic.in/', 'The Secretary, Govt of India, Ministry of Environment and Forests, Paryavaran Bhawan, CGO Complex, Lodhi Road, New Delhi-110 003. Tel: 011-258586422 Fax: 011-24364594. E-mail: ef@vsnl.net.in, sv.godavarthi@nic.in'),
  (72, 'National', 'Ministry of Food Processing Industries (MoFPI)', 'http://www.mofpi.nic.in', 'Ministry of Food Processing Industries Panchsheel Bhawan, August Kranti Marg Khelgaon, New Delhi-110049 Fax No. 011-26493228 EPBAX No. 011-26492216/ 26492174/ 26493227/ 26490933'),
  (73, 'National', 'Ministry of Food & Civil Supplies (MoF&CS)', 'http://www.fcs.vsnl.net.in', 'Consumer Affairs & Public Distribution, New Delhi Tel: 011-25544338 Fax: 011-25544338 E-mail: fcs@vsnl.net.in'),
  (74, 'National', 'Ministry of Health and Family Welfare (MoHFW)', 'http://mohfw.nic.in/', '5th Floor (509, 518), A Wing, Nirman Bhawan, Maulana Azad Road, New Delhi E-mail: dirstat-mohfw@nic.in'),
  (75, 'National', 'Ministry of Human Resource Development (MoHRD)', 'http://mhrd.gov.in/', 'Shastri Bhawan, New Delhi Tel: +91-11-23782698 Fax: +91-11-23382365'),
  (76, 'National', 'Ministry of New and Renewable Energy (MoNRE)', 'http://mnre.gov.in/', 'Block-14, CGO Complex, Lodhi Road, New Delhi Tel: 011-24360404, 24360707 Fax: 011-24361298'),
  (77, 'National', 'Ministry of Petroleum & Natural Gas (MoP&NG)', 'http://www.petroleum.nic.in/', 'Shastri Bhavan, New Delhi Tel: 23386118 / 23093004'),
  (78, 'National', 'Ministry of Power (MoP)', 'http://powermin.nic.in/', 'Shram Shakti Bhawan, New Delhi'),
  (79, 'National', 'Ministry of Railways (MoR)', 'http://www.indianrailways.gov.in/railwayboard/', 'Ministry of Railways E-mail ID : contentmanager@rb.railnet.gov.in'),
  (80, 'National', 'Ministry of Rural Development (MoRD)', 'http://rural.nic.in/netrural/rural/index', 'Krishi Bhavan, Dr. Rajendra Prasad Road, New Delhi Tel: 11-23386411 Email: shuklas@nic.in'),
  (81, 'National', 'Ministry of Small Scale Industries (MSSI)', 'http://msme.gov.in/', 'Room No 123, Udyog Bhawan, Rafi Marg, New Delhi Tel: 011-23061431 E-mail :js.sme@nic.in'),
  (82, 'National', 'Ministry of Micro, Small and Medium Enterprises (MSME)', 'https://msme.gov.in/', 'Director (HR), Web Information Manager Ministry of Micro, Small and Medium Enterprises Room No 356 A, Udyog Bhawan, Rafi'),
  (83, 'National', 'Ministry of Social Justice& Empowerment (MSJE)', 'http://socialjustice.nic.in/', 'Room.No.636, ‘A’ Wing, Shastri Bhawan, Dr. Rajendra Prasad Road, New Delhi Tel: 23383256 Fax: 23386320 E-mail: gyanendrakr.d@nic.in'),
  (84, 'National', 'Ministry of Statistics and Programme Implementation (MSPI)', 'http://www.mospi.nic.in', 'Sardar Patel Bhawan, Parliament Street, New Delhi Tel: 011-26876772 Fax : 011-26876772 E-mail: kmashish@nic.in'),
  (85, 'National', 'Ministry of Textiles (MT)', 'http://texmin.nic.in/', 'NIC, Ministry of Textiles, Udyog Bhavan, New Delhi.'),
  (86, 'National', 'Ministry of Urban Development (MUD)', 'http://mohua.gov.in/', 'Ministry of Housing and Urban Affairs Nirman Bhawan, Maulana Azad Road, New Delhi – 110011. Email: secyurban[at]nic[dot]in Tel: 23062377, Fax: 23061459'),
  (87, 'National', 'Ministry of Water Resources (MWR)', 'http://www.wrmin.nic.in/', '626, Shram Shakti Bhawan, Rafi Marg, New Delhi E-mail: egov-mowr@nic.in'),
  (88, 'National', 'M/S Monsanto Enterprises Ltd.,', 'web:http://www.monsanto.com', 'The Managing Director, M/S Monsanto Enterprises Ltd., 1017-Vishal Tower, Janakpuri District Centre, Jamalpuri, New Delhi. Fax: 011-23348432 Tel: 011-23348432 e-mail: arun.gopalakrishnan @monsanto.com'),
  (89, 'National', 'M/S Ayantia Crop Science', 'web:http://www.bayergroupindia.com/', 'The Managing Director, M/S Ayantia Crop Science, Aventias House, 54A, Andheri KurlaRoad, Andheri (E), Mumbai 400 093 e-mail: nilesh.limaye@bayer.com Fax: 022-26488732 Tel: 022-26488732'),
  (90, 'National', 'National Academy of Agricultural Sciences (NAAS)', 'http://www.naasindia.org', 'DPS Marg, Pusa, New Delhi Tel: 11-25846051/52 Fax: 11-25846051 E-mail: naas@vsnl.com'),
  (91, 'National', 'National Aerospace Laboratory (NAL)', 'http://www.nal.res.in/', 'PB 1779, Bangalore Tel: 80-25273351-54 / 25223351-54 Fax: 80-25260862'),
  (92, 'National', 'National Bank For Agriculture And Rural Development (NBAARD)', 'https://www.nabard.org', 'Plot no. 3, Sector 34-A, Chandigarh Fax: 0172-665863 Email: nabchg@x400.niigw.nic.in'),
  (93, 'National', 'National Board for Higher Mathematics (NBHM)', 'http://www.nbhm.dae.gov.in/', 'Department of Atomic Energy, 1st floor, O.Y.C.Building, C.S.M. Marg, Mumbai Email: msnbhm@dae.gov.in'),
  (94, 'National', 'National Centre for Medium Range Weather Forecasting (NCMRWF)', 'http://www.ncmrwf.gov.in/', 'Ministry of Earth Sciences, A-50, Sector-62, NOIDA Tel: +91-120-2419401 Fax: +91-120-2419484'),
  (95, 'National', 'National Council for Economic Research and Training (NCERT)', 'http://www.iccw.vsnl.net.in', 'NCERT, Aurobindo Marg, New Delhi Tel: 011-28532233 Fax: 011-28532233 E-mail: iccw@vsnl.net.in'),
  (96, 'National', 'National Horticulture Board (NHB)', 'http://www.nhb.gov.in/', 'Ministry of Agriculture, 85,Institutional Area, Sector 18, Gurgaon Tel: 0124-2432560 Fax: 0124-2432560 E-mail: ednib@delhi.nic.in'),
  (97, 'National', 'National Information System for Science & Technology (NISSAT)', 'http://www.dsir.gov.in', 'The Joint Adviser, National Information System for Sci.& Technology, Department of Scientific & Industrial Research, Technology Bhawan,Mehrauli Road, New Delhi e-mail: sunilag@alpha.nic.in Fax: 26567373 Tel: 011-26567373'),
  (98, 'National', 'National Innovations on Climate Resilient Agriculture (NICRA)', 'http://www.nicra-icar.in/nicrarevised', 'ICAR, Krishi Anusandhan Bhavan –II, Pusa Road, New Delhi Tel:91-11-25848364'),
  (99, 'National', 'National Institute of Ocean Technology (NIOT)', 'https://www.niot.res.in', 'Narayanapuram, Pallikaranai, Chennai Tel: 044-66783300 Fax: 044-22460275 / 22460645'),
  (100, 'National', 'National Institute of Public Cooperation and Child', 'http://www.nipccd.vsnl.com', '5-Siri Institutional Area, Hauz Khas, New Delhi Tel: 011-27654216,17'),
  (101, 'National', 'National Medicinal Plants Board (NMPB)', 'http://www.nmpb.nic.in', 'National Medicinal Plants Board, Ministry of AYUSH, Government of India Indian Red Cross Society (IRCS), Annexe Building, 1st & 2nd floor,1 Red Cross Road, New Delhi-110001, Tel : 011-23721840 E-Mail ID : info-nmpb@nic.in'),
  (102, 'National', 'National Oilseeds and Vegetable Oils Development Board (NO&VODB)', 'http://www.novod.res.in', 'Ministry of Agriculture, 86, Sector 18, Industrial Area, Gurgaon Tel: 0124-2341251 Fax: 2340614 E-mail: novod@vsnl.net.in'),
  (103, 'National', 'Natural Resources Data Management System (NRDMS)', 'http://nrdms.gov.in', 'The Director ( NRDMS), Department of Science & Technology, Technology Bhawan, New Mehrauli Road, New Delhi – 110 016 Tel: 011-27894302 Fax: 011-27894302'),
  (104, 'National', 'Naval Research Board (NRB)', 'http://nrbdrdo.res.in', 'Room No-322, 3rd Floor, DRDO HQ, DRDO Bhawan, Rajaji Marg, New Delhi Tel: 011-23007322 Fax No : 011-2301 6640'),
  (105, 'National', 'Newton – Bhabha Fund (Brithish Council)', 'http://www.newtonfund.ac.uk/about/abut-partnering-countries/india/', 'British Council, The United Kingdom’s international organisation for cultural relations and educational opportunities. A registered charity: 209131 (England and Wales) SCO37733 (Scotland) Email: Aastha.Jindal@britishcouncil.org'),
  (106, 'National', 'Oil and Natural Gas Corporation Limited (ONGC)', 'http://www.ongcindia.com/wps/wcm/connect/ongcindia/home/', '5, Nelson Mandela Marg, Vasant Kunj, New Delhi Fax No: 011-261 29091 Email: editorspeak@ongc.co.in'),
  (107, 'National', 'Oil Industry Development Board (OIDB)', 'http://www.oidb.gov.in/', '3rd Floor, Tower C, 73, Noida Fax No. 0120-2594630'),
  (108, 'National', 'Opportunities for Young Scientists', 'www.scienceandsociety-dst.org', 'The Head, SERC Secretariat, Depat. Of Sci. & Technology, Technology Bhawan, New Mehrauli Road, New Delhi 110 016. Tel: 011-27894302, Fax: 011-27894302'),
  (109, 'National', 'Petroleum Conservation Research Association (PCRA)', 'http://www.pcra.org/', 'PCRA, Sanrakshan Bhavan, 10 – Bhikaji Cama Place, New Delhi Tel: 91-11-26198856 Fax: 91-11-26109668 Email : pcra@pcra.org'),
  (110, 'National', 'Research Scheme Applied to River Valley Projects (RSARVR) CENTRAL BOARD OF IRRIGATION AND POWER (CBIP)', 'http://www.cbip.org', 'Central Board of Irrigation & Power, Malcha Marg, Chanakyapuri,New Delhi Tel: 011-2611 5984 Fax: 011-6116347 E-mail: cbip@nda.vsnl.in'),
  (111, 'National', 'Research Scheme on Flood Control (RSFC)', 'www.rsfc.vsnl.net.in', 'The Member Secretary, Central Board of Irrgation and Power, Malcha Marg, Chanakyapuri, New Delhi 110 021 Fax: 26853687 Tel: 011- 26853687'),
  (112, 'National', 'Research Scheme on Power (RSOP)', 'http://www.cpri.in/r-a-d-schemes/research-scheme/research-scheme-on', 'Joint Director(R&D) , Central Power Research Institute ,Ministry of Power, P B No.8066, Sadashiva Nagar (PO),Bangalore -560 080 Tel: 080-2360 7823, (080) 23605367 , Fax: +91- 80-2360 7823, Fax No: (080) 23601213 E-mail: sundar@cpri.in, babu@powersearch.cpri.res.in'),
  (113, 'National', 'Rural Development & Panchayat Raj (RD&PR)', 'http://www.tnrd.gov.in/', 'Fort. St. George, Chennai Tel: 044 25665566 E-mail: ruralsec@tn.gov.in'),
  (114, 'National', 'R&D Medium Range Weather Forecasting ( NCMRWF) and Crop Weather Relationships', 'http://www.scienceandsociety-dst.org', 'The Project Coordinator (NCMRWF), Dept. of Sci.& Technology, Technology Bhawan, New Mehrauli Rod, New Delhi 110 016 Fax: 011-26854442, Tel: 011-26854442'),
  (115, 'National', 'Science and Engineering Research Board (SERB)', 'http://www.serb.gov.in/home.php', '5 & 5A, Lower Ground Floor, Vasant Square Mall, Sector-B, Pocket-5, Vasant Kunj, New Delhi Tel: 11–40000398'),
  (116, 'National', 'Science and Engineering', 'http://www.dst.gov.in', 'The Adviser & Member – Secretary, SERC Secretariat, Department of Science & Technology, Technology Bhawan,'),
  (117, 'National', 'Science and Technology Application for Rural Development (STARD) Science and Society Related Programmes', 'web:www.scienceandtechnology-dst-org', 'The Head, Sci.& Society Division, Dept. of Sci. & Technology, Technology Bhavan, New Mehrauli Road, New Delhi – 110 016, e-mail: sunilag@alpha.nic.in Fax: 26864570, 26863847, 26862418 , Tel: 011-26567373 Extn. 298/208'),
  (118, 'National', 'Science & Technology for Weaker Sections (STAWS). Science and Society Related Programmes', 'www.scienceandsociety.dst.org.', 'The Head, Sci.& Society Division, Dept. of Sci. & Technology, Technology Bhavan, New Mehrauli Road, New Delhi – 110 016 , e-mail: sunilag@alpha.nic.in Fax:26864570, 26863847, 26862418 Tel:011-26567373 extn. 298/208'),
  (119, 'National', 'Science for Equity, Empowernment and Development (SEED) Division', 'http://www.scienceandsociety-dst.org/women1.htm', 'Technology Bhavan, New Mehrauli Road, New Delhi Tel:011-26567373 Fax: 26864570 E-mail:nisha67@alpha.nic.in'),
  (120, 'National', 'Science & Technology Communication & Popularisation Programme (STC&PP)', 'http://www.scienceandsociety.dst.org', 'The Director, ( NCSTC), Department of Sci. & Technology, Technology Bhawan, New Mehrauli Road, New Delhi 110 016 Fax: 011-27894302, Tel: 011-27894302'),
  (121, 'National', 'Science & Technology indicator and Manpower Studies', 'www.scienceandsociety-dst.org.', 'The Joint Adviser, National Sci. & Technology Management Information System ( NSTMIS), Department of Sci. & Technology, Technology Bhawan, New Mehrauli Road, New Delhi 110 016. Tel:011-26863847, Fax: 011-26863847'),
  (122, 'National', 'Scheme for modernization and renewal of obsolescence in technical education (MODROBS), (Only for private colleges)', 'https://www.aicte-india.org/(OR)https://www.aicte-india.org/search/google/MODROBS', 'All Indian Council for Technical Education, I.G. Sports Complex Estate, New Delhi 11 00 02 e-mail: jpg@aicte.ernet.in Fax: 234876647, 234876647 Tel: 011- 234876647'),
  (123, 'National', 'Scheme of thrust area programme in technical education(TAPTEC) (Only for private colleges) All Indian Council for Technical Education,', 'https://www.aicte-india.org/(OR)https://www.aicte-india.org/search/google/TAPTEC', 'All Indian Council for Technical Education, I.G. Sports Complex Estate, New Delhi 11 00 02 e-mail: jpg@aicte.ernet.in Fax: 234876647, 234876647 Tel: 011- 234876647'),
  (124, 'National', 'Solutions for Environmental contrasts in Coastal Areas (SECOA)', 'https://www.cosmopolis.be/people', 'Vrije Universiteit Brussel Department of Geography Faculty of Sciences Pleinlaan 2 BE-1050 Brussels'),
  (125, 'National', 'Space Applications Centre (SAC)', 'http://www.sac.gov.in/Vyom/index.js', 'Jodhpur Tekra, Ambawadi Vistar P.O. Ahmedabad Tel: +91-79-26913401 E-mail: pro@sac.isro.gov.in'),
  (126, 'National', 'Special Component Plan (SCP)', 'http://www.scienceandsociety.dst.org', 'The Head, Sci. & Society Division, Dept. of Sci.& Technology, Technology Bhavan, New Mehrauli Road New Delhi-110016. Fax: 26863847, Tel:011-26863847'),
  (127, 'National', 'State Planning Commission (SPC)', 'http://www.spc.tn.gov.in/', 'STATE PLANNING COMMISSION Ezhilagam , Chepauk, Chennai-600 005 (PBX No 28545471) e-mail : tnspc@tn.nic.in'),
  (128, 'National', 'Tamil Nadu State Council for Science and Technology (TNSCST)', 'https://www.tanscst.nic.in/index.html', 'MEMBER SECRETARY Tamilnadu State Council for Science and Technology, Sardar Patel Road, DOTE Campus, Chennai 600 025 Tamilnadu, INDIA. Phone : +91 44 2230 1428 Telefax : +91 44 2230 1552 E-mail : ms.tanscst@nic.in enquiry.tanscst@nic.in'),
  (129, 'National', 'Tamil Virtual Academy (TVA)', 'http://www.tamilvu.org/', 'Anna University Campus, Gandhi Mandapam Road, Kottur, Chennai Tel: 044-2220 9400 Fax: 044-2220 9405 E-mail:tva@tn.gov.in'),
  (130, 'National', 'Tamilnadu Forest Plantation Corporation Limited (TFPCL)', 'http://www.tafcorn.tn.gov.in/', '30, Gandhimandapam Road, Kotturpuram, Chennai Tel: 044-24473303 Fax: 044-24473303 E-Mail: cmntafcorn@dataone.in'),
  (131, 'National', 'Tamilnadu Medicinal Plant Farms & Herbal Medicine Corporation Ltd (TMPF&HMCL)', 'http://www.tampcol.in/', 'C 29, SIDCO Indl Estate, Alathur, Thiruporur via, Kancheepuram Tel: 044–27444438 Fax: 27444458 E-mail: customerservice@tampcol.in'),
  (132, 'National', 'Tamilnadu Pollution Control Board (TPCB)', 'http://www.tnpcb.gov.in/', '76, Mount Salai, Guindy, Chennai Tel: 22353134-139 Fax:044-22353068 E-mail: tnpcb-chn@gov.in'),
  (133, 'National', 'Tata Institute of Fundamental Research (TIFR)', 'http://www.tifr.res.in/', 'Homi Bhabha Road, Navy Nagar, Colaba, Mumbai Tel: 22-2278-2000 Fax: 22-2280-4610'),
  (134, 'National', 'Tata Steel Limited (TSL)', 'http://www.tatasteel.com/', 'Tata Steel Limited 3rd Floor, One Forbes 1, Dr V B Gandhi Marg, Fort, Mumbai – 400 001, India. (OR) Bombay House, 24, Homi Mody Street, Fort, Mumbai – 400001 Tel: 022-66658282 Fax: 022-66658144, 66657774'),
  (135, 'National', 'Technology Absorption and Adaptation Scheme (TAAS)', 'http://www.dsir.gov.in', 'The Joint Adviser ( TAAS), Department of Scientific &Inds. Research, Technology Bhawan, New Mehrauli Road, New Delhi 110 016 e-mail: taas@alpha.nic.in Fax: 26567373, 26864570 Tel: 011-26567373, 26864570'),
  (136, 'National', 'Technology, Information, Forecasting and Assessment Council (TIF&AC)', 'http://www.tifac.org.in/', 'Technology Information Forecasting and Assessment Council, Department of Science and Technology (DST) ‘A’ Wing Vishwakarma Bhavan Shaheed Jeet Singh Marg New Delhi 110016, India. +91-11-26592600, 42525600 +91-11-26961158 Email:ed@tifac.org.in'),
  (137, 'National', 'Agriculture Department, Chandigarh.', 'www.agriharyana.nic.in', 'The Commisioner& Secretary Agriculture, Govt. of Haryana, Agriculture Department, Chandigarh.e-mail: agriharyana2009@gmail.com Fax: 0172- 2703490 Tel: 0172- 2703490'),
  (138, 'National', 'Utilisation of Scientific Expertise of Retired Scientists Science and Society Related Programmes (USERSSSRP)', 'https://indiabioscience.org/grants/utilisation-of-the-scientific-expertise-of-retired-scientists-users', 'India Bioscience National Centre for Biological Sciences, GKVK Campus, Bellary Road, Bangalore, Karnataka, India 560065 Phone: 91 80 23666223 Email: hello@indiabioscience.org'),
  (139, 'National', 'UGC-DAE Consortium for Scientific Research (UGC-DAE)', 'http://www.csr.res.in/', 'The Director, UGC-DAE Consortium for Scientific Research, University Campus, Khandwa Road, Indore 452017, INDIA Email: director@csr.res.in, Tel:91-731-2463945, 91-731-2463913, 2762267, 2908150, Fax : 91-731-2462294'),
  (140, 'National', 'UGC Faculty Research Promotion Scheme (UGC-FRPS) (Start-Up Grant, Mid-Career Award, BSR Faculty Fellowship)', 'http://ugcfrps.ac.in/uohyd/', 'National Coordinator UGC Faculty Research Promotion Schemes School of Chemistry, University of Hyderabad Central University P.O. Prof. C.R.Rao Road, Gachibowli Hyderabad-500046 (T.S), India. Email :nc.ugcfrps@uohyd.ac.in'),
  (141, 'National', 'United Nations Children’s Fund (UNCF)', 'http://unicef.in/', '73 Lodi Estate, New Delhi Tel: 11 2469-0401 Fax: 011 2462-7521 E-mail: newdelhi@unicef.org'),
  (142, 'National', 'University Grants Commission (UGC)', 'http://www.ugc.ac.in/', 'The Secretary, University Grants Commission, Bahadur Shah Zafar Marg New Delhi – 110002 ,Tel. No: (011) 23234019, 23236350 Fax. No.: (011) 23239659'),
  (143, 'International', 'International Foundation for Science (IFS)', 'http://www.ifs.se', 'Director, International Foundation for Science, Grev Turegatan 19, S.114 38, STOCKHOLM, SWEDEN , email: info@ifs.se. , Tel: 46 545 81800'),
  (144, 'International', 'Tennessee Valley Authority (TVA)', 'https://www.tva.gov/', '400 West Summit Hill Drive, Knoxville TN 37902 Tel: (865) 632-2101 E-mail: tvainfo@tva.com'),
  (145, 'International', 'The World Academy of Sciences (WAS)', 'https://twas.org/', 'Executive Director, Third World Academy of Sciences (TWAS), c/o the Abdus Salam International Centre for Theoretical Physics, ( ICTP) P.O. Box 586, Via Beirut 6, 34100 Trieste, Italy. Tel: +39040 2240387 Fax:+39 040 224559 E-mail: info@twas.org'),
  (146, 'International', 'Third World Network of Scientific Organizations (TWNSO)', 'http://www.twnso.org/', 'The Third World Network of Scientific organizations, (TWNSO), c/0 The Abdus Salam International Centre for Theoretical Physics ( ICTP) StradaCpstoera 11- 340 14 Trieste, Italy Tel: +39 040 2240-683 Fax: +39 040 2240 689 E-mail:info@twnso.org'),
  (147, 'International', 'Animal Production & Health Division', 'web:http://www.iaea.org', 'Animal Production & Health Division, International Atomic Energy Agency, P.O. Box. 100, A-1400, Vienna (Austria ). e-mail: Official.Mail@iaea.org Fax: (+43-1) 2600-7 Tel: (+43-1) 2600-0'),
  (148, 'International', 'United Nations Educational, Scientific and Cultural Organisation (UNESCO)', 'http://en.unesco.org/', 'Office of the Secretary-General’s Envoy on Youth One UN Plaza, DC-1, 2nd Floor. New York, NY 10017 E-mail: youthenvoy@un.org'),
  (149, 'International', 'India-Republic of Korea Joint Applied R&D Programme 2014 Funding (IRKJAR&DP)', 'https://dst.gov.in/callforproposals/call-proposals-under-india-republic-korea-joint-programme-cooperation-0', 'Scientist, International Cooperation Department of Science & Technology New Mehrauli Road, New Delhi – 110 016 (OR) Researcher, Asia Cooperation Team Center for International Affairs National Research Foundation of Korea Tel : +82-2-3460-5704'),
  (150, 'International', 'Deutsche Forschungsgemeinsc', 'https://www.dfg.de/en/', 'Deutsche Forschungsgemeinschaft (DFG) German Research Foundation'),
  (151, 'International', 'Indo-US Science & Technology Forum (IUSSTF)', 'https://www.iusstf.org/', 'Fulbright House, 12 Hailey Road, New Delhi-110001, India Tel: +91-11-42691700 , 23321552'),
  (152, 'International', 'UK India Education and Research Initiative (UKIERI)', 'http://www.ukieri.org/', 'UKIERI Secretariat-India British Council 17 Kasturba Gandhi Marg New Delhi 110001 image+91 11 4149 7384 / 7336 / 7252 imageukieri@britishcouncil.org'),
  (153, 'International', 'Global Innovation Technology Alliance (GITA)', 'https://gita.org.in/', 'Lord SK Bhattacharyya Centre 249-F, Udyog Vihar-Phase IV, Scetor-18 Gurugram, Haryana 122015, India Tel: +0124-4014063 +91 11 4288 8003 gita@gita.org.in'),
  (154, 'International', 'DAAD- German Academic Exchange Service (Indo-German)', 'https://www.daad.de/en/https://www.daad.in/ic-chennai', 'Deutscher Akademischer Austauschdienst e.V. (DAAD), Kennedyallee 50, D-53175 Bonn Tel.: +49 228 882-0 Fax: +49 228 882-444 E-Mail: postmaster@daad.de (OR) DAAD Information Centre Chennai 20/10, Jaganathan Road, B Block 1st Floor Nungambakkam, Chennai 600034, India Phone: +91 (44) 2827-14 42 Phone: +91 (44) 2827-14 50 E-Mail: chennai@daadindia.org');
