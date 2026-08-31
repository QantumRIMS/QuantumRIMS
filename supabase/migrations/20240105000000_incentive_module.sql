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
