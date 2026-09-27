-- Add ON UPDATE CASCADE to foreign keys referencing master_faculty

DO $$ 
DECLARE 
  fkey_name_pub_targets TEXT;
  fkey_name_phd_requests TEXT;
BEGIN
  -- Drop constraint on faculty_publication_targets if it exists
  SELECT constraint_name INTO fkey_name_pub_targets
  FROM information_schema.key_column_usage
  WHERE table_name = 'faculty_publication_targets' AND column_name = 'emp_id'
  AND constraint_name LIKE '%fkey%';
  
  IF fkey_name_pub_targets IS NOT NULL THEN
    EXECUTE 'ALTER TABLE faculty_publication_targets DROP CONSTRAINT ' || fkey_name_pub_targets;
  END IF;

  -- Add it back with ON UPDATE CASCADE ON DELETE CASCADE
  ALTER TABLE faculty_publication_targets
  ADD CONSTRAINT faculty_publication_targets_emp_id_fkey 
  FOREIGN KEY (emp_id) REFERENCES master_faculty(emp_id) 
  ON UPDATE CASCADE ON DELETE CASCADE;


  -- Check if phd_completion_requests exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'phd_completion_requests') THEN
    -- Drop constraint on phd_completion_requests if it exists
    SELECT constraint_name INTO fkey_name_phd_requests
    FROM information_schema.key_column_usage
    WHERE table_name = 'phd_completion_requests' AND column_name = 'emp_id'
    AND constraint_name LIKE '%fkey%';
    
    IF fkey_name_phd_requests IS NOT NULL THEN
      EXECUTE 'ALTER TABLE phd_completion_requests DROP CONSTRAINT ' || fkey_name_phd_requests;
    END IF;

    -- Add it back with ON UPDATE CASCADE
    ALTER TABLE phd_completion_requests
    ADD CONSTRAINT phd_completion_requests_emp_id_fkey 
    FOREIGN KEY (emp_id) REFERENCES master_faculty(emp_id) 
    ON UPDATE CASCADE;
  END IF;

END $$;
