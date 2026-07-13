do $$
declare
  v_merge record;
  v_topic_ids uuid[];
begin
  for v_merge in
    select
      id,
      primary_topic_id,
      coalesce(array(select jsonb_array_elements_text(coalesce(merged_topic_ids, '[]'::jsonb))::uuid), '{}'::uuid[]) as secondary_ids
    from public.topic_merges
    where status = 'active'
      and reverted_at is null
  loop
    v_topic_ids := array_cat(array[v_merge.primary_topic_id], v_merge.secondary_ids);

    with topic_group as (
      select *
      from public.topics
      where id = any(v_topic_ids)
    ),
    representative as (
      select *
      from topic_group
      order by
        completed desc,
        coalesce(review_count, 0) desc,
        last_reviewed_at desc nulls last,
        next_review asc nulls last
      limit 1
    ),
    latest_review as (
      select last_reviewed_at, last_session_duration
      from topic_group
      where last_reviewed_at is not null
      order by last_reviewed_at desc
      limit 1
    ),
    consolidated as (
      select
        bool_or(coalesce(t.completed, false)) as completed,
        max(coalesce(t.review_count, 0)) as review_count,
        max(coalesce(t.total_reviews, 0)) as total_reviews,
        min(t.first_studied_at) filter (where t.first_studied_at is not null) as first_studied_at,
        max(t.last_reviewed_at) filter (where t.last_reviewed_at is not null) as last_reviewed_at,
        max(t.difficulty_level) filter (where t.difficulty_level is not null) as difficulty_level,
        max(t.difficulty_set_at) filter (where t.difficulty_set_at is not null) as difficulty_set_at,
        bool_or(coalesce(t.is_marked_for_review, false)) as is_marked_for_review,
        max(t.marked_for_review_at) filter (where t.marked_for_review_at is not null) as marked_for_review_at,
        min(t.next_review) filter (
          where t.next_review is not null
            and not exists (select 1 from topic_group completed_topic where coalesce(completed_topic.completed, false))
        ) as next_review
      from topic_group t
    )
    update public.topics target
    set completed = consolidated.completed,
        review_count = consolidated.review_count,
        review_stage = case
          when consolidated.completed then 'Concluído'
          else representative.review_stage
        end,
        next_review = case
          when consolidated.completed then null
          else consolidated.next_review
        end,
        first_studied_at = consolidated.first_studied_at,
        last_reviewed_at = consolidated.last_reviewed_at,
        difficulty_level = consolidated.difficulty_level,
        difficulty_set_at = consolidated.difficulty_set_at,
        memory_stability = representative.memory_stability,
        current_interval = representative.current_interval,
        retention_score = representative.retention_score,
        total_reviews = greatest(consolidated.review_count, consolidated.total_reviews),
        last_session_duration = latest_review.last_session_duration,
        is_marked_for_review = consolidated.is_marked_for_review,
        marked_for_review_at = consolidated.marked_for_review_at,
        notes = coalesce(representative.notes, target.notes),
        updated_at = now()
    from consolidated
    cross join representative
    left join latest_review on true
    where target.id = any(v_topic_ids);
  end loop;
end $$;
