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
