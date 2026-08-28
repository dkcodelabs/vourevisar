-- A geração é um ativo caro e não reproduzível. Este ledger não armazena a
-- anotação crua do aluno nem o prompt completo; ele guarda apenas contexto
-- estrutural seguro, versões e telemetria suficiente para auditar custo e
-- qualidade antes de definir cotas comerciais.

create type public.practice_generation_status as enum (
  'generating',
  'succeeded',
  'failed',
  'rejected'
);

create type public.practice_generation_trigger as enum (
  'explicit',
  'replacement'
);

create table public.practice_generation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  package_id uuid references public.practice_packages(id) on delete set null,
  idempotency_key uuid not null,
  trigger public.practice_generation_trigger not null,
  status public.practice_generation_status not null default 'generating',
  context_fingerprint text not null check (char_length(context_fingerprint) between 32 and 128),
  request_context jsonb not null default '{}'::jsonb,
  model_id text not null check (char_length(model_id) between 1 and 160),
  prompt_version text not null check (char_length(prompt_version) between 1 and 80),
  schema_version text not null check (char_length(schema_version) between 1 and 80),
  provider_attempt_count smallint not null default 0 check (provider_attempt_count between 0 and 2),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),
  estimated_cost numeric(12, 6) check (estimated_cost is null or estimated_cost >= 0),
  candidate_count smallint not null default 0 check (candidate_count between 0 and 10),
  accepted_count smallint not null default 0 check (accepted_count between 0 and 10),
  rejected_count smallint not null default 0 check (rejected_count between 0 and 10),
  rejection_summary jsonb not null default '[]'::jsonb,
  failure_code text check (failure_code is null or char_length(failure_code) <= 80),
  failure_message text check (failure_message is null or char_length(failure_message) <= 240),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  check (jsonb_typeof(request_context) = 'object'),
  check (jsonb_typeof(rejection_summary) = 'array'),
  check ((status = 'generating') = (finished_at is null)),
  check (accepted_count + rejected_count <= candidate_count)
);

create unique index practice_generation_runs_one_active_topic_idx
  on public.practice_generation_runs (user_id, topic_id)
  where status = 'generating';

create index practice_generation_runs_user_topic_created_idx
  on public.practice_generation_runs (user_id, topic_id, created_at desc);

create index practice_generation_runs_failed_idx
  on public.practice_generation_runs (created_at desc)
  where status in ('failed', 'rejected');

create trigger practice_generation_runs_set_updated_at
before update on public.practice_generation_runs
for each row execute function private.set_practice_updated_at();

alter table public.practice_generation_runs enable row level security;

grant select on table public.practice_generation_runs to authenticated;

create policy practice_generation_runs_select_own
  on public.practice_generation_runs
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- The Edge Function already authenticates the caller and uses service_role.
-- Reserving the run in SQL makes duplicate browser retries deterministic and
-- rejects parallel paid calls for the same student/topic before a provider is
-- contacted. A commercial quota is intentionally not enforced yet: the first
-- batches are for measuring actual token cost and editorial quality.
create or replace function private.reserve_practice_generation(
  p_user_id uuid,
  p_topic_id uuid,
  p_idempotency_key uuid,
  p_trigger public.practice_generation_trigger,
  p_context_fingerprint text,
  p_request_context jsonb,
  p_model_id text,
  p_prompt_version text,
  p_schema_version text
)
returns table (
  generation_id uuid,
  status public.practice_generation_status,
  package_id uuid,
  should_generate boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_generation_id uuid;
  v_status public.practice_generation_status;
  v_package_id uuid;
begin
  if p_user_id is null or p_topic_id is null or p_idempotency_key is null then
    raise exception 'practice generation requires user, topic and idempotency key';
  end if;

  if p_request_context is null or jsonb_typeof(p_request_context) <> 'object' then
    raise exception 'practice generation request context must be an object';
  end if;

  begin
    insert into public.practice_generation_runs (
      user_id,
      topic_id,
      idempotency_key,
      trigger,
      context_fingerprint,
      request_context,
      model_id,
      prompt_version,
      schema_version
    ) values (
      p_user_id,
      p_topic_id,
      p_idempotency_key,
      p_trigger,
      p_context_fingerprint,
      p_request_context,
      p_model_id,
      p_prompt_version,
      p_schema_version
    )
    on conflict (user_id, idempotency_key) do nothing
    returning id, practice_generation_runs.status, practice_generation_runs.package_id
    into v_generation_id, v_status, v_package_id;
  exception
    when unique_violation then
      -- The partial unique index below represents an already-running request
      -- for this topic. Return it instead of paying for a second provider call.
      null;
  end;

  if v_generation_id is not null then
    return query select v_generation_id, v_status, v_package_id, true;
    return;
  end if;

  select id, practice_generation_runs.status, practice_generation_runs.package_id
  into v_generation_id, v_status, v_package_id
  from public.practice_generation_runs
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key;

  if v_generation_id is null then
    select id, practice_generation_runs.status, practice_generation_runs.package_id
    into v_generation_id, v_status, v_package_id
  from public.practice_generation_runs
  where user_id = p_user_id
    and topic_id = p_topic_id
    and practice_generation_runs.status = 'generating'
    order by created_at desc
    limit 1;
  end if;

  if v_generation_id is null then
    raise exception 'practice generation reservation was not created';
  end if;

  return query select v_generation_id, v_status, v_package_id, false;
end;
$$;

revoke all on function private.reserve_practice_generation(
  uuid,
  uuid,
  uuid,
  public.practice_generation_trigger,
  text,
  jsonb,
  text,
  text,
  text
) from public, anon, authenticated;

grant usage on schema private to service_role;
grant execute on function private.reserve_practice_generation(
  uuid,
  uuid,
  uuid,
  public.practice_generation_trigger,
  text,
  jsonb,
  text,
  text,
  text
) to service_role;
