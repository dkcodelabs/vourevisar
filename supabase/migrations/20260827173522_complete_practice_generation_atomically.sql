-- Persist a fully validated package in one database transaction. The model is
-- never allowed to write through the Data API: only the dedicated Edge
-- Function calls these service-role-only routines after validation.

create or replace function private.complete_practice_generation(
  p_generation_id uuid,
  p_user_id uuid,
  p_quick_recap jsonb,
  p_items jsonb,
  p_input_tokens integer,
  p_output_tokens integer,
  p_total_tokens integer,
  p_estimated_cost numeric,
  p_provider_attempt_count smallint,
  p_rejection_summary jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_run public.practice_generation_runs%rowtype;
  v_package_id uuid;
  v_item_id uuid;
  v_item jsonb;
  v_item_type public.practice_item_type;
  v_content_version integer;
  v_item_count integer;
begin
  if p_generation_id is null or p_user_id is null then
    raise exception 'practice generation completion requires generation and user';
  end if;

  if jsonb_typeof(p_quick_recap) <> 'object'
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_typeof(p_rejection_summary) <> 'array'
  then
    raise exception 'practice generation completion payload is invalid';
  end if;

  select * into v_run
  from public.practice_generation_runs
  where id = p_generation_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'practice generation was not found';
  end if;

  if v_run.status <> 'generating' then
    raise exception 'practice generation is not pending';
  end if;

  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 8 or v_item_count > 10 then
    raise exception 'practice generation requires between eight and ten valid items';
  end if;

  select coalesce(max(content_version), 0) + 1
  into v_content_version
  from public.practice_packages
  where user_id = p_user_id
    and topic_id = v_run.topic_id;

  insert into public.practice_packages (
    user_id,
    topic_id,
    context_snapshot,
    source_hash,
    quick_recap,
    content_version,
    bank_profile_version,
    status
  ) values (
    p_user_id,
    v_run.topic_id,
    v_run.request_context || jsonb_build_object('generation_id', v_run.id),
    v_run.context_fingerprint,
    p_quick_recap,
    v_content_version,
    v_run.prompt_version,
    'ready'
  ) returning id into v_package_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_item_type := (v_item->>'itemType')::public.practice_item_type;

    insert into public.practice_items (
      package_id,
      item_type,
      prompt,
      options,
      learning_objective,
      depth,
      target_difficulty,
      scope_fingerprint,
      source_kind,
      source_hash,
      content_version,
      status
    ) values (
      v_package_id,
      v_item_type,
      v_item->>'prompt',
      coalesce(v_item->'options', '[]'::jsonb),
      v_item->>'learningObjective',
      v_item->>'depth',
      v_item->>'targetDifficulty',
      v_run.context_fingerprint,
      'generated',
      v_run.context_fingerprint,
      v_content_version,
      'private_ready'
    ) returning id into v_item_id;

    insert into private.practice_item_answers (
      item_id,
      answer_key,
      explanation,
      source_citations,
      validation_result,
      model_id,
      prompt_version,
      schema_version
    ) values (
      v_item_id,
      coalesce(v_item->'answer', '{}'::jsonb),
      v_item->>'explanation',
      '[]'::jsonb,
      jsonb_build_object(
        'status', 'accepted',
        'trapExplanation', coalesce(v_item->>'trapExplanation', '')
      ),
      v_run.model_id,
      v_run.prompt_version,
      v_run.schema_version
    );

    if v_item_type = 'flashcard' then
      insert into public.flashcard_schedules (user_id, item_id, due_at)
      values (p_user_id, v_item_id, now())
      on conflict (user_id, item_id) do nothing;
    end if;
  end loop;

  update public.practice_generation_runs
  set
    package_id = v_package_id,
    status = 'succeeded',
    provider_attempt_count = greatest(provider_attempt_count, p_provider_attempt_count),
    input_tokens = p_input_tokens,
    output_tokens = p_output_tokens,
    total_tokens = p_total_tokens,
    estimated_cost = p_estimated_cost,
    candidate_count = v_item_count,
    accepted_count = v_item_count,
    rejected_count = 0,
    rejection_summary = p_rejection_summary,
    failure_code = null,
    failure_message = null,
    finished_at = now()
  where id = p_generation_id
    and user_id = p_user_id;

  return v_package_id;
end;
$$;

create or replace function private.fail_practice_generation(
  p_generation_id uuid,
  p_user_id uuid,
  p_status public.practice_generation_status,
  p_failure_code text,
  p_failure_message text,
  p_provider_attempt_count smallint,
  p_rejection_summary jsonb default '[]'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_status not in ('failed', 'rejected') then
    raise exception 'generation failure status must be failed or rejected';
  end if;

  if jsonb_typeof(p_rejection_summary) <> 'array' then
    raise exception 'generation rejection summary must be an array';
  end if;

  update public.practice_generation_runs
  set
    status = p_status,
    provider_attempt_count = greatest(provider_attempt_count, p_provider_attempt_count),
    rejection_summary = p_rejection_summary,
    failure_code = left(coalesce(p_failure_code, 'unknown'), 80),
    failure_message = left(coalesce(p_failure_message, 'Não foi possível gerar o material.'), 240),
    finished_at = now()
  where id = p_generation_id
    and user_id = p_user_id
    and status = 'generating';
end;
$$;

revoke all on function private.complete_practice_generation(
  uuid,
  uuid,
  jsonb,
  jsonb,
  integer,
  integer,
  integer,
  numeric,
  smallint,
  jsonb
) from public, anon, authenticated;

revoke all on function private.fail_practice_generation(
  uuid,
  uuid,
  public.practice_generation_status,
  text,
  text,
  smallint,
  jsonb
) from public, anon, authenticated;

grant execute on function private.complete_practice_generation(
  uuid,
  uuid,
  jsonb,
  jsonb,
  integer,
  integer,
  integer,
  numeric,
  smallint,
  jsonb
) to service_role;

grant execute on function private.fail_practice_generation(
  uuid,
  uuid,
  public.practice_generation_status,
  text,
  text,
  smallint,
  jsonb
) to service_role;
