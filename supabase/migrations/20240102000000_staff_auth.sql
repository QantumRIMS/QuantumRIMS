-- ============================================================
-- Migration: Staff Authentication
-- Run manually in the Supabase Dashboard → SQL Editor
-- DO NOT run before the code deployment is ready to test.
-- ============================================================

-- 1. Add auth columns to master_faculty
ALTER TABLE master_faculty
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) UNIQUE,
  ADD COLUMN IF NOT EXISTS is_registered BOOLEAN NOT NULL DEFAULT false;

-- 2. Add submitted_by to submissions
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id);

-- 3. Drop old public SELECT policy on master_faculty
DROP POLICY IF EXISTS "Public read access for master_faculty" ON master_faculty;

-- Replace with: authenticated staff can only read their own row
CREATE POLICY "Staff read own faculty row"
ON master_faculty FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 4. Drop old public INSERT policy on submissions
DROP POLICY IF EXISTS "Public insert access for submissions" ON submissions;

-- Replace with: authenticated users can insert
CREATE POLICY "Authenticated insert for submissions"
ON submissions FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Keep existing authenticated SELECT on submissions (unchanged)
-- "Authenticated read access for submissions" already exists — no change needed.

-- 6. Tighten storage: proofs INSERT from public → authenticated
DROP POLICY IF EXISTS "Public insert access for proofs" ON storage.objects;

CREATE POLICY "Authenticated insert access for proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proofs');

-- ============================================================
-- After running: verify in Table Editor that master_faculty
-- now has columns: user_id, is_registered
-- ============================================================
