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
