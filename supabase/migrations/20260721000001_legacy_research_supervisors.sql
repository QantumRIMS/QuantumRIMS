CREATE TABLE IF NOT EXISTS legacy_research_supervisors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year TEXT,
    ref_no TEXT,
    supervisor_name TEXT,
    department TEXT,
    research_area TEXT,
    current_scholars_count INTEGER,
    slots_available INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE legacy_research_supervisors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for legacy_research_supervisors"
    ON legacy_research_supervisors FOR SELECT
    USING (true);

CREATE POLICY "Allow admin all access for legacy_research_supervisors"
    ON legacy_research_supervisors FOR ALL
    USING (
        auth.role() = 'authenticated' AND
        (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'super_admin')
    );
