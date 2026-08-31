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
