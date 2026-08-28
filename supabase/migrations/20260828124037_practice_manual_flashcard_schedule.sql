-- A prática extra deve registrar evidência sem adiar uma revisão já agendada.
-- A escolha é definida exclusivamente pela Edge Function em signal_snapshot.
create or replace function public.submit_practice_attempt_internal(
  p_user_id uuid,
  p_session_id uuid,
  p_item_id uuid,
  p_client_attempt_id uuid,
  p_answer_payload jsonb,
  p_response_time_ms integer,
  p_algorithm_version text default 'v1'
) returns jsonb
language plpgsql security definer
set search_path to ''
as $$
declare
  v_attempt_id uuid;
  v_item_type public.practice_item_type;
  v_topic_id uuid;
  v_answer_key jsonb;
  v_attempt_kind public.practice_attempt_kind;
  v_result public.practice_attempt_result;
  v_next_due_at timestamptz;
  v_completed boolean;
  v_schedule record;
  v_reschedule_flashcards boolean := false;
begin
  if p_user_id is null or p_session_id is null or p_item_id is null or p_client_attempt_id is null then
    raise exception 'practice attempt identifiers are required';
  end if;
  if jsonb_typeof(p_answer_payload) <> 'object' then
    raise exception 'practice answer payload is invalid';
  end if;

  select id, result into v_attempt_id, v_result
  from public.practice_attempts
  where user_id = p_user_id and client_attempt_id = p_client_attempt_id;
  if v_attempt_id is not null then
    select due_at into v_next_due_at from public.flashcard_schedules
    where user_id = p_user_id and item_id = p_item_id;
    select not exists (
      select 1 from public.practice_session_items served
      where served.session_id = p_session_id
        and not exists (
          select 1 from public.practice_attempts attempt
          where attempt.user_id = p_user_id and attempt.session_id = p_session_id
            and attempt.item_id = served.item_id and attempt.invalidated_at is null
        )
    ) into v_completed;
    return jsonb_build_object('attempt_id', v_attempt_id, 'result', v_result::text, 'session_completed', v_completed, 'next_due_at', v_next_due_at);
  end if;

  select item.item_type, served.topic_id, answer.answer_key,
    coalesce((session.signal_snapshot ->> 'rescheduleFlashcards')::boolean, false)
  into v_item_type, v_topic_id, v_answer_key, v_reschedule_flashcards
  from public.practice_session_items served
  join public.practice_sessions session on session.id = served.session_id and session.user_id = served.user_id
  join public.practice_items item on item.id = served.item_id
  join private.practice_item_answers answer on answer.item_id = item.id
  where served.session_id = p_session_id and served.item_id = p_item_id and served.user_id = p_user_id;
  if v_item_type is null then raise exception 'practice item was not served to this user'; end if;

  if v_item_type = 'flashcard' then
    if p_answer_payload ->> 'kind' <> 'flashcard_recall' then raise exception 'flashcard requires recall rating'; end if;
    v_attempt_kind := 'flashcard_recall';
    v_result := (p_answer_payload ->> 'rating')::public.practice_attempt_result;
    if v_result not in ('recalled', 'effortful', 'forgotten') then raise exception 'flashcard rating is invalid'; end if;
  else
    if p_answer_payload ->> 'kind' <> 'objective_answer' then raise exception 'objective item requires answer'; end if;
    v_attempt_kind := 'objective_answer';
    if coalesce((p_answer_payload ->> 'skipped')::boolean, false) then v_result := 'skipped';
    elsif nullif(p_answer_payload ->> 'optionId', '') is null then raise exception 'objective answer is required';
    elsif p_answer_payload ->> 'optionId' = v_answer_key ->> 'correctOptionId' then v_result := 'correct';
    else v_result := 'incorrect'; end if;
  end if;

  insert into public.practice_attempts (
    user_id, session_id, item_id, topic_id, attempt_kind, answer_payload, result,
    response_time_ms, client_attempt_id, algorithm_version
  ) values (
    p_user_id, p_session_id, p_item_id, v_topic_id, v_attempt_kind, p_answer_payload,
    v_result, p_response_time_ms, p_client_attempt_id, p_algorithm_version
  ) returning id into v_attempt_id;

  if v_item_type = 'flashcard' and v_reschedule_flashcards then
    select * into v_schedule from public.flashcard_schedules
    where user_id = p_user_id and item_id = p_item_id for update;
    select * into v_schedule from private.next_flashcard_schedule(
      now(), coalesce(v_schedule.state, '{}'::jsonb), coalesce(v_schedule.repetitions, 0),
      coalesce(v_schedule.lapses, 0), v_result
    );
    insert into public.flashcard_schedules (
      user_id, item_id, due_at, state, repetitions, lapses, last_rating, algorithm_version
    ) values (
      p_user_id, p_item_id, v_schedule.due_at, v_schedule.state, v_schedule.repetitions,
      v_schedule.lapses, v_result, p_algorithm_version
    ) on conflict (user_id, item_id) do update set
      due_at = excluded.due_at, state = excluded.state, repetitions = excluded.repetitions,
      lapses = excluded.lapses, last_rating = excluded.last_rating,
      algorithm_version = excluded.algorithm_version, updated_at = now()
    returning due_at into v_next_due_at;
  elsif v_item_type = 'flashcard' then
    select due_at into v_next_due_at from public.flashcard_schedules
    where user_id = p_user_id and item_id = p_item_id;
  end if;

  select not exists (
    select 1 from public.practice_session_items served
    where served.session_id = p_session_id
      and not exists (
        select 1 from public.practice_attempts attempt
        where attempt.user_id = p_user_id and attempt.session_id = p_session_id
          and attempt.item_id = served.item_id and attempt.invalidated_at is null
      )
  ) into v_completed;
  if v_completed then
    update public.practice_sessions set status = 'completed', completed_at = coalesce(completed_at, now())
    where id = p_session_id and user_id = p_user_id and status = 'active';
  end if;
  return jsonb_build_object('attempt_id', v_attempt_id, 'result', v_result::text, 'session_completed', v_completed, 'next_due_at', v_next_due_at);
end;
$$;

revoke all on function public.submit_practice_attempt_internal(uuid, uuid, uuid, uuid, jsonb, integer, text) from public, anon, authenticated;
grant execute on function public.submit_practice_attempt_internal(uuid, uuid, uuid, uuid, jsonb, integer, text) to service_role;

create index if not exists practice_attempts_user_created_idx
  on public.practice_attempts (user_id, created_at desc)
  where invalidated_at is null;
