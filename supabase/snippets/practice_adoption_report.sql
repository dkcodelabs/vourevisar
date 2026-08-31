-- Relatório agregado de adoção, qualidade e custo do Treino.
-- Não retorna identificadores, nomes, e-mails, prompts ou respostas privadas.
-- Ajuste apenas a data inicial antes de executar no SQL Editor.
with
params as (
  select timestamptz '2026-08-28 00:00:00+00' as window_start
),
sessions as (
  select
    session.id,
    session.user_id,
    session.status,
    session.created_at,
    coalesce(session.signal_snapshot->>'origin', 'unknown') as origin
  from public.practice_sessions session, params
  where session.created_at >= params.window_start
),
session_attempts as (
  select attempt.session_id, count(*)::int as attempts
  from public.practice_attempts attempt, params
  where attempt.invalidated_at is null
    and attempt.created_at >= params.window_start
  group by attempt.session_id
),
session_base as (
  select session.*, coalesce(attempt.attempts, 0) as attempts
  from sessions session
  left join session_attempts attempt on attempt.session_id = session.id
),
user_days as (
  select user_id, count(distinct created_at::date)::int as active_days
  from sessions
  group by user_id
),
adoption as (
  select jsonb_build_object(
    'users_started', count(distinct user_id),
    'sessions_created', count(*),
    'sessions_with_attempt', count(*) filter (where attempts > 0),
    'sessions_completed', count(*) filter (where status = 'completed'),
    'completion_rate', round(100.0 * count(*) filter (where status = 'completed') / nullif(count(*), 0), 1),
    'completion_of_started_rate', round(
      100.0 * count(*) filter (where status = 'completed') /
      nullif(count(*) filter (where attempts > 0), 0),
      1
    ),
    'attempt_start_rate', round(100.0 * count(*) filter (where attempts > 0) / nullif(count(*), 0), 1),
    'attempts_total', coalesce(sum(attempts), 0),
    'users_with_2plus_days', (select count(*) from user_days where active_days >= 2),
    'origins', (
      select coalesce(jsonb_object_agg(origin, funnel), '{}'::jsonb)
      from (
        select origin, jsonb_build_object(
          'sessions', count(*),
          'sessions_with_attempt', count(*) filter (where attempts > 0),
          'completed', count(*) filter (where status = 'completed')
        ) as funnel
        from session_base
        group by origin
        order by origin
      ) origin_counts
    )
  ) as value
  from session_base
),
quality_cost as (
  select jsonb_build_object(
    'runs_total', count(*),
    'users_generated', count(distinct run.user_id),
    'succeeded', count(*) filter (where run.status = 'succeeded'),
    'failed', count(*) filter (where run.status = 'failed'),
    'rejected', count(*) filter (where run.status = 'rejected'),
    'still_generating', count(*) filter (where run.status = 'generating'),
    'tokens_total', coalesce(sum(run.total_tokens), 0),
    'estimated_cost_total_usd', coalesce(sum(run.estimated_cost), 0),
    'estimated_cost_avg_success_usd', coalesce(round(avg(run.estimated_cost) filter (where run.status = 'succeeded'), 6), 0),
    'accepted_items', coalesce(sum(run.accepted_count), 0),
    'rejected_items', coalesce(sum(run.rejected_count), 0),
    'positive_feedback', (
      select count(*) from public.practice_item_feedback feedback, params
      where feedback.rating = 1 and feedback.created_at >= params.window_start
    ),
    'negative_feedback', (
      select count(*) from public.practice_item_feedback feedback, params
      where feedback.rating = -1 and feedback.created_at >= params.window_start
    ),
    'reports', (
      select count(*) from public.practice_item_reports report, params
      where report.created_at >= params.window_start
    )
  ) as value
  from public.practice_generation_runs run, params
  where run.created_at >= params.window_start
)
select jsonb_build_object(
  'window_start', (select window_start from params),
  'adoption', adoption.value,
  'quality_cost', quality_cost.value
) as practice_report
from adoption, quality_cost;
