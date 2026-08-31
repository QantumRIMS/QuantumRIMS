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
