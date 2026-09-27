-- Add is_phd boolean column
ALTER TABLE "public"."legacy_phd_holders"
ADD COLUMN IF NOT EXISTS "is_phd" boolean DEFAULT true;
