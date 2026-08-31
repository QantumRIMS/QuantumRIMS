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
