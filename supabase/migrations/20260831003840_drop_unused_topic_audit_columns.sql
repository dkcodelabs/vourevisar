-- Final removal of the retired incidence/search audit payload. No active
-- frontend, Edge Function, view or RPC depends on these columns.
alter table public.topics
  drop column if exists total_volume,
  drop column if exists last_search_context,
  drop column if exists last_used_query,
  drop column if exists last_audit_log,
  drop column if exists last_trend_check_at;
