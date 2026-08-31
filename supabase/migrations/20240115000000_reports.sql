CREATE TABLE report_manual_stats (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- singleton row
    faculty_phd_percent NUMERIC,
    au_research_supervisors_count INTEGER,
    research_funds_total NUMERIC,
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO report_manual_stats (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE research_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year TEXT NOT NULL,
    department TEXT,
    pi_co_investigator TEXT,
    project_title TEXT NOT NULL,
    project_type TEXT,
    funding_agency TEXT,
    period TEXT,
    grant_amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE report_manual_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_grants ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_research_grants_year ON research_grants(academic_year);
