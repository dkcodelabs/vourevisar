-- Relatório agregado de adoção, qualidade, operação e custo do Treino.
-- Não retorna identificadores, nomes, e-mails, prompts ou respostas privadas.
-- As janelas são calculadas no instante da execução e usam limites [início, fim).
with
params as (
  select now() as report_at
),
windows as (
  select 'current_7d'::text as window_name, report_at - interval '7 days' as window_start, report_at as window_end, 1 as sort_order
  from params
  union all
  select 'previous_7d', report_at - interval '14 days', report_at - interval '7 days', 2
  from params
  union all
  select 'trailing_28d', report_at - interval '28 days', report_at, 3
  from params
),
session_rows as (
  select
    period.window_name,
    period.window_start,
    period.window_end,
    period.sort_order,
    session.id,
    session.user_id,
    session.created_at,
    session.completed_at,
    coalesce(session.signal_snapshot->>'origin', 'unknown') as origin
  from windows period
  left join public.practice_sessions session
    on session.created_at >= period.window_start
   and session.created_at < period.window_end
),
session_attempts as (
  select session.window_name, session.id as session_id, count(attempt.id)::int as attempts
  from session_rows session
  left join public.practice_attempts attempt
    on attempt.session_id = session.id
   and attempt.invalidated_at is null
   and attempt.created_at >= session.window_start
   and attempt.created_at < session.window_end
  where session.id is not null
  group by session.window_name, session.id
),
session_base as (
  select
    session.*,
    coalesce(attempt.attempts, 0) as attempts,
    session.completed_at is not null
      and session.completed_at < session.window_end as completed_in_window
  from session_rows session
  left join session_attempts attempt
    on attempt.window_name = session.window_name
   and attempt.session_id = session.id
),
user_days as (
  select
    window_name,
    user_id,
    count(distinct (created_at at time zone 'UTC')::date)::int as active_days
  from session_base
  where user_id is not null
  group by window_name, user_id
),
origin_metrics as (
  select
    window_name,
    coalesce(jsonb_object_agg(origin, funnel order by origin), '{}'::jsonb) as origins
  from (
    select
      window_name,
      origin,
      jsonb_build_object(
        'sessions', count(id),
        'sessions_with_attempt', count(id) filter (where attempts > 0),
        'completed', count(id) filter (where completed_in_window)
      ) as funnel
    from session_base
    where id is not null
    group by window_name, origin
  ) counts
  group by window_name
),
adoption_metrics as (
  select
    session.window_name,
    session.window_start,
    session.window_end,
    session.sort_order,
    jsonb_build_object(
      'users_started', count(distinct session.user_id),
      'sessions_created', count(session.id),
      'sessions_with_attempt', count(session.id) filter (where session.attempts > 0),
      'sessions_completed', count(session.id) filter (where session.completed_in_window),
      'attempt_start_rate', round(
        100.0 * count(session.id) filter (where session.attempts > 0) /
        nullif(count(session.id), 0),
        1
      ),
      'completion_rate', round(
        100.0 * count(session.id) filter (where session.completed_in_window) /
        nullif(count(session.id), 0),
        1
      ),
      'completion_of_started_rate', round(
        100.0 * count(session.id) filter (where session.completed_in_window) /
        nullif(count(session.id) filter (where session.attempts > 0), 0),
        1
      ),
      'attempts_total', coalesce(sum(session.attempts), 0),
      'users_with_2plus_days', (
        select count(*)
        from user_days days
        where days.window_name = session.window_name
          and days.active_days >= 2
      ),
      'recurrence_rate', round(
        100.0 * (
          select count(*)
          from user_days days
          where days.window_name = session.window_name
            and days.active_days >= 2
        ) / nullif(count(distinct session.user_id), 0),
        1
      ),
      'origins', coalesce(origin.origins, '{}'::jsonb)
    ) as adoption
  from session_base session
  left join origin_metrics origin using (window_name)
  group by
    session.window_name,
    session.window_start,
    session.window_end,
    session.sort_order,
    origin.origins
),
quality_cost_metrics as (
  select
    period.window_name,
    jsonb_build_object(
      'runs_total', count(run.id),
      'users_generated', count(distinct run.user_id),
      'succeeded', count(run.id) filter (
        where run.status = 'succeeded' and run.finished_at < period.window_end
      ),
      'failed', count(run.id) filter (
        where run.status = 'failed' and run.finished_at < period.window_end
      ),
      'rejected', count(run.id) filter (
        where run.status = 'rejected' and run.finished_at < period.window_end
      ),
      'still_generating_at_window_end', count(run.id) filter (
        where run.finished_at is null or run.finished_at >= period.window_end
      ),
      'failure_rate', round(
        100.0 * count(run.id) filter (
          where run.status = 'failed' and run.finished_at < period.window_end
        ) / nullif(count(run.id), 0),
        1
      ),
      'tokens_total', coalesce(sum(run.total_tokens) filter (
        where run.finished_at < period.window_end
      ), 0),
      'estimated_cost_total_usd', coalesce(sum(run.estimated_cost) filter (
        where run.finished_at < period.window_end
      ), 0),
      'estimated_cost_avg_success_usd', coalesce(round(avg(run.estimated_cost) filter (
        where run.status = 'succeeded' and run.finished_at < period.window_end
      ), 6), 0),
      'accepted_items', coalesce(sum(run.accepted_count) filter (
        where run.finished_at < period.window_end
      ), 0),
      'rejected_items', coalesce(sum(run.rejected_count) filter (
        where run.finished_at < period.window_end
      ), 0),
      'positive_feedback', (
        select count(*)
        from public.practice_item_feedback feedback
        where feedback.rating = 1
          and feedback.created_at >= period.window_start
          and feedback.created_at < period.window_end
      ),
      'negative_feedback', (
        select count(*)
        from public.practice_item_feedback feedback
        where feedback.rating = -1
          and feedback.created_at >= period.window_start
          and feedback.created_at < period.window_end
      ),
      'reports', (
        select count(*)
        from public.practice_item_reports report
        where report.created_at >= period.window_start
          and report.created_at < period.window_end
      )
    ) as quality_cost
  from windows period
  left join public.practice_generation_runs run
    on run.created_at >= period.window_start
   and run.created_at < period.window_end
  group by period.window_name, period.window_start, period.window_end
),
window_reports as (
  select
    adoption.window_name,
    adoption.sort_order,
    jsonb_build_object(
      'window_start', adoption.window_start,
      'window_end', adoption.window_end,
      'adoption', adoption.adoption,
      'quality_cost', quality.quality_cost
    ) as report
  from adoption_metrics adoption
  join quality_cost_metrics quality using (window_name)
),
operational_health as (
  select jsonb_build_object(
    'still_generating_total', count(run.id),
    'stuck_over_15m', count(run.id) filter (
      where run.started_at < params.report_at - interval '15 minutes'
    ),
    'oldest_generating_minutes', coalesce(
      floor(extract(epoch from (params.report_at - min(run.started_at))) / 60)::int,
      0
    )
  ) as value
  from params
  left join public.practice_generation_runs run
    on run.status = 'generating'
  group by params.report_at
)
select jsonb_build_object(
  'generated_at', (select report_at from params),
  'windows', (
    select jsonb_object_agg(window_name, report order by sort_order)
    from window_reports
  ),
  'operational_health', operational_health.value
) as practice_report
from operational_health;
