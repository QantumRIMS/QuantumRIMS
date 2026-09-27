-- Static snapshot table for Publication Target demo
CREATE TABLE IF NOT EXISTS faculty_pub_targets_static (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year     text NOT NULL DEFAULT '2026',
  name              text NOT NULL,
  dept              text NOT NULL,
  sci_target        integer NOT NULL DEFAULT 0,
  sci_achieved      integer NOT NULL DEFAULT 0,
  scopus_target     integer NOT NULL DEFAULT 0,
  scopus_achieved   integer NOT NULL DEFAULT 0,
  conf_target       integer NOT NULL DEFAULT 0,
  conf_achieved     integer NOT NULL DEFAULT 0,
  total_target      integer NOT NULL DEFAULT 0,
  total_achieved    integer NOT NULL DEFAULT 0,
  matched_emp_id    text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE faculty_pub_targets_static ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_fpts_dept_year ON faculty_pub_targets_static(academic_year, dept);
