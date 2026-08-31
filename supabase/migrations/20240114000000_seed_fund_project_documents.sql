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
