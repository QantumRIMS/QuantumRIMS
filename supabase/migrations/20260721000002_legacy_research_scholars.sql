CREATE TABLE IF NOT EXISTS legacy_research_scholars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year TEXT,
    research_centre TEXT,
    supervisor_name TEXT,
    scholar_name TEXT,
    au_registration_number TEXT,
    year_of_registration DATE,
    scholar_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE legacy_research_scholars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for legacy_research_scholars"
    ON legacy_research_scholars FOR SELECT
    USING (true);

CREATE POLICY "Allow admin all access for legacy_research_scholars"
    ON legacy_research_scholars FOR ALL
    USING (
        auth.role() = 'authenticated' AND
        (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'super_admin')
    );
