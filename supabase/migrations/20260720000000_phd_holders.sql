create table legacy_phd_holders (
  id uuid primary key default gen_random_uuid(),
  s_no int,
  dept text,
  name text not null,
  created_at timestamptz not null default now()
);
alter table legacy_phd_holders enable row level security;
