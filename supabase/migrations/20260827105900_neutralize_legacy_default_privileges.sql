-- Run before the snapshot. The historical local roles template grants broad
-- privileges to anon/authenticated by default; the snapshot has its own
-- explicit grants and must not inherit extra DML or EXECUTE permissions.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;
