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
