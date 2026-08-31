-- The incidence columns were removed in the preceding migration and this
-- admin-only RPC no longer has an application consumer. Leaving it behind
-- would keep a broken return contract in the database schema.
drop function if exists public.get_all_topics_admin(integer, integer);
