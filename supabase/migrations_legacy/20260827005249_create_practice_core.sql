-- Core persistence for private practice sessions.
-- The browser may read only its own safe presentation data. Answers,
-- explanations and source citations remain in the private schema and are
-- released only by trusted Edge Functions after a valid attempt/reveal.

create type public.practice_item_type as enum (
  'flashcard',
  'multiple_choice',
  'true_false'
);

create type public.practice_package_status as enum (
  'draft',
  'ready',
  'partial',
  'failed',
  'retired'
);

create type public.practice_item_status as enum (
  'draft',
  'private_ready',
  'quarantined',
  'retired'
);

create type public.practice_session_mode as enum (
  'questions',
  'flashcards_due',
  'quick'
);

create type public.practice_session_status as enum (
  'active',
  'completed',
  'abandoned'
);

create type public.practice_attempt_kind as enum (
  'objective_answer',
  'flashcard_recall'
);

create type public.practice_attempt_result as enum (
  'correct',
  'incorrect',
  'skipped',
  'recalled',
  'effortful',
  'forgotten'
);

create type public.practice_feedback_reason as enum (
  'wrong_answer',
  'ambiguous',
  'off_topic',
  'repetitive',
  'too_easy',
  'bad_explanation',
  'other'
);

create type public.practice_report_status as enum (
  'open',
  'reviewed',
  'dismissed'
);

create table public.practice_packages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  context_snapshot jsonb not null default '{}'::jsonb,
  source_hash text,
  quick_recap jsonb,
  content_version integer not null default 1 check (content_version > 0),
  bank_profile_version text,
  status public.practice_package_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(context_snapshot) = 'object'),
  check (quick_recap is null or jsonb_typeof(quick_recap) = 'object')
);

create table public.practice_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.practice_packages(id) on delete cascade,
  item_type public.practice_item_type not null,
  prompt text not null check (char_length(trim(prompt)) between 1 and 4000),
  options jsonb not null default '[]'::jsonb,
  learning_objective text,
  depth text check (depth in ('foundation', 'application', 'distinction', 'integration')),
  target_difficulty text check (target_difficulty in ('basic', 'intermediate', 'advanced')),
  scope_fingerprint text,
  source_kind text not null default 'generated' check (source_kind in ('generated', 'curated', 'imported')),
  source_hash text,
  legal_as_of date,
  content_version integer not null default 1 check (content_version > 0),
  status public.practice_item_status not null default 'draft',
  quality_score numeric(5, 2) check (quality_score between 0 and 100),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(options) = 'array'),
  check (
    (item_type = 'flashcard' and jsonb_array_length(options) = 0)
    or (item_type = 'true_false' and jsonb_array_length(options) = 2)
    or (item_type = 'multiple_choice' and jsonb_array_length(options) between 2 and 6)
  )
);

create table private.practice_item_answers (
  item_id uuid primary key references public.practice_items(id) on delete cascade,
  answer_key jsonb not null,
  explanation text not null check (char_length(trim(explanation)) between 1 and 6000),
  source_citations jsonb not null default '[]'::jsonb,
  validation_result jsonb not null default '{}'::jsonb,
  model_id text,
  prompt_version text,
  schema_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(answer_key) = 'object'),
  check (jsonb_typeof(source_citations) = 'array'),
  check (jsonb_typeof(validation_result) = 'object')
);

create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  cycle_id uuid references public.user_cycles(id) on delete set null,
  mode public.practice_session_mode not null,
  status public.practice_session_status not null default 'active',
  signal_snapshot jsonb not null default '{}'::jsonb,
  algorithm_version text not null default 'v1',
  idempotency_key uuid not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  check (jsonb_typeof(signal_snapshot) = 'object'),
  check ((status = 'completed') = (completed_at is not null))
);

