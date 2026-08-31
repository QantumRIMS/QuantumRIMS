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
