create table consultancy_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references auth.users(id) not null,
  project_title text not null,
  pi_email text,
  pi_mobile text,
  client_name text,
  client_city text,
  client_state text,
  client_pincode text,
  contact_person_name text,
  contact_designation text,
  contact_email text,
  contact_phone text,
  objectives text,
  nature_of_work text,
  scope_expected_outcomes text,
  deliverables text,
  project_timeline text,
  consultancy_fee numeric,
  payment_terms text, -- 'advance' | 'installments' | 'after_completion'
  payment_terms_schedule text, -- only used when payment_terms = 'installments'
  involves_ip boolean default false,
  requires_ethics_approval boolean default false,
  proposal_form_url text,       -- signed/scanned copy of the auto-generated Proposal Form, re-uploaded
  mou_url text,
  work_monitoring_url text,
  payment_receipt_url text,
  work_expense_report_url text,
  expenditure_documentation_checklist_url text,
  audit_statement_url text,
  agreement_closure_url text,
  revenue_sharing_url text,
  closer_checklist_url text,
  status text not null default 'pending', -- pending | approved | rejected
  rejection_remark text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table consultancy_applications enable row level security;

create policy "own_insert_consultancy" on consultancy_applications
  for insert with check (auth.uid() = applicant_id);

create policy "own_select_consultancy" on consultancy_applications
  for select using (auth.uid() = applicant_id);

create policy "own_update_rejected_consultancy" on consultancy_applications
  for update using (auth.uid() = applicant_id and status = 'rejected')
  with check (auth.uid() = applicant_id and status = 'pending');
