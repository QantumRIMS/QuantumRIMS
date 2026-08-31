-- Drop the existing broad select policy
DROP POLICY IF EXISTS "authenticated_select_submissions" ON submissions;

-- Create the new scoped policy so authenticated staff can only select their own submissions
CREATE POLICY "own_select_submissions" ON submissions
FOR SELECT TO authenticated USING (submitted_by = auth.uid());
