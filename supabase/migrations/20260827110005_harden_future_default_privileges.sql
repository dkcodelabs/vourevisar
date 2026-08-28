-- This is deliberately applied to the already-live project after its
-- migration history is aligned. New public objects must receive explicit
-- grants; they must not silently inherit broad API-role access.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;
