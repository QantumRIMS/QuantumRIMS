-- Migration: legacy_consultancy table
CREATE TABLE IF NOT EXISTS legacy_consultancy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year TEXT,
    department TEXT,
    project_date DATE,
    faculty_name TEXT,
    project_title TEXT,
    funding_agency TEXT,
    amount NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE legacy_consultancy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for legacy_consultancy"
    ON legacy_consultancy FOR SELECT
    USING (true);

CREATE POLICY "Allow admin all access for legacy_consultancy"
    ON legacy_consultancy FOR ALL
    USING (true)
    WITH CHECK (true);
