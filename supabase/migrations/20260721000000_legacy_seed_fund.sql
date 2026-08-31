create table legacy_seed_fund_grants (
  id uuid primary key default gen_random_uuid(),
  s_no text,
  academic_year text,
  dept text,
  project_title text,
  faculty_name text,
  duration text,
  amount_sanctioned numeric,
  created_at timestamptz not null default now()
);
alter table legacy_seed_fund_grants enable row level security;
