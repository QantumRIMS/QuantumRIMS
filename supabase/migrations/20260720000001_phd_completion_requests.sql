create table phd_completion_requests (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references auth.users(id) not null,
  emp_id text references master_faculty(emp_id) not null,
  previous_type text not null, -- snapshot of type at request time, e.g. 'Doing Ph.D in SECE'
  status text not null default 'pending', -- pending | approved | rejected
  rejection_remark text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table phd_completion_requests enable row level security;

create policy "own_insert_phd_request" on phd_completion_requests
  for insert with check (auth.uid() = applicant_id);
create policy "own_select_phd_request" on phd_completion_requests
  for select using (auth.uid() = applicant_id);
