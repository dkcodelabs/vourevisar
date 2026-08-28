create or replace function public.sync_topic_merge_progress(
  p_user_id uuid,
  p_topic_id uuid,
  p_progress jsonb,
  p_history jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_topic_id uuid;
  v_topic_merge public.topic_merges%rowtype;
  v_secondary_ids uuid[] := '{}';
  v_candidate_ids uuid[] := '{}';
  v_target_ids uuid[] := '{}';
  v_has_merge boolean := false;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_progress is null or jsonb_typeof(p_progress) <> 'object' then
    raise exception 'Progress payload must be a JSON object' using errcode = '22023';
  end if;

  if p_history is not null and jsonb_typeof(p_history) <> 'object' then
    raise exception 'History payload must be a JSON object' using errcode = '22023';
  end if;

  select t.id into v_topic_id
  from public.topics t
  join public.subjects s on s.id = t.subject_id
  where t.id = p_topic_id
    and s.user_id = p_user_id
  for update of t;

  if not found then
    raise exception 'Topic not found for authenticated user' using errcode = 'P0002';
  end if;

  select * into v_topic_merge
  from public.topic_merges
  where user_id = p_user_id
    and status = 'active'
    and (
      primary_topic_id = p_topic_id
      or coalesce(merged_topic_ids, '[]'::jsonb) ? p_topic_id::text
    )
  order by created_at desc
  limit 1
  for update;

  if found then
    v_has_merge := true;

    select coalesce(array_agg(value::uuid), '{}'::uuid[])
    into v_secondary_ids
    from jsonb_array_elements_text(coalesce(v_topic_merge.merged_topic_ids, '[]'::jsonb)) as value;

    v_candidate_ids := array_cat(array[v_topic_merge.primary_topic_id], v_secondary_ids);

    select coalesce(array_agg(distinct t.id), '{}'::uuid[])
    into v_target_ids
    from unnest(v_candidate_ids) as candidate(id)
    join public.topics t on t.id = candidate.id
    join public.subjects s on s.id = t.subject_id
    where s.user_id = p_user_id;
  else
    v_target_ids := array[p_topic_id];
  end if;

  update public.topics
  set completed = case
        when p_progress ? 'completed' then (p_progress ->> 'completed')::boolean
        else completed
      end,
      review_count = case
        when p_progress ? 'review_count' then (p_progress ->> 'review_count')::integer
        else review_count
      end,
      review_stage = case
        when p_progress ? 'review_stage' then p_progress ->> 'review_stage'
        else review_stage
      end,
      next_review = case
        when p_progress ? 'next_review' then nullif(p_progress ->> 'next_review', '')::timestamptz
        else next_review
      end,
      first_studied_at = case
        when p_progress ? 'first_studied_at' then nullif(p_progress ->> 'first_studied_at', '')::timestamptz
        else first_studied_at
      end,
      last_reviewed_at = case
        when p_progress ? 'last_reviewed_at' then nullif(p_progress ->> 'last_reviewed_at', '')::timestamptz
        else last_reviewed_at
      end,
      memory_stability = case
        when p_progress ? 'memory_stability' then (p_progress ->> 'memory_stability')::real
        else memory_stability
      end,
      current_interval = case
        when p_progress ? 'current_interval' then (p_progress ->> 'current_interval')::real
        else current_interval
      end,
      difficulty_level = case
        when p_progress ? 'difficulty_level' then (p_progress ->> 'difficulty_level')::integer
        else difficulty_level
      end,
      difficulty_set_at = case
        when p_progress ? 'difficulty_set_at' then nullif(p_progress ->> 'difficulty_set_at', '')::timestamptz
        else difficulty_set_at
      end,
      last_session_duration = case
        when p_progress ? 'last_session_duration' then (p_progress ->> 'last_session_duration')::integer
        else last_session_duration
      end,
      is_marked_for_review = case
        when p_progress ? 'is_marked_for_review' then (p_progress ->> 'is_marked_for_review')::boolean
        else is_marked_for_review
      end,
      marked_for_review_at = case
        when p_progress ? 'marked_for_review_at' then nullif(p_progress ->> 'marked_for_review_at', '')::timestamptz
        else marked_for_review_at
      end,
      total_reviews = case
        when p_progress ? 'total_reviews' then (p_progress ->> 'total_reviews')::integer
        else total_reviews
      end,
      retention_score = case
        when p_progress ? 'retention_score' then (p_progress ->> 'retention_score')::real
        else retention_score
      end,
      notes = case
        when p_progress ? 'notes' then p_progress -> 'notes'
        else notes
      end,
      updated_at = now()
  where id = any(v_target_ids);

  if p_history is not null then
    insert into public.topic_review_history (
      user_id,
      topic_id,
      edital_id,
      cycle_id,
      review_stage,
      reviewed_at,
      study_duration_minutes,
      difficulty_numeric,
      memory_stability_after_review,
      interval_after_review,
      trend_delta,
      trend_label
    )
    select
      p_user_id,
      target_id,
      nullif(p_history ->> 'edital_id', '')::uuid,
      nullif(p_history ->> 'cycle_id', '')::uuid,
      coalesce(nullif(p_history ->> 'review_stage', ''), coalesce(p_progress ->> 'review_stage', 'Revisão')),
      coalesce(nullif(p_history ->> 'reviewed_at', '')::timestamptz, now()),
      nullif(p_history ->> 'study_duration_minutes', '')::integer,
      nullif(p_history ->> 'difficulty_numeric', '')::integer,
      nullif(p_history ->> 'memory_stability_after_review', '')::real,
      nullif(p_history ->> 'interval_after_review', '')::real,
      nullif(p_history ->> 'trend_delta', '')::real,
      nullif(p_history ->> 'trend_label', '')
    from unnest(v_target_ids) as target(target_id);
  end if;

  return jsonb_build_object(
    'ok', true,
    'synced_topic_ids', to_jsonb(v_target_ids),
    'merged', v_has_merge
  );
end;
$function$;

revoke all on function public.sync_topic_merge_progress(uuid, uuid, jsonb, jsonb) from public;
revoke all on function public.sync_topic_merge_progress(uuid, uuid, jsonb, jsonb) from anon;
revoke all on function public.sync_topic_merge_progress(uuid, uuid, jsonb, jsonb) from authenticated;
grant execute on function public.sync_topic_merge_progress(uuid, uuid, jsonb, jsonb) to service_role;
