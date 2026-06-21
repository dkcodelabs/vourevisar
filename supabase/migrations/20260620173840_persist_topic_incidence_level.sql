alter table public.topics
  add column if not exists incidence_score smallint
    check (incidence_score between 1 and 5),
  add column if not exists incidence_level text
    check (incidence_level in ('low', 'medium', 'high'));

create index if not exists topics_incidence_level_idx
  on public.topics (incidence_level)
  where incidence_level is not null and is_active is distinct from false;

with ranked_topics as (
  select
    id,
    total_volume,
    count(*) over (partition by subject_id) as basis_count,
    min(total_volume) over (partition by subject_id) as min_volume,
    max(total_volume) over (partition by subject_id) as max_volume,
    rank() over (partition by subject_id order by total_volume) as volume_rank,
    count(*) over (partition by subject_id, total_volume) as equal_count
  from public.topics
  where total_volume > 0
    and is_active is distinct from false
), scored_topics as (
  select
    id,
    total_volume,
    basis_count,
    case
      when basis_count < 2 or min_volume = max_volume then null
      else round(
        (
          (volume_rank - 1)::numeric
          + greatest(equal_count - 1, 0)::numeric / 2
        ) / (basis_count - 1),
        4
      )
    end as rank_percentile
  from ranked_topics
), normalized_topics as (
  select
    id,
    total_volume,
    basis_count,
    rank_percentile,
    case
      when rank_percentile is null then 3
      when rank_percentile >= 0.8 then 5
      when rank_percentile >= 0.6 then 4
      when rank_percentile >= 0.4 then 3
      when rank_percentile >= 0.2 then 2
      else 1
    end::smallint as incidence_score
  from scored_topics
), classified_topics as (
  select
    *,
    case
      when incidence_score >= 4 then 'high'
      when incidence_score = 3 then 'medium'
      else 'low'
    end as incidence_level,
    case
      when incidence_score = 5 then 'Cobrança muito alta'
      when incidence_score = 4 then 'Cobrança alta'
      when incidence_score = 3 then 'Cobrança média'
      when incidence_score = 2 then 'Cobrança baixa'
      else 'Cobrança muito baixa'
    end as score_label
  from normalized_topics
)
update public.topics as topics
set
  incidence_score = classified.incidence_score,
  incidence_level = classified.incidence_level,
  incidence_context = (
    case
      when jsonb_typeof(topics.incidence_context) = 'object' then topics.incidence_context
      else '{}'::jsonb
    end
  ) || jsonb_build_object(
    'raw_volume', classified.total_volume,
    'normalized_score', classified.incidence_score,
    'incidence_level', classified.incidence_level,
    'rank_percentile', classified.rank_percentile,
    'score_label', classified.score_label,
    'score_scope', 'subject_edital',
    'score_basis_count', classified.basis_count,
    'score_confidence', case when classified.basis_count < 3 then 'low_sample' else 'cohort' end,
    'score_updated_at', now()
  )
from classified_topics as classified
where topics.id = classified.id;

comment on column public.topics.incidence_score is
  'Nota normalizada de cobranca entre 1 e 5, comparada dentro da materia do edital.';

comment on column public.topics.incidence_level is
  'Faixa consultavel de cobranca: low, medium ou high.';
