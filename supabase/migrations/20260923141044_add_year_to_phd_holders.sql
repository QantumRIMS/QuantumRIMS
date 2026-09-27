-- Add academic_year column for year-wise tracking
ALTER TABLE "public"."legacy_phd_holders"
ADD COLUMN IF NOT EXISTS "academic_year" text DEFAULT '2026';