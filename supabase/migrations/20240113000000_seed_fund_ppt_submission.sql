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
