-- PostgREST only exposes configured API schemas (normally `public`). The
-- implementation remains in `private`, but these narrow pass-throughs let the
-- trusted Edge Function invoke it with service_role. Browser roles never gain
-- EXECUTE, so this does not turn the generation ledger into a client API.

create or replace function public.reserve_practice_generation_internal(
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
language sql
security invoker
set search_path = ''
as $$
  select *
  from private.reserve_practice_generation(
    p_user_id,
    p_topic_id,
    p_idempotency_key,
    p_trigger,
    p_context_fingerprint,
    p_request_context,
    p_model_id,
    p_prompt_version,
    p_schema_version
  );
$$;

create or replace function public.complete_practice_generation_internal(
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
language sql
security invoker
set search_path = ''
as $$
  select private.complete_practice_generation(
    p_generation_id,
    p_user_id,
    p_quick_recap,
    p_items,
    p_input_tokens,
    p_output_tokens,
    p_total_tokens,
    p_estimated_cost,
    p_provider_attempt_count,
    p_rejection_summary
  );
$$;

create or replace function public.fail_practice_generation_internal(
  p_generation_id uuid,
  p_user_id uuid,
  p_status public.practice_generation_status,
  p_failure_code text,
  p_failure_message text,
  p_provider_attempt_count smallint,
  p_rejection_summary jsonb default '[]'::jsonb
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.fail_practice_generation(
    p_generation_id,
    p_user_id,
    p_status,
    p_failure_code,
    p_failure_message,
    p_provider_attempt_count,
    p_rejection_summary
  );
$$;

revoke all on function public.reserve_practice_generation_internal(
  uuid, uuid, uuid, public.practice_generation_trigger, text, jsonb, text, text, text
) from public, anon, authenticated;

revoke all on function public.complete_practice_generation_internal(
  uuid, uuid, jsonb, jsonb, integer, integer, integer, numeric, smallint, jsonb
) from public, anon, authenticated;

revoke all on function public.fail_practice_generation_internal(
  uuid, uuid, public.practice_generation_status, text, text, smallint, jsonb
) from public, anon, authenticated;

grant execute on function public.reserve_practice_generation_internal(
  uuid, uuid, uuid, public.practice_generation_trigger, text, jsonb, text, text, text
) to service_role;

grant execute on function public.complete_practice_generation_internal(
  uuid, uuid, jsonb, jsonb, integer, integer, integer, numeric, smallint, jsonb
) to service_role;

grant execute on function public.fail_practice_generation_internal(
  uuid, uuid, public.practice_generation_status, text, text, smallint, jsonb
) to service_role;
