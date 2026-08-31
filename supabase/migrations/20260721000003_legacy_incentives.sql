CREATE TABLE IF NOT EXISTS legacy_incentives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incentive_year TEXT,
    department TEXT,
    faculty_name TEXT,
    paper_title TEXT,
    publication_type TEXT,
    received_amount NUMERIC,
    amount_credited_date DATE,
    phd_status TEXT,
    submitted_date DATE,
    date_of_publication DATE,
    file_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE legacy_incentives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for legacy_incentives"
    ON legacy_incentives FOR SELECT
    USING (true);

CREATE POLICY "Allow admin all access for legacy_incentives"
    ON legacy_incentives FOR ALL
    USING (
        auth.role() = 'authenticated' AND
        (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'super_admin')
    );
