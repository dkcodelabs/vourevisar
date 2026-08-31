-- Remove the retired incidence metric in one isolated, dependency-ordered migration.
-- The active study flow no longer reads or writes any of these objects.

drop index if exists public.topics_incidence_level_idx;

alter table public.topics
  drop constraint if exists topics_incidence_catalog_id_fkey,
  drop constraint if exists topics_incidence_level_check,
  drop constraint if exists topics_incidence_score_check,
  drop constraint if exists topics_incidence_source_check;

alter table public.topics
  drop column if exists incidence_catalog_id,
  drop column if exists incidence_source,
  drop column if exists incidence_applied_at,
  drop column if exists incidence_context,
  drop column if exists incidence_score,
  drop column if exists incidence_level;

drop table if exists public.edital_incidence_maps;
drop table if exists public.topic_incidence_catalog;

-- Deferred to the final legacy cleanup: total_volume and the audit/query
-- columns are still part of the return contract of get_all_topics_admin.
