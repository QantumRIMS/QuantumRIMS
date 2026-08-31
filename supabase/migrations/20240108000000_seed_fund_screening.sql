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
