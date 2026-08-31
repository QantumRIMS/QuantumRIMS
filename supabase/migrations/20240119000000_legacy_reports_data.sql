CREATE TABLE legacy_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  s_no INTEGER,
  authors TEXT,
  title TEXT,
  source_title TEXT,
  volume TEXT,
  issue TEXT,
  year INTEGER,
  doi TEXT,
  link TEXT,
  document_type_scopus TEXT,
  document_type_report TEXT,
  department TEXT,
  faculty_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE legacy_patents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year TEXT,
  department TEXT,
  application_number TEXT,
  status TEXT,
  inventors TEXT,
  title TEXT,
  applicants TEXT,
  filed_date DATE,
  published_or_granted_date DATE,
  publication_or_grant_number TEXT,
  assignee TEXT,
  proof_link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE legacy_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE legacy_patents ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_legacy_pub_year ON legacy_publications(year);
CREATE INDEX idx_legacy_patent_year ON legacy_patents(academic_year);
