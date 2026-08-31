-- Create master_faculty table
CREATE TABLE master_faculty (
    emp_id TEXT PRIMARY KEY,
    dept TEXT NOT NULL,
    name TEXT NOT NULL,
    designation TEXT NOT NULL,
    type TEXT
);

-- Create submissions table
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    s_no SERIAL,
    authors TEXT,
    title TEXT,
    source_title TEXT,
    volume TEXT,
    issue TEXT,
    year INTEGER,
    doi TEXT UNIQUE,
    scopus_link TEXT,
    doc_type_scopus TEXT,
    doc_type TEXT,
    doc_type_report TEXT,
    department TEXT,
    faculty_name TEXT,
    isbn_no TEXT,
    issn_no TEXT,
    proof_full_paper_url TEXT,
    proof_scopus_url TEXT,
    proof_published_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE master_faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- RLS for master_faculty (public can read)
CREATE POLICY "Public read access for master_faculty"
ON master_faculty FOR SELECT
TO public
USING (true);

-- RLS for submissions (public can insert, authenticated can read/export)
CREATE POLICY "Public insert access for submissions"
ON submissions FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Authenticated read access for submissions"
ON submissions FOR SELECT
TO authenticated
USING (true);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('proofs', 'proofs', true);

-- Storage RLS for proofs (public can upload to any path)
CREATE POLICY "Public insert access for proofs"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'proofs');

CREATE POLICY "Public read access for proofs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'proofs');