create table public.practice_session_items (
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  item_id uuid not null references public.practice_items(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  position smallint not null check (position > 0),
  served_reason text not null check (char_length(trim(served_reason)) between 1 and 160),
  created_at timestamptz not null default now(),
  primary key (session_id, item_id),
  unique (session_id, position),
  unique (user_id, session_id, item_id)
);

create table public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  item_id uuid not null,
  topic_id uuid references public.topics(id) on delete set null,
  attempt_kind public.practice_attempt_kind not null,
  answer_payload jsonb not null default '{}'::jsonb,
  result public.practice_attempt_result not null,
  response_time_ms integer check (response_time_ms is null or response_time_ms between 0 and 7200000),
  mistake_tag text,
  client_attempt_id uuid not null,
  algorithm_version text not null default 'v1',
  invalidated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, client_attempt_id),
  foreign key (user_id, session_id, item_id)
    references public.practice_session_items(user_id, session_id, item_id)
    on delete restrict,
  check (jsonb_typeof(answer_payload) = 'object'),
  check (
    (attempt_kind = 'objective_answer' and result in ('correct', 'incorrect', 'skipped'))
    or (attempt_kind = 'flashcard_recall' and result in ('recalled', 'effortful', 'forgotten'))
  )
);

create table public.flashcard_schedules (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.practice_items(id) on delete cascade,
  due_at timestamptz not null,
  state jsonb not null default '{}'::jsonb,
  repetitions integer not null default 0 check (repetitions >= 0),
  lapses integer not null default 0 check (lapses >= 0),
  last_rating public.practice_attempt_result,
  algorithm_version text not null default 'v1',
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id),
  check (jsonb_typeof(state) = 'object'),
  check (last_rating is null or last_rating in ('recalled', 'effortful', 'forgotten'))
);

create table public.topic_learning_signals (
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  evidence_count integer not null default 0 check (evidence_count >= 0),
  objective_attempt_count integer not null default 0 check (objective_attempt_count >= 0),
  flashcard_attempt_count integer not null default 0 check (flashcard_attempt_count >= 0),
  accuracy_smoothed numeric(5, 4) check (accuracy_smoothed between 0 and 1),
  recall_score numeric(5, 4) check (recall_score between 0 and 1),
  weakness_score numeric(5, 4) check (weakness_score between 0 and 1),
  evidence_level text not null default 'low' check (evidence_level in ('low', 'observing', 'needs_reinforcement', 'consolidating')),
  score_version text not null default 'v1',
  last_practiced_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

create table public.practice_item_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.practice_sessions(id) on delete set null,
  item_id uuid not null references public.practice_items(id) on delete cascade,
  rating smallint not null check (rating in (-1, 1)),
  reason public.practice_feedback_reason,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, item_id),
  check ((rating = 1 and reason is null) or (rating = -1 and reason is not null))
);

create table public.practice_item_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.practice_items(id) on delete cascade,
  reason public.practice_feedback_reason not null,
  details text check (details is null or char_length(details) <= 1000),
  status public.practice_report_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index practice_item_reports_one_open_report_per_user_item
  on public.practice_item_reports (user_id, item_id)
  where status = 'open';

create index practice_packages_user_topic_ready_idx
  on public.practice_packages (user_id, topic_id, created_at desc)
  where status = 'ready';

create index practice_items_package_ready_idx
  on public.practice_items (package_id, created_at)
  where status = 'private_ready';

create index practice_session_items_user_session_position_idx
  on public.practice_session_items (user_id, session_id, position);

create index practice_attempts_user_topic_created_idx
  on public.practice_attempts (user_id, topic_id, created_at desc)
  where invalidated_at is null;

create index flashcard_schedules_due_idx
  on public.flashcard_schedules (user_id, due_at);

create index practice_item_feedback_hidden_idx
  on public.practice_item_feedback (user_id, item_id)
  where rating = -1;

