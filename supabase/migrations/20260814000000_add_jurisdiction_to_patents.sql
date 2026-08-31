ALTER TABLE legacy_patents ADD COLUMN jurisdiction text;

-- Set default to India for 12-digit application numbers
UPDATE legacy_patents 
SET jurisdiction = 'India' 
WHERE LENGTH(application_number) = 12;

-- Set to 'Unknown' or null for others (default is null, but we can explicitly set 'Unknown' if we want, or leave null. The prompt says: "leave it null/"Unknown" for these 5 specific 7-digit-number records rather than guessing a country for them.")
-- We will leave it as NULL, and the UI will show "Unconfirmed / needs review" if jurisdiction is NULL or 'Unknown'.
