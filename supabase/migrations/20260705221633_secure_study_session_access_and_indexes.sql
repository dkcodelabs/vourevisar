-- Keep study session history reachable to signed-in users only.
revoke all on table public.study_sessions from anon;
grant select, insert, update, delete on table public.study_sessions to authenticated;
grant select, insert, update, delete on table public.study_sessions to service_role;

-- Cover foreign keys used by cycle/edital joins without indexing null-only rows.
create index if not exists idx_study_sessions_cycle_id
  on public.study_sessions (cycle_id)
  where cycle_id is not null;

create index if not exists idx_study_sessions_edital_id
  on public.study_sessions (edital_id)
  where edital_id is not null;
