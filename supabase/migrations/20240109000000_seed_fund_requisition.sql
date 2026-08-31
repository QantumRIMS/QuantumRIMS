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
