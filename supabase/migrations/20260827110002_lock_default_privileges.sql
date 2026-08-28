-- The schema dump contains the legacy remote default-privilege declarations.
-- Keep future migrations least-privilege by requiring explicit grants.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;
