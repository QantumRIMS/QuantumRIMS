create table project_grant_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references auth.users(id) not null,
  research_project_title text not null,
  funding_agency text,
  project_announcement_details text,
  submission_deadline date,
  co_investigators text,
  collaborating_industry text,
  project_duration_months numeric,
  total_proposed_budget numeric,
  external_reviewer_feedback text,
  expected_outcomes_papers text,
  expected_outcomes_patents text,
  expected_outcomes_infrastructure text,
  additional_resources text,
  proposal_form_url text, -- signed/scanned copy, re-uploaded after download
  status text not null default 'pending',
  rejection_remark text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table project_grant_applications enable row level security;

create policy "own_insert_project_grants" on project_grant_applications
  for insert with check (auth.uid() = applicant_id);

create policy "own_select_project_grants" on project_grant_applications
  for select using (auth.uid() = applicant_id);

create policy "own_update_rejected_project_grants" on project_grant_applications
  for update using (auth.uid() = applicant_id and status = 'rejected')
  with check (auth.uid() = applicant_id and status = 'pending');
create table legacy_phd_holders (
  id uuid primary key default gen_random_uuid(),
  s_no int,
  dept text,
  name text not null,
  created_at timestamptz not null default now()
);
alter table legacy_phd_holders enable row level security;
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
alter table phd_completion_requests rename to profile_edit_requests;

alter table profile_edit_requests
  add column if not exists requested_name text,
  add column if not exists requested_designation text,
  add column if not exists requested_dept text,
  add column if not exists requested_type text,
  add column if not exists previous_name text,
  add column if not exists previous_designation text,
  add column if not exists previous_dept text;

comment on column profile_edit_requests.requested_type is 'Only set when the request includes a PhD/type change; null otherwise.';

-- The policies automatically apply to the renamed table, but if we need to rename them to match the new scope (optional but cleaner):
-- alter policy "own_insert_phd_request" on profile_edit_requests rename to "own_insert_profile_edit_request";
-- alter policy "own_select_phd_request" on profile_edit_requests rename to "own_select_profile_edit_request";
NOTIFY pgrst, 'reload schema';
