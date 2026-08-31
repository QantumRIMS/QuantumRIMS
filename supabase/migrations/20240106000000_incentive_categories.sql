ALTER TABLE incentive_applications ADD COLUMN h_index INTEGER;
ALTER TABLE incentive_applications ADD COLUMN publisher_tier TEXT CHECK (publisher_tier IN ('springer_elsevier_acm', 'wiley_igi_other'));
ALTER TABLE incentive_applications ADD COLUMN book_type TEXT CHECK (book_type IN ('authored', 'edited'));
ALTER TABLE incentive_applications ADD COLUMN patent_type TEXT CHECK (patent_type IN ('application', 'grant', 'design'));
ALTER TABLE incentive_applications ADD COLUMN patent_forms_confirmed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE incentive_applications ADD COLUMN citation_count INTEGER;