-- This RPC is intentionally only callable by service_role. The Edge Function
-- authenticates the student, owns the selection policy, and calls this single
-- transaction so a retry can never leave a session without its served items.
create or replace function public.create_practice_session_internal(
  p_user_id uuid,
  p_topic_id uuid,
  p_mode public.practice_session_mode,
  p_idempotency_key uuid,
  p_signal_snapshot jsonb,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_requested_count integer;
  v_inserted_count integer;
begin
  if p_user_id is null or p_idempotency_key is null then
    raise exception 'practice session requires user and idempotency key';
  end if;

  if jsonb_typeof(p_signal_snapshot) <> 'object' or jsonb_typeof(p_items) <> 'array' then
    raise exception 'practice session payload is invalid';
  end if;

  select id into v_session_id
  from public.practice_sessions
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key;

  if v_session_id is not null then
    return v_session_id;
  end if;

  select jsonb_array_length(p_items) into v_requested_count;
  if v_requested_count is null or v_requested_count = 0 then
    raise exception 'practice session requires at least one item';
  end if;

  insert into public.practice_sessions (
    user_id,
    topic_id,
    mode,
    signal_snapshot,
    idempotency_key
  ) values (
    p_user_id,
    p_topic_id,
    p_mode,
    p_signal_snapshot,
    p_idempotency_key
  ) returning id into v_session_id;

  insert into public.practice_session_items (
    session_id,
    item_id,
    user_id,
    topic_id,
    position,
    served_reason
  )
  select
    v_session_id,
    selected.item_id,
    p_user_id,
    package.topic_id,
    selected.position,
    selected.served_reason
  from jsonb_to_recordset(p_items) as selected(
    item_id uuid,
    position smallint,
    served_reason text
  )
  join public.practice_items item on item.id = selected.item_id
  join public.practice_packages package on package.id = item.package_id
  where package.user_id = p_user_id
    and package.status = 'ready'
    and item.status = 'private_ready'
    and (p_topic_id is null or package.topic_id = p_topic_id)
    and not exists (
      select 1
      from public.practice_item_feedback feedback
      where feedback.user_id = p_user_id
        and feedback.item_id = item.id
        and feedback.rating = -1
    );

  get diagnostics v_inserted_count = row_count;
  if v_inserted_count <> v_requested_count then
    raise exception 'practice session contains ineligible or duplicate items';
  end if;

  return v_session_id;
exception
  when unique_violation then
    select id into v_session_id
    from public.practice_sessions
    where user_id = p_user_id
      and idempotency_key = p_idempotency_key;

    if v_session_id is not null then
      return v_session_id;
    end if;

    raise;
end;
$$;

revoke all on function public.create_practice_session_internal(
  uuid,
  uuid,
  public.practice_session_mode,
  uuid,
  jsonb,
  jsonb
) from public, anon, authenticated;

grant execute on function public.create_practice_session_internal(
  uuid,
  uuid,
  public.practice_session_mode,
  uuid,
  jsonb,
  jsonb
) to service_role;

-- Versioned deterministic scheduler for the first practice release. This is
-- deliberately simple and can later be replaced without rewriting attempts.
create or replace function private.next_flashcard_schedule(
  p_now timestamptz,
  p_state jsonb,
  p_repetitions integer,
  p_lapses integer,
  p_rating public.practice_attempt_result
)
returns table (
  due_at timestamptz,
  state jsonb,
  repetitions integer,
  lapses integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_previous_interval integer := greatest(coalesce((p_state->>'interval_days')::integer, 0), 0);
  v_next_interval integer;
begin
  if p_rating = 'forgotten' then
    v_next_interval := 1;
    repetitions := 0;
    lapses := greatest(coalesce(p_lapses, 0), 0) + 1;
  elsif p_rating = 'effortful' then
    v_next_interval := greatest(3, ceil(greatest(v_previous_interval, 1) * 1.5)::integer);
    repetitions := greatest(coalesce(p_repetitions, 0), 0) + 1;
    lapses := greatest(coalesce(p_lapses, 0), 0);
  elsif p_rating = 'recalled' then
    v_next_interval := greatest(7, ceil(greatest(v_previous_interval, 3) * 2)::integer);
    repetitions := greatest(coalesce(p_repetitions, 0), 0) + 1;
    lapses := greatest(coalesce(p_lapses, 0), 0);
  else
    raise exception 'flashcard rating is invalid';
  end if;

  due_at := p_now + make_interval(days => v_next_interval);
  state := jsonb_build_object(
    'interval_days', v_next_interval,
    'last_rating', p_rating::text
  );
  return next;
end;
$$;

revoke all on function private.next_flashcard_schedule(
  timestamptz,
  jsonb,
  integer,
  integer,
  public.practice_attempt_result
) from public, anon, authenticated;

create or replace function public.get_practice_item_answer_internal(
  p_user_id uuid,
  p_session_id uuid,
  p_item_id uuid,
  p_flashcard_only boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item_type public.practice_item_type;
  v_answer_key jsonb;
  v_explanation text;
  v_source_citations jsonb;
begin
  select item.item_type, answer.answer_key, answer.explanation, answer.source_citations
  into v_item_type, v_answer_key, v_explanation, v_source_citations
  from public.practice_session_items served
  join public.practice_items item on item.id = served.item_id
  join private.practice_item_answers answer on answer.item_id = item.id
  where served.session_id = p_session_id
    and served.item_id = p_item_id
    and served.user_id = p_user_id;

  if v_item_type is null then
    raise exception 'practice item was not served to this user';
  end if;

  if p_flashcard_only and v_item_type <> 'flashcard' then
    raise exception 'item is not a flashcard';
  end if;

  return jsonb_build_object(
    'item_type', v_item_type::text,
    'answer_key', v_answer_key,
    'explanation', v_explanation,
    'source_citations', v_source_citations
  );
end;
$$;

revoke all on function public.get_practice_item_answer_internal(uuid, uuid, uuid, boolean)
  from public, anon, authenticated;

grant execute on function public.get_practice_item_answer_internal(uuid, uuid, uuid, boolean)
  to service_role;

create or replace function public.submit_practice_attempt_internal(
  p_user_id uuid,
  p_session_id uuid,
  p_item_id uuid,
  p_client_attempt_id uuid,
  p_answer_payload jsonb,
  p_response_time_ms integer,
  p_algorithm_version text default 'v1'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
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
begin
  if p_user_id is null or p_session_id is null or p_item_id is null or p_client_attempt_id is null then
    raise exception 'practice attempt identifiers are required';
  end if;

  if jsonb_typeof(p_answer_payload) <> 'object' then
    raise exception 'practice answer payload is invalid';
  end if;

  select id, result into v_attempt_id, v_result
  from public.practice_attempts
  where user_id = p_user_id
    and client_attempt_id = p_client_attempt_id;

  if v_attempt_id is not null then
    select due_at into v_next_due_at
    from public.flashcard_schedules
    where user_id = p_user_id and item_id = p_item_id;

    select not exists (
      select 1
      from public.practice_session_items served
      where served.session_id = p_session_id
        and not exists (
          select 1
          from public.practice_attempts attempt
          where attempt.user_id = p_user_id
            and attempt.session_id = p_session_id
            and attempt.item_id = served.item_id
            and attempt.invalidated_at is null
        )
    ) into v_completed;

    return jsonb_build_object(
      'attempt_id', v_attempt_id,
      'result', v_result::text,
      'session_completed', v_completed,
      'next_due_at', v_next_due_at
    );
  end if;

  select item.item_type, served.topic_id, answer.answer_key
  into v_item_type, v_topic_id, v_answer_key
  from public.practice_session_items served
  join public.practice_items item on item.id = served.item_id
  join private.practice_item_answers answer on answer.item_id = item.id
  where served.session_id = p_session_id
    and served.item_id = p_item_id
    and served.user_id = p_user_id;

  if v_item_type is null then
    raise exception 'practice item was not served to this user';
  end if;

  if v_item_type = 'flashcard' then
    if p_answer_payload->>'kind' <> 'flashcard_recall' then
      raise exception 'flashcard requires recall rating';
    end if;

    v_attempt_kind := 'flashcard_recall';
    v_result := (p_answer_payload->>'rating')::public.practice_attempt_result;
    if v_result not in ('recalled', 'effortful', 'forgotten') then
      raise exception 'flashcard rating is invalid';
    end if;
  else
    if p_answer_payload->>'kind' <> 'objective_answer' then
      raise exception 'objective item requires answer';
    end if;

    v_attempt_kind := 'objective_answer';
    if coalesce((p_answer_payload->>'skipped')::boolean, false) then
      v_result := 'skipped';
    elsif nullif(p_answer_payload->>'optionId', '') is null then
      raise exception 'objective answer is required';
    elsif p_answer_payload->>'optionId' = v_answer_key->>'correctOptionId' then
      v_result := 'correct';
    else
      v_result := 'incorrect';
    end if;
  end if;

  insert into public.practice_attempts (
    user_id,
    session_id,
    item_id,
    topic_id,
    attempt_kind,
    answer_payload,
    result,
    response_time_ms,
    client_attempt_id,
    algorithm_version
  ) values (
    p_user_id,
    p_session_id,
    p_item_id,
    v_topic_id,
    v_attempt_kind,
    p_answer_payload,
    v_result,
    p_response_time_ms,
    p_client_attempt_id,
    p_algorithm_version
  ) returning id into v_attempt_id;

  if v_item_type = 'flashcard' then
    select * into v_schedule
    from public.flashcard_schedules
    where user_id = p_user_id and item_id = p_item_id
    for update;

    select * into v_schedule
    from private.next_flashcard_schedule(
      now(),
      coalesce(v_schedule.state, '{}'::jsonb),
      coalesce(v_schedule.repetitions, 0),
      coalesce(v_schedule.lapses, 0),
      v_result
    );

    insert into public.flashcard_schedules (
      user_id,
      item_id,
      due_at,
      state,
      repetitions,
      lapses,
      last_rating,
      algorithm_version
    ) values (
      p_user_id,
      p_item_id,
      v_schedule.due_at,
      v_schedule.state,
      v_schedule.repetitions,
      v_schedule.lapses,
      v_result,
      p_algorithm_version
    ) on conflict (user_id, item_id) do update set
      due_at = excluded.due_at,
      state = excluded.state,
      repetitions = excluded.repetitions,
      lapses = excluded.lapses,
      last_rating = excluded.last_rating,
      algorithm_version = excluded.algorithm_version,
      updated_at = now()
    returning due_at into v_next_due_at;
  end if;

  select not exists (
    select 1
    from public.practice_session_items served
    where served.session_id = p_session_id
      and not exists (
        select 1
        from public.practice_attempts attempt
        where attempt.user_id = p_user_id
          and attempt.session_id = p_session_id
          and attempt.item_id = served.item_id
          and attempt.invalidated_at is null
      )
  ) into v_completed;

  if v_completed then
    update public.practice_sessions
    set status = 'completed', completed_at = coalesce(completed_at, now())
    where id = p_session_id and user_id = p_user_id and status = 'active';
  end if;

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'result', v_result::text,
    'session_completed', v_completed,
    'next_due_at', v_next_due_at
  );
end;
$$;

revoke all on function public.submit_practice_attempt_internal(
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb,
  integer,
  text
) from public, anon, authenticated;

grant execute on function public.submit_practice_attempt_internal(
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb,
  integer,
  text
) to service_role;

create or replace function private.set_practice_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_practice_updated_at() from public;

create trigger practice_packages_set_updated_at
before update on public.practice_packages
for each row execute function private.set_practice_updated_at();

create trigger practice_items_set_updated_at
before update on public.practice_items
for each row execute function private.set_practice_updated_at();

create trigger practice_item_answers_set_updated_at
before update on private.practice_item_answers
for each row execute function private.set_practice_updated_at();

create trigger practice_sessions_set_updated_at
before update on public.practice_sessions
for each row execute function private.set_practice_updated_at();

create trigger practice_feedback_set_updated_at
before update on public.practice_item_feedback
for each row execute function private.set_practice_updated_at();

create trigger practice_reports_set_updated_at
before update on public.practice_item_reports
for each row execute function private.set_practice_updated_at();

alter table public.practice_packages enable row level security;
alter table public.practice_items enable row level security;
alter table private.practice_item_answers enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.practice_session_items enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.flashcard_schedules enable row level security;
alter table public.topic_learning_signals enable row level security;
alter table public.practice_item_feedback enable row level security;
alter table public.practice_item_reports enable row level security;

revoke all on table private.practice_item_answers from anon, authenticated;

grant select on table public.practice_packages to authenticated;
grant select on table public.practice_items to authenticated;
grant select on table public.practice_sessions to authenticated;
grant select on table public.practice_session_items to authenticated;
grant select on table public.practice_attempts to authenticated;
grant select on table public.flashcard_schedules to authenticated;
grant select on table public.topic_learning_signals to authenticated;
grant select on table public.practice_item_feedback to authenticated;
grant select on table public.practice_item_reports to authenticated;

create policy practice_packages_select_own
  on public.practice_packages
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy practice_items_select_from_own_package
  on public.practice_items
  for select to authenticated
  using (
    exists (
      select 1
      from public.practice_packages package
      where package.id = practice_items.package_id
        and package.user_id = (select auth.uid())
    )
  );

create policy practice_sessions_select_own
  on public.practice_sessions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy practice_session_items_select_own
  on public.practice_session_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy practice_attempts_select_own
  on public.practice_attempts
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy flashcard_schedules_select_own
  on public.flashcard_schedules
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy topic_learning_signals_select_own
  on public.topic_learning_signals
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy practice_item_feedback_select_own
  on public.practice_item_feedback
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy practice_item_reports_select_own
  on public.practice_item_reports
  for select to authenticated
  using ((select auth.uid()) = user_id);
