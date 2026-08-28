


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."app_role" AS ENUM (
    'owner',
    'admin',
    'moderator',
    'user'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


COMMENT ON TYPE "public"."app_role" IS 'Enum que define os níveis de acesso no sistema. Hierarquia: owner > admin > moderator > user';



CREATE TYPE "public"."practice_attempt_kind" AS ENUM (
    'objective_answer',
    'flashcard_recall'
);


ALTER TYPE "public"."practice_attempt_kind" OWNER TO "postgres";


CREATE TYPE "public"."practice_attempt_result" AS ENUM (
    'correct',
    'incorrect',
    'skipped',
    'recalled',
    'effortful',
    'forgotten'
);


ALTER TYPE "public"."practice_attempt_result" OWNER TO "postgres";


CREATE TYPE "public"."practice_feedback_reason" AS ENUM (
    'wrong_answer',
    'ambiguous',
    'off_topic',
    'repetitive',
    'too_easy',
    'bad_explanation',
    'other'
);


ALTER TYPE "public"."practice_feedback_reason" OWNER TO "postgres";


CREATE TYPE "public"."practice_item_status" AS ENUM (
    'draft',
    'private_ready',
    'quarantined',
    'retired'
);


ALTER TYPE "public"."practice_item_status" OWNER TO "postgres";


CREATE TYPE "public"."practice_item_type" AS ENUM (
    'flashcard',
    'multiple_choice',
    'true_false'
);


ALTER TYPE "public"."practice_item_type" OWNER TO "postgres";


CREATE TYPE "public"."practice_package_status" AS ENUM (
    'draft',
    'ready',
    'partial',
    'failed',
    'retired'
);


ALTER TYPE "public"."practice_package_status" OWNER TO "postgres";


CREATE TYPE "public"."practice_report_status" AS ENUM (
    'open',
    'reviewed',
    'dismissed'
);


ALTER TYPE "public"."practice_report_status" OWNER TO "postgres";


CREATE TYPE "public"."practice_session_mode" AS ENUM (
    'questions',
    'flashcards_due',
    'quick'
);


ALTER TYPE "public"."practice_session_mode" OWNER TO "postgres";


CREATE TYPE "public"."practice_session_status" AS ENUM (
    'active',
    'completed',
    'abandoned'
);


ALTER TYPE "public"."practice_session_status" OWNER TO "postgres";


CREATE TYPE "public"."subscription_plan" AS ENUM (
    'free_trial',
    'monthly',
    'annual'
);


ALTER TYPE "public"."subscription_plan" OWNER TO "postgres";


COMMENT ON TYPE "public"."subscription_plan" IS 'Tipos de planos disponíveis: free_trial, monthly, annual';



CREATE TYPE "public"."subscription_status" AS ENUM (
    'trial',
    'active',
    'expired',
    'canceled',
    'suspended'
);


ALTER TYPE "public"."subscription_status" OWNER TO "postgres";


COMMENT ON TYPE "public"."subscription_status" IS 'Status da assinatura: trial, active, expired, canceled, suspended';



CREATE OR REPLACE FUNCTION "private"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;


ALTER FUNCTION "private"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."has_role"("check_role" "public"."app_role", "check_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_roles
    where user_id = check_user_id
      and role = check_role
  );
$$;


ALTER FUNCTION "private"."has_role"("check_role" "public"."app_role", "check_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."has_role_or_higher"("_user_id" "uuid", "_min_role" "public"."app_role") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  user_roles_array public.app_role[];
begin
  select array_agg(role) into user_roles_array
  from public.user_roles
  where user_id = _user_id;

  if user_roles_array is null then
    return false;
  end if;

  case _min_role
    when 'user' then
      return user_roles_array && array['user', 'moderator', 'admin', 'owner']::public.app_role[];
    when 'moderator' then
      return user_roles_array && array['moderator', 'admin', 'owner']::public.app_role[];
    when 'admin' then
      return user_roles_array && array['admin', 'owner']::public.app_role[];
    when 'owner' then
      return user_roles_array && array['owner']::public.app_role[];
    else
      return false;
  end case;
end;
$$;


ALTER FUNCTION "private"."has_role_or_higher"("_user_id" "uuid", "_min_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."has_role_or_higher"("min_role" "public"."app_role", "check_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  user_roles_array public.app_role[];
begin
  select array_agg(role) into user_roles_array
  from public.user_roles
  where user_id = check_user_id;

  if user_roles_array is null then
    return false;
  end if;

  case min_role
    when 'user' then
      return user_roles_array && array['user', 'moderator', 'admin', 'owner']::public.app_role[];
    when 'moderator' then
      return user_roles_array && array['moderator', 'admin', 'owner']::public.app_role[];
    when 'admin' then
      return user_roles_array && array['admin', 'owner']::public.app_role[];
    when 'owner' then
      return user_roles_array && array['owner']::public.app_role[];
    else
      return false;
  end case;
end;
$$;


ALTER FUNCTION "private"."has_role_or_higher"("min_role" "public"."app_role", "check_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('admin'::public.app_role, 'owner'::public.app_role)
  );
$$;


ALTER FUNCTION "private"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_owner"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = 'owner'::public.app_role
  );
$$;


ALTER FUNCTION "private"."is_owner"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_user_active"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
  );
$$;


ALTER FUNCTION "private"."is_user_active"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."next_flashcard_schedule"("p_now" timestamp with time zone, "p_state" "jsonb", "p_repetitions" integer, "p_lapses" integer, "p_rating" "public"."practice_attempt_result") RETURNS TABLE("due_at" timestamp with time zone, "state" "jsonb", "repetitions" integer, "lapses" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."next_flashcard_schedule"("p_now" timestamp with time zone, "p_state" "jsonb", "p_repetitions" integer, "p_lapses" integer, "p_rating" "public"."practice_attempt_result") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."set_billing_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."set_billing_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."set_practice_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "private"."set_practice_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_deactivate_user"("target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Update Profile
  UPDATE public.profiles
  SET
    is_active = false,
    deactivated_at = now(),
    deactivated_by = auth.uid()
  WHERE id = target_user_id;

  -- Log Event directly
  INSERT INTO public.user_events (user_id, event_type, metadata)
  VALUES (
    target_user_id,
    'ACCOUNT_DEACTIVATED',
    jsonb_build_object('admin_id', auth.uid())
  );
END;
$$;


ALTER FUNCTION "public"."admin_deactivate_user"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_purge_user"("p_target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_role text;
  v_target_email text;
BEGIN
  SELECT role INTO v_caller_role FROM public.user_roles WHERE user_id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Permissão negada.';
  END IF;

  SELECT email INTO v_target_email FROM auth.users WHERE id = p_target_user_id;
  IF v_target_email IN ('vourevisar@gmail.com', 'darciliok@gmail.com') THEN
    RAISE EXCEPTION 'Usuário protegido.';
  END IF;

  IF p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Auto-exclusão não permitida.';
  END IF;

  DELETE FROM public.cycle_study_logs WHERE user_id = p_target_user_id;
  DELETE FROM public.cycle_subject_states WHERE user_id = p_target_user_id;
  DELETE FROM public.cycle_rotations WHERE cycle_id IN (SELECT id FROM public.study_cycles_v2 WHERE user_id = p_target_user_id);
  DELETE FROM public.study_cycles_v2 WHERE user_id = p_target_user_id;
  DELETE FROM public.topic_review_history WHERE user_id = p_target_user_id;
  DELETE FROM public.topic_merges WHERE user_id = p_target_user_id;
  DELETE FROM public.question_attempts WHERE user_id = p_target_user_id;
  DELETE FROM public.topics WHERE subject_id IN (SELECT id FROM public.subjects WHERE user_id = p_target_user_id);
  DELETE FROM public.subject_merges WHERE user_id = p_target_user_id;
  DELETE FROM public.subject_relations WHERE user_id = p_target_user_id;
  DELETE FROM public.pending_merge_suggestions WHERE user_id = p_target_user_id;
  DELETE FROM public.subjects WHERE user_id = p_target_user_id;
  DELETE FROM public.pending_ai_extractions WHERE user_id = p_target_user_id;
  DELETE FROM public.edital_suggestions WHERE user_id = p_target_user_id;
  DELETE FROM public.pending_cycle_merges WHERE user_id = p_target_user_id;
  DELETE FROM public.user_editais WHERE user_id = p_target_user_id;
  DELETE FROM public.user_cycles WHERE user_id = p_target_user_id;
  DELETE FROM public.study_sessions WHERE user_id = p_target_user_id;
  DELETE FROM public.pomodoro_sessions WHERE user_id = p_target_user_id;
  DELETE FROM public.active_study_timers WHERE user_id = p_target_user_id;
  DELETE FROM public.user_study_analytics WHERE user_id = p_target_user_id;
  DELETE FROM public.general_notes WHERE user_id = p_target_user_id;
  DELETE FROM public.general_reminders WHERE user_id = p_target_user_id;
  DELETE FROM public.notifications WHERE user_id = p_target_user_id;
  DELETE FROM public.user_notifications WHERE user_id = p_target_user_id;
  DELETE FROM public.coupon_uses WHERE user_id = p_target_user_id;
  DELETE FROM public.user_ai_quota_resets WHERE user_id = p_target_user_id;
  DELETE FROM public.user_events WHERE user_id = p_target_user_id;
  DELETE FROM public.api_usage WHERE user_id = p_target_user_id;
  DELETE FROM public.comments WHERE author_id = p_target_user_id;
  DELETE FROM public.posts WHERE author_id = p_target_user_id;
  DELETE FROM public.admin_error_events WHERE target_user_id = p_target_user_id;
  DELETE FROM public.user_feedback_events WHERE actor_user_id = p_target_user_id;
  DELETE FROM public.user_settings WHERE user_id = p_target_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_target_user_id;
  DELETE FROM public.organization_members WHERE user_id = p_target_user_id;

  INSERT INTO public.audit_logs (user_id, action, table_name, changes)
  VALUES (auth.uid(), 'admin_purge_user', 'auth.users', jsonb_build_object(
    'purged_user_id', p_target_user_id,
    'purged_email', v_target_email,
    'purged_at', now()
  ));

  DELETE FROM public.audit_logs WHERE user_id = p_target_user_id;
  DELETE FROM public.profiles WHERE id = p_target_user_id;
  DELETE FROM auth.users WHERE id = p_target_user_id;
END;
$$;


ALTER FUNCTION "public"."admin_purge_user"("p_target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_reactivate_user"("target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Update Profile
  UPDATE public.profiles
  SET
    is_active = true,
    deactivated_at = NULL,
    deactivated_by = NULL
  WHERE id = target_user_id;

  -- Log Event directly
  INSERT INTO public.user_events (user_id, event_type, metadata)
  VALUES (
    target_user_id,
    'ACCOUNT_REACTIVATED',
    jsonb_build_object('admin_id', auth.uid())
  );
END;
$$;


ALTER FUNCTION "public"."admin_reactivate_user"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_rpc_dispatch"("p_action" "text", "p_args" "jsonb" DEFAULT '{}'::"jsonb", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_result jsonb;
begin
  if p_actor_user_id is null then
    raise exception 'Admin RPC actor is required';
  end if;

  perform set_config('request.jwt.claim.sub', p_actor_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  case p_action
    when 'admin_deactivate_user' then
      select to_jsonb(public.admin_deactivate_user((p_args->>'target_user_id')::uuid)) into v_result;
    when 'admin_purge_user' then
      select to_jsonb(public.admin_purge_user((p_args->>'p_target_user_id')::uuid)) into v_result;
    when 'admin_reactivate_user' then
      select to_jsonb(public.admin_reactivate_user((p_args->>'target_user_id')::uuid)) into v_result;
    when 'calculate_slo_metrics' then
      select to_jsonb(public.calculate_slo_metrics((p_args->>'p_days_window')::integer)) into v_result;
    when 'check_error_alerts' then
      select to_jsonb(public.check_error_alerts()) into v_result;
    when 'cleanup_error_logs' then
      select to_jsonb(public.cleanup_error_logs((p_args->>'p_days_retention')::integer)) into v_result;
    when 'get_all_user_roles_admin' then
      select coalesce(jsonb_agg(to_jsonb(row_data)), '[]'::jsonb)
      into v_result
      from public.get_all_user_roles_admin() as row_data;
    when 'get_audit_logs' then
      select coalesce(jsonb_agg(to_jsonb(row_data)), '[]'::jsonb)
      into v_result
      from public.get_audit_logs(
        coalesce((p_args->>'p_limit')::integer, 25),
        coalesce((p_args->>'p_offset')::integer, 0),
        nullif(p_args->>'p_event_type', ''),
        nullif(p_args->>'p_target_user_id', '')::uuid,
        nullif(p_args->>'p_actor_user_id', '')::uuid,
        nullif(p_args->>'p_status', ''),
        nullif(p_args->>'p_start_date', '')::timestamptz,
        nullif(p_args->>'p_end_date', '')::timestamptz
      ) as row_data;
    when 'get_users_by_edital_source' then
      select coalesce(jsonb_agg(to_jsonb(row_data)), '[]'::jsonb)
      into v_result
      from public.get_users_by_edital_source((p_args->>'source_uuid')::uuid) as row_data;
    when 'remove_user_role_admin' then
      select to_jsonb(public.remove_user_role_admin(
        (p_args->>'target_user_id')::uuid,
        (p_args->>'role_to_remove')::public.app_role
      )) into v_result;
    when 'set_user_role' then
      select to_jsonb(public.set_user_role(
        (p_args->>'_target_user_id')::uuid,
        (p_args->>'_role')::public.app_role
      )) into v_result;
    else
      raise exception 'Admin RPC action is not allowed: %', p_action;
  end case;

  return v_result;
end;
$$;


ALTER FUNCTION "public"."admin_rpc_dispatch"("p_action" "text", "p_args" "jsonb", "p_actor_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_role"("_target_user_id" "uuid", "_role" "public"."app_role") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- APENAS owners podem atribuir roles
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Only owners can assign roles';
  END IF;
  
  -- assign_role ADICIONA roles, não remove
  -- A proteção contra remoção de owner está em remove_role e set_user_role
  
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (_target_user_id, _role, auth.uid())
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."assign_role"("_target_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."assign_role"("_target_user_id" "uuid", "_role" "public"."app_role") IS 'Atribui role a usuário. Apenas owners podem executar. Não remove roles existentes.';



CREATE OR REPLACE FUNCTION "public"."assign_user_role_admin"("target_user_id" "uuid", "new_role" "public"."app_role") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_user_id UUID;
  current_user_highest_role app_role;
  target_user_highest_role app_role;
BEGIN
  -- Obter ID do usuário atual
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar role do usuário atual
  SELECT get_highest_user_role(current_user_id) INTO current_user_highest_role;
  
  -- Verificar role atual do usuário alvo
  SELECT get_highest_user_role(target_user_id) INTO target_user_highest_role;

  -- Regras de negócio CORRIGIDAS para atribuição de roles
  CASE new_role
    WHEN 'owner' THEN
      -- Apenas owners podem criar outros owners
      IF current_user_highest_role != 'owner' THEN
        RAISE EXCEPTION 'Apenas proprietários podem atribuir a role de owner';
      END IF;
      
    WHEN 'admin' THEN
      -- Owners e admins podem criar outros admins
      IF NOT has_role_or_higher(current_user_id, 'admin') THEN
        RAISE EXCEPTION 'Apenas admins ou proprietários podem atribuir a role de admin';
      END IF;
      
    WHEN 'moderator' THEN
      -- Admins e owners podem criar moderators
      IF NOT has_role_or_higher(current_user_id, 'admin') THEN
        RAISE EXCEPTION 'Apenas admins ou proprietários podem atribuir a role de moderator';
      END IF;
      
    WHEN 'user' THEN
      -- Moderators e acima podem atribuir role de user
      IF NOT has_role_or_higher(current_user_id, 'moderator') THEN
        RAISE EXCEPTION 'Apenas moderators ou acima podem atribuir a role de user';
      END IF;
      
    ELSE
      RAISE EXCEPTION 'Role inválida: %', new_role;
  END CASE;

  -- Verificar se não está tentando alterar um owner (apenas outros owners podem)
  IF target_user_highest_role = 'owner' AND current_user_highest_role != 'owner' THEN
    RAISE EXCEPTION 'Apenas proprietários podem alterar roles de outros proprietários';
  END IF;

  -- ENFORCE SINGLE ROLE: Delete existing roles first
  DELETE FROM user_roles WHERE user_id = target_user_id;

  -- Inserir a nova role
  INSERT INTO user_roles (user_id, role, assigned_by, assigned_at)
  VALUES (target_user_id, new_role, current_user_id, NOW());

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."assign_user_role_admin"("target_user_id" "uuid", "new_role" "public"."app_role") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."assign_user_role_admin"("target_user_id" "uuid", "new_role" "public"."app_role") IS 'Atribui uma role a um usuário - Admins podem atribuir admin/moderator/user, Owners podem atribuir qualquer role';



CREATE OR REPLACE FUNCTION "public"."atomic_archive_edital_from_cycle"("p_user_id" "uuid", "p_edital_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_edital public.user_editais%rowtype;
  v_cycle public.user_cycles%rowtype;
  v_removed_subject_ids uuid[] := '{}';
  v_removed_topic_ids uuid[] := '{}';
  v_allowed_subject_ids uuid[] := '{}';
  v_missing_cycle text[] := '{}';
  v_topic_merge record;
  v_subject_merge record;
  v_all_ids uuid[];
  v_survivor_ids uuid[];
  v_secondary_ids uuid[];
  v_remaining_edital_ids uuid[];
  v_new_primary uuid;
  v_cycle_subject text;
  v_new_cycle text[] := '{}';
  v_remaining_cycle_name text;
  v_filtered_edital_ids jsonb := '[]'::jsonb;
  v_filtered_subject_groups jsonb := '[]'::jsonb;
  v_unification_map jsonb;
  v_group jsonb;
  v_group_subject_ids jsonb;
  v_active_count integer := 0;
  v_topic_merges_updated integer := 0;
  v_topic_merges_removed integer := 0;
  v_subject_merges_updated integer := 0;
  v_subject_merges_removed integer := 0;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select * into v_edital
  from public.user_editais
  where id = p_edital_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Edital not found for authenticated user' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(subject_id::uuid), '{}'::uuid[])
  into v_removed_subject_ids
  from unnest(coalesce(v_edital.subject_ids, '{}'::text[])) as subject_id
  where subject_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

  select coalesce(array_agg(id), '{}'::uuid[])
  into v_removed_topic_ids
  from public.topics
  where subject_id = any(v_removed_subject_ids);

  select * into v_cycle
  from public.user_cycles
  where user_id = p_user_id
    and coalesce(status, 'active') = 'active'
  order by created_at desc nulls last
  limit 1
  for update;

  for v_topic_merge in
    select *
    from public.topic_merges
    where user_id = p_user_id
      and status = 'active'
      and p_edital_id = any(coalesce(source_edital_ids, '{}'::uuid[]))
    for update
  loop
    select coalesce(array_agg(value::uuid), '{}'::uuid[])
    into v_secondary_ids
    from jsonb_array_elements_text(coalesce(v_topic_merge.merged_topic_ids, '[]'::jsonb)) as value;

    v_all_ids := array_cat(array[v_topic_merge.primary_topic_id], v_secondary_ids);
    v_remaining_edital_ids := array_remove(coalesce(v_topic_merge.source_edital_ids, '{}'::uuid[]), p_edital_id);

    select coalesce(array_agg(id), '{}'::uuid[])
    into v_survivor_ids
    from unnest(v_all_ids) as id
    where not (id = any(v_removed_topic_ids));

    update public.topics
    set parent_topic_id = null,
        is_hidden = false,
        merged_with_ia = false
    where id = any(v_removed_topic_ids)
      and id = any(v_all_ids);

    if cardinality(v_remaining_edital_ids) < 2 or cardinality(v_survivor_ids) < 2 then
      if cardinality(v_survivor_ids) = 1 then
        with best_topic_state as (
          select *
          from public.topics
          where id = any(v_all_ids)
          order by
            coalesce(completed, false) desc,
            coalesce(review_count, 0) desc,
            next_review asc nulls last,
            last_reviewed_at desc nulls last,
            first_studied_at desc nulls last,
            updated_at desc
          limit 1
        )
        update public.topics survivor
        set completed = coalesce(best.completed, survivor.completed),
            review_count = greatest(coalesce(survivor.review_count, 0), coalesce(best.review_count, 0)),
            review_stage = best.review_stage,
            next_review = best.next_review,
            first_studied_at = coalesce(survivor.first_studied_at, best.first_studied_at),
            last_reviewed_at = best.last_reviewed_at,
            memory_stability = coalesce(best.memory_stability, survivor.memory_stability),
            current_interval = coalesce(best.current_interval, survivor.current_interval),
            difficulty_level = coalesce(best.difficulty_level, survivor.difficulty_level),
            difficulty_set_at = coalesce(best.difficulty_set_at, survivor.difficulty_set_at),
            last_session_duration = coalesce(best.last_session_duration, survivor.last_session_duration),
            notes = coalesce(survivor.notes, best.notes),
            is_marked_for_review = coalesce(best.is_marked_for_review, survivor.is_marked_for_review),
            marked_for_review_at = coalesce(best.marked_for_review_at, survivor.marked_for_review_at),
            updated_at = now()
        from best_topic_state best
        where survivor.id = v_survivor_ids[1];
      end if;

      update public.topics
      set parent_topic_id = null,
          is_hidden = false,
          merged_with_ia = false
      where id = any(v_survivor_ids);

      delete from public.topic_merges where id = v_topic_merge.id;
      v_topic_merges_removed := v_topic_merges_removed + 1;
    else
      v_new_primary := case
        when v_topic_merge.primary_topic_id = any(v_survivor_ids) then v_topic_merge.primary_topic_id
        else v_survivor_ids[1]
      end;

      select coalesce(array_agg(id), '{}'::uuid[])
      into v_secondary_ids
      from unnest(v_survivor_ids) as id
      where id <> v_new_primary;

      update public.topic_merges
      set primary_topic_id = v_new_primary,
          merged_topic_ids = to_jsonb(v_secondary_ids),
          source_edital_ids = v_remaining_edital_ids
      where id = v_topic_merge.id;

      update public.topics
      set parent_topic_id = v_new_primary,
          is_hidden = true,
          merged_with_ia = coalesce(v_topic_merge.created_by_ai, false)
      where id = any(v_secondary_ids);

      update public.topics
      set parent_topic_id = null,
          is_hidden = false,
          merged_with_ia = coalesce(v_topic_merge.created_by_ai, false)
      where id = v_new_primary;

      v_topic_merges_updated := v_topic_merges_updated + 1;
    end if;
  end loop;

  for v_subject_merge in
    select *
    from public.subject_merges
    where user_id = p_user_id
      and status = 'active'
      and p_edital_id = any(coalesce(source_edital_ids, '{}'::uuid[]))
    for update
  loop
    select coalesce(array_agg(value::uuid), '{}'::uuid[])
    into v_secondary_ids
    from jsonb_array_elements_text(coalesce(v_subject_merge.merged_subject_ids, '[]'::jsonb)) as value;

    v_all_ids := array_cat(array[v_subject_merge.primary_subject_id], v_secondary_ids);
    v_remaining_edital_ids := array_remove(coalesce(v_subject_merge.source_edital_ids, '{}'::uuid[]), p_edital_id);

    select coalesce(array_agg(id), '{}'::uuid[])
    into v_survivor_ids
    from unnest(v_all_ids) as id
    where not (id = any(v_removed_subject_ids));

    update public.subjects
    set is_unified = false,
        is_visible = true
    where id = any(v_removed_subject_ids)
      and id = any(v_all_ids);

    if cardinality(v_remaining_edital_ids) < 2 or cardinality(v_survivor_ids) < 2 then
      if v_cycle.id is not null
        and cardinality(v_survivor_ids) = 1
        and v_subject_merge.primary_subject_id = any(v_removed_subject_ids)
      then
        v_cycle.ciclo_atual := array_replace(
          coalesce(v_cycle.ciclo_atual, '{}'::text[]),
          v_subject_merge.primary_subject_id::text,
          v_survivor_ids[1]::text
        );
      end if;

      update public.subjects
      set is_unified = false,
          is_visible = true
      where id = any(v_survivor_ids);

      delete from public.subject_merges where id = v_subject_merge.id;
      v_subject_merges_removed := v_subject_merges_removed + 1;
    else
      v_new_primary := case
        when v_subject_merge.primary_subject_id = any(v_survivor_ids) then v_subject_merge.primary_subject_id
        else v_survivor_ids[1]
      end;

      if v_cycle.id is not null and v_new_primary <> v_subject_merge.primary_subject_id then
        v_cycle.ciclo_atual := array_replace(
          coalesce(v_cycle.ciclo_atual, '{}'::text[]),
          v_subject_merge.primary_subject_id::text,
          v_new_primary::text
        );
      end if;

      select coalesce(array_agg(id), '{}'::uuid[])
      into v_secondary_ids
      from unnest(v_survivor_ids) as id
      where id <> v_new_primary;

      update public.subject_merges
      set primary_subject_id = v_new_primary,
          merged_subject_ids = to_jsonb(v_secondary_ids),
          source_edital_ids = v_remaining_edital_ids
      where id = v_subject_merge.id;

      update public.subjects
      set is_unified = true,
          is_visible = false
      where id = any(v_secondary_ids);

      update public.subjects
      set is_unified = false,
          is_visible = true
      where id = v_new_primary;

      v_subject_merges_updated := v_subject_merges_updated + 1;
    end if;
  end loop;

  update public.topics
  set parent_topic_id = null,
      is_hidden = false,
      merged_with_ia = false
  where parent_topic_id = any(v_removed_topic_ids);

  if v_cycle.id is not null then
    foreach v_cycle_subject in array coalesce(v_cycle.ciclo_atual, '{}'::text[])
    loop
      if v_cycle_subject !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or not (v_cycle_subject::uuid = any(v_removed_subject_ids)) then
        v_new_cycle := array_append(v_new_cycle, v_cycle_subject);
      end if;
    end loop;

    select coalesce(array_agg(subject_id order by first_position), '{}'::text[])
    into v_new_cycle
    from (
      select subject_id, min(position) as first_position
      from unnest(v_new_cycle) with ordinality as cycle_subject(subject_id, position)
      group by subject_id
    ) deduplicated;

    v_unification_map := v_cycle.unification_map;
    if v_unification_map is not null then
      select coalesce(jsonb_agg(to_jsonb(edital_id)), '[]'::jsonb)
      into v_filtered_edital_ids
      from jsonb_array_elements_text(coalesce(v_unification_map -> 'editalIds', '[]'::jsonb)) as edital_id
      where edital_id::uuid <> p_edital_id;

      v_filtered_subject_groups := '[]'::jsonb;
      for v_group in
        select value
        from jsonb_array_elements(coalesce(v_unification_map -> 'unifiedSubjects', '[]'::jsonb))
      loop
        select coalesce(jsonb_agg(to_jsonb(subject_id)), '[]'::jsonb)
        into v_group_subject_ids
        from jsonb_array_elements_text(coalesce(v_group -> 'originalSubjectIds', '[]'::jsonb)) as subject_id
        where not (subject_id::uuid = any(v_removed_subject_ids));

        if jsonb_array_length(v_group_subject_ids) > 1 then
          v_filtered_subject_groups := v_filtered_subject_groups || jsonb_build_array(
            jsonb_set(v_group, '{originalSubjectIds}', v_group_subject_ids, true)
          );
        end if;
      end loop;

      if jsonb_array_length(v_filtered_edital_ids) < 2 then
        v_unification_map := null;
      else
        v_unification_map := jsonb_set(v_unification_map, '{editalIds}', v_filtered_edital_ids, true);
        v_unification_map := jsonb_set(v_unification_map, '{unifiedSubjects}', v_filtered_subject_groups, true);
      end if;
    end if;
  end if;

  update public.user_editais
  set merged_into_cycle = false,
      active_subject_ids = '{}',
      cycle_archived_at = coalesce(cycle_archived_at, now())
  where id = p_edital_id
    and user_id = p_user_id;

  select count(*) into v_active_count
  from public.user_editais
  where user_id = p_user_id
    and merged_into_cycle = true;

  update public.user_editais remaining_edital
  set active_subject_ids = rebuilt.active_subject_ids,
      updated_at = now()
  from (
    select
      active_edital.id,
      coalesce(
        array_agg(mapped.active_subject_id::text order by mapped.first_position)
          filter (where mapped.active_subject_id is not null),
        '{}'::text[]
      ) as active_subject_ids
    from public.user_editais active_edital
    left join lateral (
      select
        coalesce(active_merge.primary_subject_id, own_subject.subject_id) as active_subject_id,
        min(own_subject.subject_position) as first_position
      from (
        select
          subject_value::uuid as subject_id,
          subject_position
        from unnest(coalesce(active_edital.subject_ids, '{}'::text[]))
          with ordinality as active_subject(subject_value, subject_position)
        where subject_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      ) own_subject
      left join public.subject_merges active_merge
        on active_merge.user_id = p_user_id
       and active_merge.status = 'active'
       and (
         active_merge.primary_subject_id = own_subject.subject_id
         or exists (
           select 1
           from jsonb_array_elements_text(coalesce(active_merge.merged_subject_ids, '[]'::jsonb)) as merged_subject(subject_id)
           where merged_subject.subject_id::uuid = own_subject.subject_id
         )
       )
      group by coalesce(active_merge.primary_subject_id, own_subject.subject_id)
    ) mapped on true
    where active_edital.user_id = p_user_id
      and active_edital.merged_into_cycle = true
    group by active_edital.id
  ) rebuilt
  where remaining_edital.id = rebuilt.id
    and remaining_edital.user_id = p_user_id
    and remaining_edital.merged_into_cycle = true;

  select coalesce(array_agg(active_subject_id), '{}'::uuid[])
  into v_allowed_subject_ids
  from (
    select distinct active_subject_value::uuid as active_subject_id
    from public.user_editais active_edital
    cross join lateral unnest(coalesce(active_edital.active_subject_ids, '{}'::text[]))
      as active_subject(active_subject_value)
    where active_edital.user_id = p_user_id
      and active_edital.merged_into_cycle = true
      and active_subject_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) allowed_subjects;

  if v_cycle.id is not null then
    if v_active_count = 0 then
      update public.user_cycles
      set ciclo_atual = '{}'::text[],
          materias_estudadas_ciclo = coalesce(materias_estudadas_ciclo, '{}'::text[]),
          materias_pendentes = '{}'::text[],
          materias_estudadas_hoje = '{}'::text[],
          disciplinas_do_dia = '{}'::text[],
          skipped_subjects = '{}'::text[],
          unification_map = null,
          atualizado_em = now()
      where id = v_cycle.id;
    else
      v_new_cycle := '{}'::text[];

      foreach v_cycle_subject in array coalesce(v_cycle.ciclo_atual, '{}'::text[])
      loop
        if v_cycle_subject !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          or not (v_cycle_subject::uuid = any(v_allowed_subject_ids)) then
          continue;
        end if;

        v_new_cycle := array_append(v_new_cycle, v_cycle_subject);
      end loop;

      select coalesce(array_agg(subject_id order by first_position), '{}'::text[])
      into v_new_cycle
      from (
        select subject_id, min(position) as first_position
        from unnest(v_new_cycle) with ordinality as cycle_subject(subject_id, position)
        group by subject_id
      ) deduplicated;

      select coalesce(array_agg(subject_id::text order by first_position), '{}'::text[])
      into v_missing_cycle
      from (
        select
          active_subject_value::uuid as subject_id,
          min(edital_position * 100000 + subject_position) as first_position
        from public.user_editais active_edital
        cross join lateral unnest(coalesce(active_edital.active_subject_ids, '{}'::text[]))
          with ordinality as active_subject(active_subject_value, subject_position)
        cross join lateral (
          select coalesce((
            select min(edital_position)
            from (
              select id, row_number() over (order by created_at nulls last, id) as edital_position
              from public.user_editais
              where user_id = p_user_id
                and merged_into_cycle = true
            ) ordered_editais
            where ordered_editais.id = active_edital.id
          ), 0)::bigint as edital_position
        ) ordered_edital
        where active_edital.user_id = p_user_id
          and active_edital.merged_into_cycle = true
          and active_subject_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          and not (active_subject_value = any(v_new_cycle))
        group by active_subject_value::uuid
      ) missing_subjects;

      v_new_cycle := array_cat(v_new_cycle, v_missing_cycle);

      select coalesce(
        nullif(
          substring(
            string_agg(
              upper(regexp_replace(trim(name), '\s+', ' ', 'g')),
              ' + '
              order by created_at asc nulls last, id
            ),
            1,
            160
          ),
          ''
        ),
        'Ciclo de estudos'
      )
      into v_remaining_cycle_name
      from (
        select distinct on (upper(regexp_replace(trim(name), '\s+', ' ', 'g')))
          name, created_at, id
        from public.user_editais
        where user_id = p_user_id
          and merged_into_cycle = true
        order by upper(regexp_replace(trim(name), '\s+', ' ', 'g')), created_at asc nulls last, id
      ) distinct_editais;

      update public.user_cycles
      set name = coalesce(v_remaining_cycle_name, name),
          ciclo_atual = v_new_cycle,
          unification_map = v_unification_map,
          atualizado_em = now()
      where id = v_cycle.id;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'cycle_deleted', v_cycle.id is not null and v_active_count = 0,
    'cycle_preserved_for_reload', v_cycle.id is not null and v_active_count = 0,
    'remaining_editais', v_active_count,
    'subject_merges_updated', v_subject_merges_updated,
    'subject_merges_removed', v_subject_merges_removed,
    'topic_merges_updated', v_topic_merges_updated,
    'topic_merges_removed', v_topic_merges_removed
  );
end;
$_$;


ALTER FUNCTION "public"."atomic_archive_edital_from_cycle"("p_user_id" "uuid", "p_edital_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atomic_cycle_load"("p_user_id" "uuid", "p_new_edital_id" "uuid", "p_new_subject_ids" "text"[], "p_old_edital_ids" "uuid"[], "p_mode" "text", "p_cycle_name" "text" DEFAULT NULL::"text", "p_exam_date" "date" DEFAULT NULL::"date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_cycle_id uuid;
  v_old_id uuid;
  v_archived_at timestamptz;
  v_now timestamptz := now();
  v_resumed_reviews integer := 0;
  v_cycle_name text := left(coalesce(nullif(trim(p_cycle_name), ''), 'Ciclo de estudos'), 160);
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_mode not in ('replace', 'merge') then
    raise exception 'Invalid cycle load mode' using errcode = '22023';
  end if;

  select cycle_archived_at into v_archived_at
  from public.user_editais
  where id = p_new_edital_id
    and user_id = p_user_id;

  if not found then
    raise exception 'Edital not found for authenticated user' using errcode = 'P0002';
  end if;

  if p_mode = 'replace' and array_length(p_old_edital_ids, 1) > 0 then
    foreach v_old_id in array p_old_edital_ids loop
      update public.user_editais
      set merged_into_cycle = false,
          active_subject_ids = '{}',
          cycle_archived_at = coalesce(cycle_archived_at, v_now)
      where id = v_old_id
        and user_id = p_user_id;
    end loop;
  end if;

  select id into v_cycle_id
  from public.user_cycles
  where user_id = p_user_id
  limit 1;

  if v_cycle_id is not null then
    update public.user_cycles
    set ciclo_atual = p_new_subject_ids,
        name = v_cycle_name,
        exam_date = p_exam_date,
        atualizado_em = v_now
    where id = v_cycle_id;
  else
    insert into public.user_cycles (
      user_id,
      ciclo_atual,
      name,
      exam_date,
      atualizado_em
    )
    values (
      p_user_id,
      p_new_subject_ids,
      v_cycle_name,
      p_exam_date,
      v_now
    )
    returning id into v_cycle_id;
  end if;

  if v_archived_at is not null and v_archived_at < v_now then
    update public.topics
    set next_review = next_review + (v_now - v_archived_at)
    where edital_id = p_new_edital_id
      and completed = false
      and next_review is not null;

    get diagnostics v_resumed_reviews = row_count;
  end if;

  update public.user_editais
  set merged_into_cycle = true,
      active_subject_ids = p_new_subject_ids,
      cycle_archived_at = null
  where id = p_new_edital_id
    and user_id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'cycle_id', v_cycle_id,
    'cycle_name', v_cycle_name,
    'cycle_exam_date', p_exam_date,
    'resumed_reviews', v_resumed_reviews
  );
end;
$$;


ALTER FUNCTION "public"."atomic_cycle_load"("p_user_id" "uuid", "p_new_edital_id" "uuid", "p_new_subject_ids" "text"[], "p_old_edital_ids" "uuid"[], "p_mode" "text", "p_cycle_name" "text", "p_exam_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atomic_cycle_load"("p_user_id" "uuid", "p_new_edital_id" "uuid", "p_new_subject_ids" "text"[], "p_old_edital_ids" "uuid"[], "p_mode" "text", "p_cycle_name" "text" DEFAULT NULL::"text", "p_exam_date" "date" DEFAULT NULL::"date", "p_reset_cycle_state" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_cycle_id uuid;
  v_existing_cycle_subject_ids text[] := '{}';
  v_old_id uuid;
  v_archived_at timestamptz;
  v_now timestamptz := now();
  v_resumed_reviews integer := 0;
  v_should_reset_cycle_state boolean := false;
  v_cycle_name text := left(coalesce(nullif(trim(p_cycle_name), ''), 'Ciclo de estudos'), 160);
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_mode not in ('replace', 'merge') then
    raise exception 'Invalid cycle load mode' using errcode = '22023';
  end if;

  select cycle_archived_at into v_archived_at
  from public.user_editais
  where id = p_new_edital_id
    and user_id = p_user_id;

  if not found then
    raise exception 'Edital not found for authenticated user' using errcode = 'P0002';
  end if;

  select id, coalesce(ciclo_atual, '{}'::text[])
    into v_cycle_id, v_existing_cycle_subject_ids
  from public.user_cycles
  where user_id = p_user_id
  limit 1;

  v_should_reset_cycle_state := p_reset_cycle_state or p_mode = 'replace';

  if p_mode = 'replace' and array_length(p_old_edital_ids, 1) > 0 then
    foreach v_old_id in array p_old_edital_ids loop
      update public.user_editais
      set merged_into_cycle = false,
          active_subject_ids = '{}',
          cycle_archived_at = coalesce(cycle_archived_at, v_now)
      where id = v_old_id
        and user_id = p_user_id;
    end loop;
  end if;

  if v_should_reset_cycle_state and v_cycle_id is not null then
    delete from public.cycle_study_events
    where user_id = p_user_id
      and user_cycle_id = v_cycle_id;

    delete from public.cycle_rotation_snapshots
    where user_id = p_user_id
      and user_cycle_id = v_cycle_id;
  end if;

  if v_cycle_id is not null then
    update public.user_cycles
    set ciclo_atual = p_new_subject_ids,
        name = v_cycle_name,
        exam_date = p_exam_date,
        ciclos_realizados = case when v_should_reset_cycle_state then 0 else ciclos_realizados end,
        materias_estudadas_ciclo = case when v_should_reset_cycle_state then '{}'::text[] else materias_estudadas_ciclo end,
        indice_atual = case when v_should_reset_cycle_state then 0 else indice_atual end,
        data_inicio_ciclo = case when v_should_reset_cycle_state then v_now else data_inicio_ciclo end,
        data_fim_ciclo = case when v_should_reset_cycle_state then null else data_fim_ciclo end,
        atualizado_em = v_now
    where id = v_cycle_id;
  else
    insert into public.user_cycles (
      user_id,
      ciclo_atual,
      name,
      exam_date,
      ciclos_realizados,
      materias_estudadas_ciclo,
      indice_atual,
      data_inicio_ciclo,
      data_fim_ciclo,
      atualizado_em
    )
    values (
      p_user_id,
      p_new_subject_ids,
      v_cycle_name,
      p_exam_date,
      0,
      '{}'::text[],
      0,
      v_now,
      null,
      v_now
    )
    returning id into v_cycle_id;
  end if;

  if v_archived_at is not null and v_archived_at < v_now then
    update public.topics
    set next_review = next_review + (v_now - v_archived_at)
    where edital_id = p_new_edital_id
      and completed = false
      and next_review is not null;

    get diagnostics v_resumed_reviews = row_count;
  end if;

  update public.subjects
  set is_visible = true
  where user_id = p_user_id
    and id::text = any(p_new_subject_ids);

  update public.user_editais
  set merged_into_cycle = true,
      active_subject_ids = p_new_subject_ids,
      cycle_archived_at = null
  where id = p_new_edital_id
    and user_id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'cycle_id', v_cycle_id,
    'cycle_name', v_cycle_name,
    'cycle_exam_date', p_exam_date,
    'resumed_reviews', v_resumed_reviews,
    'cycle_state_reset', v_should_reset_cycle_state
  );
end;
$$;


ALTER FUNCTION "public"."atomic_cycle_load"("p_user_id" "uuid", "p_new_edital_id" "uuid", "p_new_subject_ids" "text"[], "p_old_edital_ids" "uuid"[], "p_mode" "text", "p_cycle_name" "text", "p_exam_date" "date", "p_reset_cycle_state" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atomic_cycle_unload_or_delete"("p_user_id" "uuid", "p_edital_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_cycle_id uuid;
  v_active_count integer;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  update public.user_editais
  set merged_into_cycle = false,
      active_subject_ids = '{}',
      cycle_archived_at = coalesce(cycle_archived_at, now())
  where id = p_edital_id
    and user_id = p_user_id;

  if not found then
    raise exception 'Edital not found for authenticated user' using errcode = 'P0002';
  end if;

  select id into v_cycle_id
  from public.user_cycles
  where user_id = p_user_id
  limit 1;

  if v_cycle_id is null then
    return jsonb_build_object(
      'ok', true,
      'action', 'no_cycle',
      'cycle_deleted', false
    );
  end if;

  select count(*) into v_active_count
  from public.user_editais
  where user_id = p_user_id
    and merged_into_cycle = true;

  if v_active_count = 0 then
    delete from public.user_cycles where id = v_cycle_id;

    return jsonb_build_object(
      'ok', true,
      'action', 'cycle_deleted',
      'cycle_deleted', true,
      'cycle_id', v_cycle_id
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'action', 'edital_unloaded',
    'cycle_deleted', false,
    'remaining_editais', v_active_count
  );
end;
$$;


ALTER FUNCTION "public"."atomic_cycle_unload_or_delete"("p_user_id" "uuid", "p_edital_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atomic_delete_subject"("p_user_id" "uuid", "p_subject_id" "uuid", "p_edital_id_to_remove" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_subject_id uuid;
  v_target_edital_id uuid;
  v_topic_ids uuid[] := '{}'::uuid[];
  v_surviving_subject_ids uuid[] := '{}'::uuid[];
  v_merge_survivors uuid[] := '{}'::uuid[];
  v_merge record;
  v_cycle record;
  v_group jsonb;
  v_unification_map jsonb;
  v_filtered_groups jsonb;
  v_standalone_ids jsonb;
  v_group_subject_ids jsonb;
  v_topics_deleted integer := 0;
  v_history_deleted integer := 0;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select subject.id
  into v_subject_id
  from public.subjects subject
  where subject.id = p_subject_id
    and subject.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Subject not found for authenticated user' using errcode = 'P0002';
  end if;

  if p_edital_id_to_remove is not null then
    select edital.id
    into v_target_edital_id
    from public.user_editais edital
    where edital.id = p_edital_id_to_remove
      and edital.user_id = p_user_id
      and p_subject_id::text = any(coalesce(edital.subject_ids, '{}'::text[]))
    for update;

    if not found then
      raise exception 'Subject is not linked to the selected edital' using errcode = 'P0002';
    end if;

    update public.user_editais
    set subject_ids = array_remove(coalesce(subject_ids, '{}'::text[]), p_subject_id::text),
        active_subject_ids = array_remove(coalesce(active_subject_ids, '{}'::text[]), p_subject_id::text),
        updated_at = now()
    where id = v_target_edital_id
      and user_id = p_user_id;

    if exists (
      select 1
      from public.user_editais edital
      where edital.user_id = p_user_id
        and edital.id <> v_target_edital_id
        and p_subject_id::text = any(coalesce(edital.subject_ids, '{}'::text[]))
    ) then
      return jsonb_build_object(
        'ok', true,
        'subject_deleted', false,
        'edital_unlinked', v_target_edital_id
      );
    end if;
  else
    update public.user_editais
    set subject_ids = array_remove(coalesce(subject_ids, '{}'::text[]), p_subject_id::text),
        active_subject_ids = array_remove(coalesce(active_subject_ids, '{}'::text[]), p_subject_id::text),
        updated_at = now()
    where user_id = p_user_id
      and (
        p_subject_id::text = any(coalesce(subject_ids, '{}'::text[]))
        or p_subject_id::text = any(coalesce(active_subject_ids, '{}'::text[]))
      );
  end if;

  select coalesce(array_agg(topic.id), '{}'::uuid[])
  into v_topic_ids
  from public.topics topic
  where topic.subject_id = p_subject_id;

  v_topics_deleted := cardinality(v_topic_ids);

  select count(*)
  into v_history_deleted
  from public.topic_review_history history
  where history.user_id = p_user_id
    and history.topic_id = any(v_topic_ids);

  for v_merge in
    select merge.*
    from public.topic_merges merge
    where merge.user_id = p_user_id
      and (
        merge.primary_topic_id = any(v_topic_ids)
        or exists (
          select 1
          from unnest(v_topic_ids) topic_id
          where coalesce(merge.merged_topic_ids, '[]'::jsonb) ? topic_id::text
        )
      )
    for update
  loop
    if v_merge.status = 'active' then
      update public.topics topic
      set parent_topic_id = null,
          is_hidden = false,
          merged_with_ia = false
      where topic.id <> all(v_topic_ids)
        and (
          topic.id = v_merge.primary_topic_id
          or coalesce(v_merge.merged_topic_ids, '[]'::jsonb) ? topic.id::text
        );
    end if;

    delete from public.topic_merges where id = v_merge.id;
  end loop;

  for v_merge in
    select merge.*
    from public.subject_merges merge
    where merge.user_id = p_user_id
      and (
        merge.primary_subject_id = p_subject_id
        or coalesce(merge.merged_subject_ids, '[]'::jsonb) ? p_subject_id::text
      )
    for update
  loop
    select coalesce(array_agg(subject.id), '{}'::uuid[])
    into v_merge_survivors
    from public.subjects subject
    where subject.user_id = p_user_id
      and subject.id <> p_subject_id
      and (
        subject.id = v_merge.primary_subject_id
        or coalesce(v_merge.merged_subject_ids, '[]'::jsonb) ? subject.id::text
      );

    if v_merge.status = 'active' then
      update public.subjects subject
      set is_unified = false,
          is_visible = true
      where subject.id = any(v_merge_survivors)
        and subject.user_id = p_user_id;

      select coalesce(array_agg(distinct subject_id), '{}'::uuid[])
      into v_surviving_subject_ids
      from unnest(array_cat(v_surviving_subject_ids, v_merge_survivors)) subject_id;
    end if;

    delete from public.subject_merges where id = v_merge.id;
  end loop;

  delete from public.subject_relations relation
  where relation.user_id = p_user_id
    and (
      relation.main_subject_id = p_subject_id
      or p_subject_id = any(coalesce(relation.merged_subject_ids, '{}'::uuid[]))
    );

  for v_cycle in
    select cycle.*
    from public.user_cycles cycle
    where cycle.user_id = p_user_id
    for update
  loop
    v_unification_map := v_cycle.unification_map;

    if v_unification_map is not null then
      v_filtered_groups := '[]'::jsonb;
      v_standalone_ids := coalesce(v_unification_map -> 'standaloneSubjectIds', '[]'::jsonb);

      for v_group in
        select value
        from jsonb_array_elements(coalesce(v_unification_map -> 'unifiedSubjects', '[]'::jsonb))
      loop
        if coalesce(v_group -> 'originalSubjectIds', '[]'::jsonb) ? p_subject_id::text then
          select coalesce(jsonb_agg(to_jsonb(subject_id)), '[]'::jsonb)
          into v_group_subject_ids
          from jsonb_array_elements_text(coalesce(v_group -> 'originalSubjectIds', '[]'::jsonb)) subject_id
          where subject_id <> p_subject_id::text;

          v_standalone_ids := v_standalone_ids || v_group_subject_ids;
        else
          v_filtered_groups := v_filtered_groups || jsonb_build_array(v_group);
        end if;
      end loop;

      select coalesce(jsonb_agg(to_jsonb(subject_id)), '[]'::jsonb)
      into v_standalone_ids
      from (
        select distinct subject_id
        from jsonb_array_elements_text(v_standalone_ids) subject_id
        where subject_id <> p_subject_id::text
      ) distinct_subjects;

      v_unification_map := jsonb_set(v_unification_map, '{unifiedSubjects}', v_filtered_groups, true);
      v_unification_map := jsonb_set(v_unification_map, '{standaloneSubjectIds}', v_standalone_ids, true);
    end if;

    update public.user_cycles
    set ciclo_atual = (
          select coalesce(array_agg(subject_id order by first_position), '{}'::text[])
          from (
            select subject_id, min(position) as first_position
            from unnest(
              array_cat(
                array_remove(coalesce(v_cycle.ciclo_atual, '{}'::text[]), p_subject_id::text),
                coalesce(v_surviving_subject_ids, '{}'::uuid[])::text[]
              )
            ) with ordinality cycle_subject(subject_id, position)
            group by subject_id
          ) deduplicated
        ),
        disciplinas_do_dia = array_remove(coalesce(v_cycle.disciplinas_do_dia, '{}'::text[]), p_subject_id::text),
        materias_pendentes = array_remove(coalesce(v_cycle.materias_pendentes, '{}'::text[]), p_subject_id::text),
        materias_estudadas_ciclo = array_remove(coalesce(v_cycle.materias_estudadas_ciclo, '{}'::text[]), p_subject_id::text),
        materias_estudadas_hoje = array_remove(coalesce(v_cycle.materias_estudadas_hoje, '{}'::text[]), p_subject_id::text),
        skipped_subjects = array_remove(coalesce(v_cycle.skipped_subjects, '{}'::text[]), p_subject_id::text),
        unification_map = v_unification_map,
        atualizado_em = now()
    where id = v_cycle.id;
  end loop;

  delete from public.subjects subject
  where subject.id = p_subject_id
    and subject.user_id = p_user_id;

  if not found then
    raise exception 'Subject delete was rejected' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'ok', true,
    'subject_deleted', true,
    'topics_deleted', v_topics_deleted,
    'history_deleted', v_history_deleted
  );
end;
$$;


ALTER FUNCTION "public"."atomic_delete_subject"("p_user_id" "uuid", "p_subject_id" "uuid", "p_edital_id_to_remove" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_trigger_function"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  old_values JSONB := '{}';
  new_values JSONB := '{}';
  changes JSONB := '{}';
  action_type TEXT;
BEGIN
  -- Determina o tipo de ação
  IF TG_OP = 'DELETE' THEN
    action_type := 'DELETE';
    old_values := to_jsonb(OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'UPDATE';
    old_values := to_jsonb(OLD);
    new_values := to_jsonb(NEW);
    
    -- Calcula apenas os campos que mudaram
    SELECT jsonb_object_agg(key, value) INTO changes
    FROM jsonb_each(new_values)
    WHERE value IS DISTINCT FROM old_values->key;
    
  ELSIF TG_OP = 'INSERT' THEN
    action_type := 'INSERT';
    new_values := to_jsonb(NEW);
  END IF;

  -- Insere no log de auditoria
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    changes,
    created_at
  ) VALUES (
    auth.uid(),
    action_type,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    old_values,
    new_values,
    changes,
    now()
  );

  -- Retorna o registro apropriado
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


ALTER FUNCTION "public"."audit_trigger_function"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."audit_trigger_function"() IS 'Função genérica de auditoria. Registra automaticamente INSERT, UPDATE e DELETE em qualquer tabela.';



CREATE OR REPLACE FUNCTION "public"."audit_user_roles_function"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  action_type TEXT;
  target_email TEXT;
  assigner_email TEXT;
BEGIN
  -- Busca emails para o log
  SELECT email INTO target_email 
  FROM auth.users 
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  
  SELECT email INTO assigner_email 
  FROM auth.users 
  WHERE id = auth.uid();

  -- Determina ação
  IF TG_OP = 'DELETE' THEN
    action_type := 'ROLE_REMOVED';
  ELSIF TG_OP = 'INSERT' THEN
    action_type := 'ROLE_ASSIGNED';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'ROLE_UPDATED';
  END IF;

  -- Log especial para mudanças de roles
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    changes,
    created_at
  ) VALUES (
    auth.uid(),
    action_type,
    'user_roles',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN OLD IS NOT NULL THEN 
      jsonb_build_object(
        'user_email', target_email,
        'role', OLD.role,
        'assigned_by', assigner_email
      ) 
    ELSE '{}' END,
    CASE WHEN NEW IS NOT NULL THEN 
      jsonb_build_object(
        'user_email', target_email,
        'role', NEW.role,
        'assigned_by', assigner_email
      ) 
    ELSE '{}' END,
    jsonb_build_object(
      'target_user', target_email,
      'role_change', COALESCE(NEW.role::TEXT, OLD.role::TEXT),
      'action_by', assigner_email
    ),
    now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


ALTER FUNCTION "public"."audit_user_roles_function"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."audit_user_roles_function"() IS 'Função especializada para auditoria de mudanças de roles. Inclui emails e contexto adicional.';



CREATE OR REPLACE FUNCTION "public"."auto_assign_user_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Inserir role "user" para o novo usuário
  INSERT INTO user_roles (user_id, role, assigned_by, assigned_at)
  VALUES (NEW.id, 'user'::app_role, NEW.id, NOW())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_assign_user_role"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_assign_user_role"() IS 'Atribui automaticamente a role "user" para novos usuários';



CREATE OR REPLACE FUNCTION "public"."calculate_difficulty_points"("p_user_id" "uuid", "p_start_date" "date" DEFAULT (CURRENT_DATE - '30 days'::interval)) RETURNS TABLE("total_points" integer, "topics_completed" integer, "avg_difficulty" numeric, "points_breakdown" "jsonb")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH completed_topics AS (
    SELECT 
      t.difficulty_level,
      COUNT(*) as count,
      SUM(get_points_by_difficulty(t.difficulty_level)) as points
    FROM topics t
    INNER JOIN subjects s ON t.subject_id = s.id
    WHERE s.user_id = p_user_id
      AND t.completed = true
      AND (t.last_reviewed_at IS NULL OR DATE(t.last_reviewed_at) >= p_start_date)
    GROUP BY t.difficulty_level
  )
  SELECT 
    COALESCE(SUM(ct.points), 0)::INTEGER as total_points,
    COALESCE(SUM(ct.count), 0)::INTEGER as topics_completed,
    ROUND(AVG(CASE WHEN ct.difficulty_level IS NOT NULL THEN ct.difficulty_level::DECIMAL ELSE 3 END), 2) as avg_difficulty,
    COALESCE(
      jsonb_object_agg(
        COALESCE(ct.difficulty_level::text, 'unrated'),
        jsonb_build_object('count', ct.count, 'points', ct.points)
      ) FILTER (WHERE ct.count > 0),
      '{}'::jsonb
    ) as points_breakdown
  FROM completed_topics ct;
END;
$$;


ALTER FUNCTION "public"."calculate_difficulty_points"("p_user_id" "uuid", "p_start_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_slo_metrics"("p_days_window" integer DEFAULT 7) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_total_critical INT;
    v_resolved_critical_in_4h INT;
    v_total_high INT;
    v_resolved_high_in_24h INT;
    v_recurrence_rate NUMERIC;
    v_data_start TIMESTAMPTZ;
BEGIN
    v_data_start := NOW() - (p_days_window || ' days')::INTERVAL;

    -- SLO 1: Critical <= 4h (Using updated_at as resolution time)
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE updated_at <= created_at + INTERVAL '4 hours')
    INTO v_total_critical, v_resolved_critical_in_4h
    FROM admin_error_events
    WHERE severity = 'critical'
      AND created_at >= v_data_start
      AND status = 'resolved';

    -- SLO 2: High <= 24h
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE updated_at <= created_at + INTERVAL '24 hours')
    INTO v_total_high, v_resolved_high_in_24h
    FROM admin_error_events
    WHERE severity = 'high'
      AND created_at >= v_data_start
      AND status = 'resolved';

    -- SLO 4: Recorrência
    SELECT 
        COALESCE(AVG(CASE WHEN occurrence_count > 1 THEN 1 ELSE 0 END) * 100, 0)
    INTO v_recurrence_rate
    FROM admin_error_events
    WHERE created_at >= v_data_start;

    RETURN jsonb_build_object(
        'critical_within_4h_pct', CASE WHEN v_total_critical > 0 THEN ROUND((v_resolved_critical_in_4h::NUMERIC / v_total_critical) * 100, 2) ELSE 100 END,
        'high_within_24h_pct', CASE WHEN v_total_high > 0 THEN ROUND((v_resolved_high_in_24h::NUMERIC / v_total_high) * 100, 2) ELSE 100 END,
        'recurrence_rate', ROUND(v_recurrence_rate, 2),
        'total_critical', v_total_critical,
        'total_high', v_total_high
    );
END;
$$;


ALTER FUNCTION "public"."calculate_slo_metrics"("p_days_window" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_user_analytics"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_total_sessoes INTEGER;
  v_media_sessoes DECIMAL(4,2);
  v_melhor_horario INTEGER;
  v_melhor_dia INTEGER;
  v_pior_dia INTEGER;
  v_streak_atual INTEGER;
  v_horarios_pico INTEGER[];
  v_dias_produtivos INTEGER[];
BEGIN
  -- Calcular métricas básicas dos últimos 90 dias (SEM duration)
  SELECT 
    COUNT(*),
    COUNT(*)::DECIMAL / GREATEST(1, (CURRENT_DATE - MIN(study_date) + 1))
  INTO v_total_sessoes, v_media_sessoes
  FROM study_sessions 
  WHERE user_id = p_user_id 
    AND study_date >= CURRENT_DATE - INTERVAL '90 days';
  
  -- Encontrar melhor horário (mais sessões)
  SELECT hour_of_day
  INTO v_melhor_horario
  FROM study_sessions 
  WHERE user_id = p_user_id 
    AND study_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY hour_of_day
  ORDER BY COUNT(*) DESC, AVG(topics_count) DESC
  LIMIT 1;
  
  -- Encontrar melhor e pior dia da semana
  WITH dias_stats AS (
    SELECT 
      day_of_week,
      COUNT(*) as sessoes,
      AVG(topics_count) as produtividade
    FROM study_sessions 
    WHERE user_id = p_user_id 
      AND study_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY day_of_week
  )
  SELECT 
    (SELECT day_of_week FROM dias_stats ORDER BY produtividade DESC LIMIT 1),
    (SELECT day_of_week FROM dias_stats ORDER BY produtividade ASC LIMIT 1)
  INTO v_melhor_dia, v_pior_dia;
  
  -- Calcular horários de pico (top 3)
  SELECT array_agg(hour_of_day ORDER BY sessoes DESC)
  INTO v_horarios_pico
  FROM (
    SELECT hour_of_day, COUNT(*) as sessoes
    FROM study_sessions 
    WHERE user_id = p_user_id 
      AND study_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY hour_of_day
    ORDER BY sessoes DESC
    LIMIT 3
  ) t;
  
  -- Calcular dias mais produtivos (top 3)
  SELECT array_agg(day_of_week ORDER BY produtividade DESC)
  INTO v_dias_produtivos
  FROM (
    SELECT day_of_week, AVG(topics_count) as produtividade
    FROM study_sessions 
    WHERE user_id = p_user_id 
      AND study_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY day_of_week
    ORDER BY produtividade DESC
    LIMIT 3
  ) t;
  
  -- Buscar streak atual do user_cycles
  SELECT COALESCE(streak_dias_consecutivos, 0)
  INTO v_streak_atual
  FROM user_cycles
  WHERE user_id = p_user_id;
  
  IF v_streak_atual IS NULL THEN
    v_streak_atual := 0;
  END IF;
  
  -- Inserir ou atualizar analytics
  INSERT INTO user_study_analytics (
    user_id,
    total_sessoes,
    total_horas_estudadas,
    media_sessoes_por_dia,
    media_duracao_sessao,
    horario_mais_produtivo,
    melhor_dia_semana,
    pior_dia_semana,
    streak_atual,
    maior_streak,
    horarios_pico,
    dias_mais_produtivos,
    calculado_em
  ) VALUES (
    p_user_id,
    v_total_sessoes,
    0, -- total_horas_estudadas (sem duration)
    v_media_sessoes,
    0, -- media_duracao_sessao (sem duration)
    v_melhor_horario,
    v_melhor_dia,
    v_pior_dia,
    v_streak_atual,
    v_streak_atual, -- maior_streak
    v_horarios_pico,
    v_dias_produtivos,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_sessoes = EXCLUDED.total_sessoes,
    total_horas_estudadas = EXCLUDED.total_horas_estudadas,
    media_sessoes_por_dia = EXCLUDED.media_sessoes_por_dia,
    media_duracao_sessao = EXCLUDED.media_duracao_sessao,
    horario_mais_produtivo = EXCLUDED.horario_mais_produtivo,
    melhor_dia_semana = EXCLUDED.melhor_dia_semana,
    pior_dia_semana = EXCLUDED.pior_dia_semana,
    streak_atual = EXCLUDED.streak_atual,
    maior_streak = EXCLUDED.maior_streak,
    horarios_pico = EXCLUDED.horarios_pico,
    dias_mais_produtivos = EXCLUDED.dias_mais_produtivos,
    calculado_em = EXCLUDED.calculado_em,
    updated_at = NOW();
    
END;
$$;


ALTER FUNCTION "public"."calculate_user_analytics"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_ai_circuit_breaker"("p_daily_limit_usd" numeric) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_total_cost NUMERIC;
BEGIN
  -- Somar custo acumulado hoje UTC na tabela de telemetria
  SELECT COALESCE(SUM(cost_estimate), 0) INTO v_total_cost
  FROM public.ai_usage_logs
  WHERE created_at >= DATE_TRUNC('day', NOW());

  -- Retorna true se estiver abaixo do limite configurado
  RETURN v_total_cost < p_daily_limit_usd;
END;
$$;


ALTER FUNCTION "public"."check_ai_circuit_breaker"("p_daily_limit_usd" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_email_exists"("email_to_check" "text") RETURNS TABLE("email_exists" boolean, "provider_type" "text", "email_confirmed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    true AS email_exists,
    CASE
      WHEN au.raw_user_meta_data->>'iss' = 'https://accounts.google.com'
        OR au.raw_app_meta_data->>'provider' = 'google'
        OR au.raw_app_meta_data->'providers' ? 'google'
      THEN 'Google'
      ELSE COALESCE(p.provider_type, 'Email')
    END AS provider_type,
    (au.email_confirmed_at IS NOT NULL OR au.confirmed_at IS NOT NULL) AS email_confirmed
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  WHERE lower(au.email) = lower(email_to_check)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Unknown'::text, false;
  END IF;
END;
$$;


ALTER FUNCTION "public"."check_email_exists"("email_to_check" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_error_alerts"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_critical_recent INT;
    v_high_spike_fingerprint TEXT;
BEGIN
    -- ALERTA A: >= 3 critical novos em 15 min
    SELECT COUNT(*) INTO v_critical_recent
    FROM admin_error_events
    WHERE severity = 'critical' 
      AND status = 'new'
      AND created_at >= NOW() - INTERVAL '15 minutes';

    IF v_critical_recent >= 3 THEN
        INSERT INTO admin_alert_events (alert_type, message, metadata, status)
        VALUES ('critical_spike', 'Detectado spike de erros CRÍTICOS (' || v_critical_recent || ') nos últimos 15 min.', jsonb_build_object('count', v_critical_recent), 'active')
        ON CONFLICT DO NOTHING;
    END IF;

    -- ALERTA B: mesmo fingerprint high/critical >= 5 ocorrências em 30 min
    FOR v_high_spike_fingerprint IN 
        SELECT fingerprint 
        FROM admin_error_events 
        WHERE severity IN ('high', 'critical') 
          AND created_at >= NOW() - INTERVAL '30 minutes'
        GROUP BY fingerprint
        HAVING COUNT(*) >= 5
    LOOP
        INSERT INTO admin_alert_events (alert_type, message, metadata, status)
        VALUES ('high_recurrence', 'Fingerprint recorrente detectado (5+ em 30min).', jsonb_build_object('fingerprint', v_high_spike_fingerprint), 'active')
        ON CONFLICT DO NOTHING;
    END LOOP;
    
    -- ALERTA C: módulo core com aumento > 200% em 1h
    INSERT INTO admin_alert_events (alert_type, message, metadata, status)
    SELECT 
        'module_explosion', 
        'Explosão de erros no módulo ' || module || ' (>20/h)', 
        jsonb_build_object('module', module, 'count', COUNT(*)),
        'active'
    FROM admin_error_events
    WHERE scope = 'core'
      AND created_at >= NOW() - INTERVAL '1 hour'
    GROUP BY module
    HAVING COUNT(*) > 20;

END;
$$;


ALTER FUNCTION "public"."check_error_alerts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("p_user_id" "uuid", "p_endpoint" "text", "p_max_per_hour" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate the start of the current hour window
  v_window_start := DATE_TRUNC('hour', NOW());
  
  -- Count requests in current window
  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM api_usage
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start >= v_window_start;
  
  -- Return true if under limit
  RETURN v_count < p_max_per_hour;
END;
$$;


ALTER FUNCTION "public"."check_rate_limit"("p_user_id" "uuid", "p_endpoint" "text", "p_max_per_hour" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_billing_refund_request"("p_refund_request_id" "uuid", "p_user_id" "uuid", "p_livemode" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  claimed_id uuid;
BEGIN
  UPDATE public.billing_refund_requests
  SET
    status = 'processing',
    processing_started_at = now(),
    processing_attempts = processing_attempts + 1,
    error_code = NULL
  WHERE id = p_refund_request_id
    AND user_id = p_user_id
    AND livemode = p_livemode
    AND (
      status = 'requested'
      OR (
        status = 'processing'
        AND processing_started_at < now() - interval '5 minutes'
      )
    )
  RETURNING id INTO claimed_id;

  RETURN claimed_id IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."claim_billing_refund_request"("p_refund_request_id" "uuid", "p_user_id" "uuid", "p_livemode" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_error_logs"("p_days_retention" integer DEFAULT 30) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    -- Delete logs older than retention period, BUT PRESERVE:
    -- 1. Critical errors that are NOT resolved (status != 'resolved')
    -- 2. High recurrence errors (occurrence_count >= 20) regardless of status (for historical analysis)
    
    WITH deleted_rows AS (
        DELETE FROM admin_error_events
        WHERE created_at < NOW() - (p_days_retention || ' days')::INTERVAL
          -- Condition to DELETE:
          AND (
            -- Not critical OR (Critical but resolved)
            (severity != 'critical' OR status = 'resolved')
            AND
            -- Not high recurrence
            (occurrence_count < 20)
          )
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_count FROM deleted_rows;

    -- Log audit log event for cleanup
    -- (Assuming log_user_event exists, otherwise skip or implement simpler log)
    -- This is a system action, so actor_user_id might be null or system user
    
    RETURN format('Limpeza concluída. %s registros removidos (politica: >%s dias, exceto críticos abertos e alta recorrência).', v_deleted_count, p_days_retention);
END;
$$;


ALTER FUNCTION "public"."cleanup_error_logs"("p_days_retention" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_merges_on_edital_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Pegar IDs das matérias do edital deletado
    -- Limpar pending_cycle_merges
    DELETE FROM pending_cycle_merges 
    WHERE edital_id = OLD.id;
    
    -- Remover subject_merges cujas matérias pertenciam a este edital
    -- Primeiro pegar as matérias do edital
    DELETE FROM topic_merges 
    WHERE subject_merge_id IN (
        SELECT sm.id FROM subject_merges sm
        JOIN subjects s ON s.id = sm.primary_subject_id
        WHERE s.edital_id = OLD.id
    );
    
    DELETE FROM subject_merges 
    WHERE primary_subject_id IN (
        SELECT id FROM subjects WHERE edital_id = OLD.id
    );
    
    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."cleanup_merges_on_edital_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_audit_logs"("_days_to_keep" integer DEFAULT 365) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Apenas owners podem limpar logs
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Only owners can cleanup audit logs';
  END IF;

  -- Remove logs mais antigos que X dias
  DELETE FROM public.audit_logs 
  WHERE created_at < (now() - (_days_to_keep || ' days')::INTERVAL);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log da limpeza
  PERFORM public.log_custom_action(
    'AUDIT_CLEANUP',
    'audit_logs',
    NULL,
    jsonb_build_object(
      'days_kept', _days_to_keep,
      'records_deleted', deleted_count
    )
  );
  
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_audit_logs"("_days_to_keep" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_audit_logs"("_days_to_keep" integer) IS 'Remove logs de auditoria antigos. Apenas owners podem executar. Padrão: mantém 1 ano.';



CREATE OR REPLACE FUNCTION "public"."cleanup_subject_merges_on_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Remover topic_merges relacionados aos subject_merges da matéria
    DELETE FROM topic_merges 
    WHERE subject_merge_id IN (
        SELECT id FROM subject_merges 
        WHERE primary_subject_id = OLD.id 
           OR merged_subject_ids @> JSONB_BUILD_ARRAY(OLD.id)
    );
    
    -- Remover subject_merges da matéria
    DELETE FROM subject_merges 
    WHERE primary_subject_id = OLD.id 
       OR merged_subject_ids @> JSONB_BUILD_ARRAY(OLD.id);
    
    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."cleanup_subject_merges_on_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_practice_session_internal"("p_user_id" "uuid", "p_topic_id" "uuid", "p_mode" "public"."practice_session_mode", "p_idempotency_key" "uuid", "p_signal_snapshot" "jsonb", "p_items" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."create_practice_session_internal"("p_user_id" "uuid", "p_topic_id" "uuid", "p_mode" "public"."practice_session_mode", "p_idempotency_key" "uuid", "p_signal_snapshot" "jsonb", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_feedback_protocol"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.protocol_code := 'FBK-' || LPAD(nextval('feedback_protocol_seq')::text, 5, '0');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_feedback_protocol"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_topics_admin"("page_number" integer, "page_size" integer) RETURNS TABLE("id" "uuid", "name" "text", "subject_name" "text", "last_trend_check_at" timestamp with time zone, "is_skipped" boolean, "skip_reason" "text", "created_at" timestamp with time zone, "user_email" "text", "total_volume" integer, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.name,
        COALESCE(s.name, 'Sem Matéria') as subject_name,
        t.last_trend_check_at,
        t.is_skipped,
        t.skip_reason,
        t.created_at,
        (SELECT u.email::text FROM auth.users u WHERE u.id = s.user_id) as user_email,
        COALESCE(t.total_volume, 0) as total_volume,
        COUNT(*) OVER() as total_count
    FROM
        topics t
    LEFT JOIN
        subjects s ON t.subject_id = s.id
    ORDER BY
        t.last_trend_check_at DESC NULLS LAST,
        t.created_at DESC
    LIMIT
        page_size
    OFFSET
        (page_number - 1) * page_size;
END;
$$;


ALTER FUNCTION "public"."get_all_topics_admin"("page_number" integer, "page_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_user_roles_admin"() RETURNS TABLE("user_id" "uuid", "role" "public"."app_role")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verificar se o usuário atual é admin ou owner
  IF NOT (
    SELECT has_role_or_higher(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas admins podem ver roles de usuários.';
  END IF;

  RETURN QUERY
  SELECT ur.user_id, ur.role
  FROM user_roles ur;
END;
$$;


ALTER FUNCTION "public"."get_all_user_roles_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_all_user_roles_admin"() IS 'Retorna todas as roles de todos os usuários (apenas para admins+)';



CREATE OR REPLACE FUNCTION "public"."get_audit_logs"("p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0, "p_event_type" "text" DEFAULT NULL::"text", "p_target_user_id" "uuid" DEFAULT NULL::"uuid", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid", "p_status" "text" DEFAULT NULL::"text", "p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("id" bigint, "event_type" "text", "occurred_at" timestamp with time zone, "target_user_id" "uuid", "target_user_name" "text", "target_user_email" "text", "actor_user_id" "uuid", "actor_user_name" "text", "actor_user_email" "text", "source" "text", "status" "text", "metadata" "jsonb", "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_total bigint;
BEGIN
  -- Security check: only admins can access this
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'owner')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get total count for pagination
  SELECT COUNT(*) INTO v_total
  FROM public.user_events ue
  WHERE (p_event_type IS NULL OR ue.event_type = p_event_type)
    AND (p_target_user_id IS NULL OR ue.target_user_id = p_target_user_id)
    AND (p_actor_user_id IS NULL OR ue.actor_user_id = p_actor_user_id)
    AND (p_status IS NULL OR ue.status = p_status)
    AND (p_start_date IS NULL OR ue.occurred_at >= p_start_date)
    AND (p_end_date IS NULL OR ue.occurred_at <= p_end_date);

  -- Return paginated results with user info
  RETURN QUERY
  SELECT 
    ue.id,
    ue.event_type,
    ue.occurred_at,
    ue.target_user_id,
    tp.name as target_user_name,
    tp.email as target_user_email,
    ue.actor_user_id,
    ap.name as actor_user_name,
    ap.email as actor_user_email,
    ue.source,
    ue.status,
    ue.metadata,
    v_total as total_count
  FROM public.user_events ue
  LEFT JOIN public.profiles tp ON tp.id = ue.target_user_id
  LEFT JOIN public.profiles ap ON ap.id = ue.actor_user_id
  WHERE (p_event_type IS NULL OR ue.event_type = p_event_type)
    AND (p_target_user_id IS NULL OR ue.target_user_id = p_target_user_id)
    AND (p_actor_user_id IS NULL OR ue.actor_user_id = p_actor_user_id)
    AND (p_status IS NULL OR ue.status = p_status)
    AND (p_start_date IS NULL OR ue.occurred_at >= p_start_date)
    AND (p_end_date IS NULL OR ue.occurred_at <= p_end_date)
  ORDER BY ue.occurred_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_audit_logs"("p_limit" integer, "p_offset" integer, "p_event_type" "text", "p_target_user_id" "uuid", "p_actor_user_id" "uuid", "p_status" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_daily_progress"("p_user_id" "uuid") RETURNS TABLE("studied_count" integer, "daily_goal" integer, "progress_percentage" numeric, "studied_subjects" "text"[], "remaining_count" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(array_length(uc.materias_estudadas_hoje, 1), 0) as studied_count,
    uc.materias_por_dia as daily_goal,
    ROUND(
      (COALESCE(array_length(uc.materias_estudadas_hoje, 1), 0)::DECIMAL / uc.materias_por_dia::DECIMAL) * 100, 
      2
    ) as progress_percentage,
    COALESCE(uc.materias_estudadas_hoje, '{}') as studied_subjects,
    GREATEST(0, uc.materias_por_dia - COALESCE(array_length(uc.materias_estudadas_hoje, 1), 0)) as remaining_count
  FROM user_cycles uc
  WHERE uc.user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."get_daily_progress"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_estimated_time_by_difficulty"("p_difficulty" integer) RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN CASE 
    WHEN p_difficulty = 1 THEN 8   -- Muito fácil: 8 min
    WHEN p_difficulty = 2 THEN 12  -- Fácil: 12 min
    WHEN p_difficulty = 3 THEN 20  -- Médio: 20 min
    WHEN p_difficulty = 4 THEN 35  -- Difícil: 35 min
    WHEN p_difficulty = 5 THEN 50  -- Muito difícil: 50 min
    ELSE 15 -- Padrão: 15 min
  END;
END;
$$;


ALTER FUNCTION "public"."get_estimated_time_by_difficulty"("p_difficulty" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_highest_user_role"("target_user_id" "uuid") RETURNS "public"."app_role"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  highest_role app_role;
BEGIN
  SELECT role INTO highest_role
  FROM user_roles ur
  WHERE ur.user_id = target_user_id
  ORDER BY 
    CASE role
      WHEN 'owner' THEN 4
      WHEN 'admin' THEN 3
      WHEN 'moderator' THEN 2
      WHEN 'user' THEN 1
    END DESC
  LIMIT 1;
  
  RETURN highest_role;
END;
$$;


ALTER FUNCTION "public"."get_highest_user_role"("target_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_highest_user_role"("target_user_id" "uuid") IS 'Retorna a role mais alta de um usuário específico';



CREATE OR REPLACE FUNCTION "public"."get_my_auth_methods"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT jsonb_build_object(
    'has_password', COALESCE(target.encrypted_password, '') <> '',
    'providers', COALESCE((
      SELECT jsonb_agg(DISTINCT identity.provider ORDER BY identity.provider)
      FROM auth.identities AS identity
      WHERE identity.user_id = target.id
    ), '[]'::jsonb)
  )
  FROM auth.users AS target
  WHERE target.id = (SELECT auth.uid())
$$;


ALTER FUNCTION "public"."get_my_auth_methods"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_my_auth_methods"() IS 'Returns only the current user authentication capabilities for account-security UI.';



CREATE OR REPLACE FUNCTION "public"."get_organization_role"("_org_id" "uuid", "_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM public.organization_members 
  WHERE organization_id = _org_id 
  AND user_id = _user_id
$$;


ALTER FUNCTION "public"."get_organization_role"("_org_id" "uuid", "_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_organization_role"("_org_id" "uuid", "_user_id" "uuid") IS 'Retorna a role do usuário em uma organização específica.';



CREATE OR REPLACE FUNCTION "public"."get_points_by_difficulty"("p_difficulty" integer) RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN CASE 
    WHEN p_difficulty = 1 THEN 1   -- ⭐ = 1 ponto
    WHEN p_difficulty = 2 THEN 2   -- ⭐⭐ = 2 pontos
    WHEN p_difficulty = 3 THEN 4   -- ⭐⭐⭐ = 4 pontos
    WHEN p_difficulty = 4 THEN 7   -- ⭐⭐⭐⭐ = 7 pontos
    WHEN p_difficulty = 5 THEN 12  -- ⭐⭐⭐⭐⭐ = 12 pontos
    ELSE 3 -- Padrão: 3 pontos
  END;
END;
$$;


ALTER FUNCTION "public"."get_points_by_difficulty"("p_difficulty" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_practice_item_answer_internal"("p_user_id" "uuid", "p_session_id" "uuid", "p_item_id" "uuid", "p_flashcard_only" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."get_practice_item_answer_internal"("p_user_id" "uuid", "p_session_id" "uuid", "p_item_id" "uuid", "p_flashcard_only" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_role_audit_log"("_limit" integer DEFAULT 50) RETURNS TABLE("user_id" "uuid", "user_email" character varying, "role" "public"."app_role", "assigned_at" timestamp with time zone, "assigned_by" "uuid", "assigned_by_email" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- APENAS owners podem ver logs de auditoria
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Only owners can view audit logs';
  END IF;
  
  RETURN QUERY
  SELECT 
    ur.user_id,
    au_target.email as user_email,
    ur.role,
    ur.assigned_at,
    ur.assigned_by,
    au_assigner.email as assigned_by_email
  FROM public.user_roles ur
  LEFT JOIN auth.users au_target ON au_target.id = ur.user_id
  LEFT JOIN auth.users au_assigner ON au_assigner.id = ur.assigned_by
  ORDER BY ur.assigned_at DESC
  LIMIT _limit;
END;
$$;


ALTER FUNCTION "public"."get_role_audit_log"("_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_role_audit_log"("_limit" integer) IS 'Retorna log de auditoria das atribuições de roles. Mostra quem atribuiu o que e quando. Apenas owners.';



CREATE OR REPLACE FUNCTION "public"."get_stripe_billing_overview"("p_livemode" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  caller_id uuid := auth.uid();
  current_customer_id uuid;
  current_customer_updated_at timestamptz;
  subscription_record public.billing_subscriptions%ROWTYPE;
  grant_record public.billing_access_grants%ROWTYPE;
  acceptance_record public.billing_contract_acceptances%ROWTYPE;
  refund_record public.billing_refund_requests%ROWTYPE;
  effective_plan text;
  effective_status text;
  effective_source text;
  effective_end timestamptz;
  subscription_effective_end timestamptz;
  is_active boolean := false;
  withdrawal_eligible boolean := false;
  withdrawal_canceled boolean := false;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT id, updated_at
  INTO current_customer_id, current_customer_updated_at
  FROM public.billing_customers
  WHERE user_id = caller_id
    AND livemode = p_livemode
  LIMIT 1;

  SELECT subscription.*
  INTO subscription_record
  FROM public.billing_subscriptions AS subscription
  JOIN public.billing_customers AS customer
    ON customer.id = subscription.billing_customer_id
  WHERE subscription.user_id = caller_id
    AND customer.livemode = p_livemode
    AND subscription.billing_customer_id = current_customer_id
    AND subscription.updated_at >= COALESCE(current_customer_updated_at, 'infinity'::timestamptz)
  ORDER BY
    CASE subscription.status
      WHEN 'active' THEN 1
      WHEN 'trialing' THEN 2
      WHEN 'past_due' THEN 3
      WHEN 'incomplete' THEN 4
      ELSE 5
    END,
    subscription.updated_at DESC
  LIMIT 1;

  IF subscription_record.id IS NOT NULL THEN
    subscription_effective_end := CASE
      WHEN subscription_record.cancel_at IS NOT NULL
        AND subscription_record.current_period_end IS NOT NULL
        THEN LEAST(subscription_record.cancel_at, subscription_record.current_period_end)
      ELSE COALESCE(subscription_record.cancel_at, subscription_record.current_period_end)
    END;

    SELECT acceptance.*
    INTO acceptance_record
    FROM public.billing_contract_acceptances AS acceptance
    WHERE acceptance.user_id = caller_id
      AND acceptance.livemode = p_livemode
      AND acceptance.billing_subscription_id = subscription_record.id
    ORDER BY acceptance.created_at DESC
    LIMIT 1;

    IF acceptance_record.id IS NOT NULL THEN
      SELECT refund.*
      INTO refund_record
      FROM public.billing_refund_requests AS refund
      WHERE refund.user_id = caller_id
        AND refund.livemode = p_livemode
        AND refund.billing_contract_acceptance_id = acceptance_record.id
      ORDER BY refund.created_at DESC
      LIMIT 1;

      withdrawal_canceled := refund_record.id IS NOT NULL
        AND refund_record.subscription_cancel_status = 'succeeded';
    END IF;
  END IF;

  SELECT access_grant.*
  INTO grant_record
  FROM public.billing_access_grants AS access_grant
  WHERE access_grant.user_id = caller_id
    AND access_grant.revoked_at IS NULL
    AND access_grant.starts_at <= now()
    AND access_grant.ends_at > now()
    AND NOT (
      access_grant.source = 'trial'
      AND subscription_record.id IS NOT NULL
      AND NOT withdrawal_canceled
    )
  ORDER BY
    CASE access_grant.source
      WHEN 'manual' THEN 1
      WHEN 'goodwill' THEN 2
      WHEN 'migration' THEN 3
      ELSE 4
    END,
    access_grant.ends_at DESC
  LIMIT 1;

  IF subscription_record.id IS NOT NULL
    AND NOT withdrawal_canceled
    AND subscription_record.status IN ('active', 'trialing', 'past_due')
    AND subscription_record.access_suspended_at IS NULL
    AND subscription_effective_end IS NOT NULL
    AND subscription_effective_end > now()
  THEN
    is_active := true;
    effective_plan := subscription_record.plan_code;
    effective_status := subscription_record.status;
    effective_source := 'stripe';
    effective_end := subscription_effective_end;
  ELSIF grant_record.id IS NOT NULL THEN
    is_active := true;
    effective_plan := grant_record.plan_code;
    effective_status := CASE
      WHEN grant_record.source = 'trial' THEN 'trial'
      ELSE 'active'
    END;
    effective_source := grant_record.source;
    effective_end := grant_record.ends_at;
  ELSE
    effective_plan := COALESCE(subscription_record.plan_code, 'free_trial');
    effective_status := CASE
      WHEN withdrawal_canceled THEN 'canceled'
      ELSE COALESCE(subscription_record.status, 'inactive')
    END;
    effective_source := CASE
      WHEN subscription_record.id IS NOT NULL THEN 'stripe'
      ELSE 'none'
    END;
    effective_end := CASE
      WHEN withdrawal_canceled THEN refund_record.requested_at
      ELSE subscription_effective_end
    END;
  END IF;

  withdrawal_eligible := effective_source = 'stripe'
    AND NOT withdrawal_canceled
    AND subscription_record.status IN ('active', 'trialing', 'past_due')
    AND acceptance_record.id IS NOT NULL
    AND acceptance_record.contracted_at IS NOT NULL
    AND acceptance_record.withdrawal_deadline IS NOT NULL
    AND now() >= acceptance_record.contracted_at
    AND now() <= acceptance_record.withdrawal_deadline
    AND refund_record.id IS NULL;

  RETURN jsonb_build_object(
    'is_active', is_active,
    'source', effective_source,
    'plan', effective_plan,
    'status', effective_status,
    'access_until', effective_end,
    'withdrawal', jsonb_build_object(
      'eligible', withdrawal_eligible,
      'deadline', acceptance_record.withdrawal_deadline,
      'status', refund_record.status,
      'requested_at', refund_record.requested_at,
      'result_at', refund_record.processed_at
    ),
    -- The historical subscription remains sanitized and read-only so the
    -- account can show its refunded financial history without presenting the
    -- old plan or card as the current source of access.
    'subscription', CASE
      WHEN subscription_record.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'plan', subscription_record.plan_code,
        'status', CASE
          WHEN withdrawal_canceled THEN 'canceled'
          ELSE subscription_record.status
        END,
        'amount_cents', subscription_record.amount_cents,
        'currency', subscription_record.currency,
        'billing_interval', subscription_record.billing_interval,
        'current_period_start', subscription_record.current_period_start,
        'current_period_end', subscription_record.current_period_end,
        'cancel_at_period_end', (
          withdrawal_canceled
          OR subscription_record.cancel_at_period_end
          OR subscription_record.cancel_at IS NOT NULL
        ),
        'cancel_at', CASE
          WHEN withdrawal_canceled THEN refund_record.requested_at
          ELSE subscription_record.cancel_at
        END,
        'canceled_at', COALESCE(
          subscription_record.canceled_at,
          CASE WHEN withdrawal_canceled THEN refund_record.requested_at ELSE NULL END
        ),
        'scheduled_plan', subscription_record.scheduled_plan_code,
        'card_brand', subscription_record.card_brand,
        'card_last4', subscription_record.card_last4,
        'access_suspended_at', subscription_record.access_suspended_at,
        'access_suspension_reason', subscription_record.access_suspension_reason,
        'updated_at', subscription_record.updated_at
      )
    END
  );
END;
$$;


ALTER FUNCTION "public"."get_stripe_billing_overview"("p_livemode" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_subscription_info"("check_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_target_user_id uuid := COALESCE(check_user_id, auth.uid());
  v_caller_user_id uuid := auth.uid();
  v_caller_role text := auth.role();
  v_subscription public.billing_subscriptions%ROWTYPE;
  v_grant public.billing_access_grants%ROWTYPE;
  v_access_end timestamptz;
  v_plan text := 'free_trial';
  v_status text := 'expired';
  v_is_active boolean := false;
BEGIN
  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'user id is required' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(v_caller_role, '') <> 'service_role'
    AND (
      v_caller_user_id IS NULL
      OR (
        v_caller_user_id <> v_target_user_id
        AND NOT EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = v_caller_user_id AND role IN ('admin', 'owner')
        )
      )
    )
  THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT subscription.*
  INTO v_subscription
  FROM public.billing_subscriptions AS subscription
  WHERE subscription.user_id = v_target_user_id
  ORDER BY
    CASE subscription.status
      WHEN 'active' THEN 1
      WHEN 'trialing' THEN 2
      WHEN 'past_due' THEN 3
      WHEN 'incomplete' THEN 4
      ELSE 5
    END,
    subscription.updated_at DESC
  LIMIT 1;

  IF v_subscription.id IS NOT NULL THEN
    v_access_end := CASE
      WHEN v_subscription.cancel_at IS NOT NULL
        AND v_subscription.current_period_end IS NOT NULL
        THEN LEAST(v_subscription.cancel_at, v_subscription.current_period_end)
      ELSE COALESCE(v_subscription.cancel_at, v_subscription.current_period_end)
    END;
  END IF;

  SELECT access_grant.*
  INTO v_grant
  FROM public.billing_access_grants AS access_grant
  WHERE access_grant.user_id = v_target_user_id
    AND access_grant.revoked_at IS NULL
    AND access_grant.starts_at <= now()
    AND access_grant.ends_at > now()
  ORDER BY
    CASE access_grant.source
      WHEN 'manual' THEN 1
      WHEN 'goodwill' THEN 2
      WHEN 'trial' THEN 3
      ELSE 4
    END,
    access_grant.ends_at DESC
  LIMIT 1;

  IF v_subscription.id IS NOT NULL
    AND v_subscription.status IN ('active', 'trialing', 'past_due')
    AND v_subscription.access_suspended_at IS NULL
    AND v_access_end IS NOT NULL
    AND v_access_end > now()
  THEN
    v_plan := v_subscription.plan_code;
    v_status := CASE WHEN v_subscription.status = 'trialing' THEN 'trial' ELSE 'active' END;
    v_is_active := true;
  ELSIF v_grant.id IS NOT NULL THEN
    v_plan := v_grant.plan_code;
    v_status := CASE WHEN v_grant.source = 'trial' THEN 'trial' ELSE 'active' END;
    v_access_end := v_grant.ends_at;
    v_is_active := true;
  END IF;

  RETURN json_build_object(
    'user_id', v_target_user_id,
    'plan', v_plan,
    'status', v_status,
    'is_active', v_is_active,
    'days_remaining', CASE
      WHEN v_is_active AND v_access_end IS NOT NULL
        THEN GREATEST(CEIL(EXTRACT(EPOCH FROM (v_access_end - now())) / 86400)::integer, 0)
      ELSE 0
    END,
    'trial_ends_at', CASE WHEN v_status = 'trial' THEN v_access_end ELSE NULL END,
    'subscription_ends_at', CASE WHEN v_plan IN ('monthly', 'annual') THEN v_access_end ELSE NULL END
  );
END;
$$;


ALTER FUNCTION "public"."get_subscription_info"("check_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unified_subject_name"("subject_id" "uuid", "user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  merge_record RECORD;
BEGIN
  SELECT sm.display_name INTO merge_record
  FROM public.subject_merges AS sm
  WHERE sm.primary_subject_id = $1
    AND sm.user_id = $2
    AND sm.status = 'active'
  LIMIT 1;

  IF FOUND THEN RETURN merge_record.display_name; END IF;

  SELECT sm.display_name INTO merge_record
  FROM public.subject_merges AS sm
  WHERE sm.merged_subject_ids ?| ARRAY[$1::text]
    AND sm.user_id = $2
    AND sm.status = 'active'
  LIMIT 1;

  IF FOUND THEN RETURN merge_record.display_name; END IF;
  RETURN NULL;
END;
$_$;


ALTER FUNCTION "public"."get_unified_subject_name"("subject_id" "uuid", "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unified_topic_name"("topic_id" "uuid", "user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  merge_record RECORD;
BEGIN
  SELECT tm.display_name INTO merge_record
  FROM public.topic_merges AS tm
  WHERE tm.primary_topic_id = $1
    AND tm.user_id = $2
    AND tm.status = 'active'
  LIMIT 1;

  IF FOUND THEN RETURN merge_record.display_name; END IF;

  SELECT tm.display_name INTO merge_record
  FROM public.topic_merges AS tm
  WHERE tm.merged_topic_ids ?| ARRAY[$1::text]
    AND tm.user_id = $2
    AND tm.status = 'active'
  LIMIT 1;

  IF FOUND THEN RETURN merge_record.display_name; END IF;
  RETURN NULL;
END;
$_$;


ALTER FUNCTION "public"."get_unified_topic_name"("topic_id" "uuid", "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_ai_limits"("p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text := auth.role();
  v_role text;
  v_subscription public.billing_subscriptions%ROWTYPE;
  v_grant public.billing_access_grants%ROWTYPE;
  v_subscription_end timestamptz;
  v_plan text := 'free_trial';
  v_status text := 'expired';
  v_limit integer := 0;
  v_usage integer := 0;
  v_remaining integer := 0;
  v_usage_period text := 'lifetime';
  v_has_bypass boolean := false;
  v_reset_at timestamptz;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(v_caller_role, '') <> 'service_role'
    AND (
      v_caller_id IS NULL
      OR (
        v_caller_id <> p_user_id
        AND NOT EXISTS (
          SELECT 1
          FROM public.user_roles
          WHERE user_id = v_caller_id AND role IN ('admin', 'owner')
        )
      )
    )
  THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT role
  INTO v_role
  FROM public.user_roles
  WHERE user_id = p_user_id AND role IN ('admin', 'owner')
  LIMIT 1;

  IF v_role IS NOT NULL THEN
    SELECT COUNT(*)::integer
    INTO v_usage
    FROM public.user_editais
    WHERE user_id = p_user_id
      AND ai_extraction_used = true
      AND created_at >= DATE_TRUNC('month', NOW());

    RETURN json_build_object(
      'plan', 'admin', 'status', 'active', 'effective_plan', 'admin',
      'effective_status', 'active', 'limit', -1, 'usage', v_usage,
      'remaining', null, 'usage_period', 'monthly', 'has_bypass', true,
      'can_import', true
    );
  END IF;

  SELECT subscription.*
  INTO v_subscription
  FROM public.billing_subscriptions AS subscription
  WHERE subscription.user_id = p_user_id
  ORDER BY
    CASE subscription.status
      WHEN 'active' THEN 1
      WHEN 'trialing' THEN 2
      WHEN 'past_due' THEN 3
      WHEN 'incomplete' THEN 4
      ELSE 5
    END,
    subscription.updated_at DESC
  LIMIT 1;

  IF v_subscription.id IS NOT NULL THEN
    v_subscription_end := CASE
      WHEN v_subscription.cancel_at IS NOT NULL
        AND v_subscription.current_period_end IS NOT NULL
        THEN LEAST(v_subscription.cancel_at, v_subscription.current_period_end)
      ELSE COALESCE(v_subscription.cancel_at, v_subscription.current_period_end)
    END;
  END IF;

  SELECT access_grant.*
  INTO v_grant
  FROM public.billing_access_grants AS access_grant
  WHERE access_grant.user_id = p_user_id
    AND access_grant.revoked_at IS NULL
    AND access_grant.starts_at <= NOW()
    AND access_grant.ends_at > NOW()
  ORDER BY
    CASE access_grant.source
      WHEN 'manual' THEN 1
      WHEN 'goodwill' THEN 2
      WHEN 'trial' THEN 3
      ELSE 4
    END,
    access_grant.ends_at DESC
  LIMIT 1;

  IF v_subscription.id IS NOT NULL
    AND v_subscription.status IN ('active', 'trialing', 'past_due')
    AND v_subscription.access_suspended_at IS NULL
    AND v_subscription_end IS NOT NULL
    AND v_subscription_end > NOW()
  THEN
    v_plan := v_subscription.plan_code;
    v_status := 'active';
  ELSIF v_grant.id IS NOT NULL THEN
    v_plan := v_grant.plan_code;
    v_status := CASE WHEN v_grant.source = 'trial' THEN 'trial' ELSE 'active' END;
  END IF;

  IF v_plan IN ('monthly', 'annual') AND v_status = 'active' THEN
    v_usage_period := 'monthly';
    v_limit := CASE WHEN v_plan = 'annual' THEN 10 ELSE 5 END;
  ELSIF v_plan = 'free_trial' AND v_status = 'trial' THEN
    v_limit := 1;
  ELSE
    v_plan := 'free_trial';
    v_status := 'expired';
  END IF;

  SELECT reset_at
  INTO v_reset_at
  FROM public.user_ai_quota_resets
  WHERE user_id = p_user_id;

  IF v_usage_period = 'monthly' THEN
    SELECT COUNT(*)::integer
    INTO v_usage
    FROM public.user_editais
    WHERE user_id = p_user_id
      AND ai_extraction_used = true
      AND created_at >= GREATEST(
        DATE_TRUNC('month', NOW()),
        COALESCE(v_reset_at, '-infinity'::timestamptz)
      );
  ELSE
    SELECT COUNT(*)::integer
    INTO v_usage
    FROM public.user_editais
    WHERE user_id = p_user_id
      AND ai_extraction_used = true
      AND created_at >= COALESCE(v_reset_at, '-infinity'::timestamptz);
  END IF;

  v_remaining := GREATEST(v_limit - v_usage, 0);

  RETURN json_build_object(
    'plan', v_plan, 'status', v_status,
    'limit', v_limit, 'usage', v_usage, 'remaining', v_remaining,
    'usage_period', v_usage_period, 'has_bypass', v_has_bypass,
    'can_import', v_usage < v_limit
  );
END;
$$;


ALTER FUNCTION "public"."get_user_ai_limits"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_difficulty_stats"("p_user_id" "uuid") RETURNS TABLE("total_topics" integer, "topics_with_difficulty" integer, "avg_difficulty" numeric, "difficulty_distribution" "jsonb", "estimated_study_time" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH topic_stats AS (
    SELECT 
      t.difficulty_level,
      COUNT(*) as count,
      SUM(get_estimated_time_by_difficulty(t.difficulty_level)) as estimated_minutes
    FROM topics t
    INNER JOIN subjects s ON t.subject_id = s.id
    WHERE s.user_id = p_user_id
    GROUP BY t.difficulty_level
  )
  SELECT 
    COALESCE(SUM(ts.count), 0)::INTEGER as total_topics,
    COALESCE(SUM(CASE WHEN ts.difficulty_level IS NOT NULL THEN ts.count ELSE 0 END), 0)::INTEGER as topics_with_difficulty,
    ROUND(AVG(CASE WHEN ts.difficulty_level IS NOT NULL THEN ts.difficulty_level::DECIMAL ELSE NULL END), 2) as avg_difficulty,
    COALESCE(
      jsonb_object_agg(
        COALESCE(ts.difficulty_level::text, 'unrated'), 
        ts.count
      ) FILTER (WHERE ts.count > 0),
      '{}'::jsonb
    ) as difficulty_distribution,
    COALESCE(SUM(ts.estimated_minutes), 0)::INTEGER as estimated_study_time
  FROM topic_stats ts;
END;
$$;


ALTER FUNCTION "public"."get_user_difficulty_stats"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_info"("_user_id" "uuid") RETURNS TABLE("user_id" "uuid", "email" character varying, "roles" "text"[], "highest_role" "public"."app_role", "role_history" "jsonb", "created_at" timestamp with time zone, "last_sign_in_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- APENAS owners podem ver informações detalhadas
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Only owners can view user information';
  END IF;
  
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email,
    COALESCE(ARRAY_AGG(ur.role::TEXT), ARRAY[]::TEXT[]) as roles,
    CASE 
      WHEN 'owner' = ANY(ARRAY_AGG(ur.role)) THEN 'owner'::app_role
      WHEN 'admin' = ANY(ARRAY_AGG(ur.role)) THEN 'admin'::app_role
      WHEN 'moderator' = ANY(ARRAY_AGG(ur.role)) THEN 'moderator'::app_role
      WHEN 'user' = ANY(ARRAY_AGG(ur.role)) THEN 'user'::app_role
      ELSE NULL::app_role
    END as highest_role,
    COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'role', ur.role,
          'assigned_at', ur.assigned_at,
          'assigned_by', ur.assigned_by
        )
      ) FILTER (WHERE ur.role IS NOT NULL),
      '[]'::JSONB
    ) as role_history,
    au.created_at,
    au.last_sign_in_at
  FROM auth.users au
  LEFT JOIN public.user_roles ur ON ur.user_id = au.id
  WHERE au.id = _user_id
  GROUP BY au.id, au.email, au.created_at, au.last_sign_in_at;
END;
$$;


ALTER FUNCTION "public"."get_user_info"("_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_info"("_user_id" "uuid") IS 'Obtém informações completas de um usuário específico, incluindo histórico de roles. Apenas owners.';



CREATE OR REPLACE FUNCTION "public"."get_user_roles"("user_id" "uuid") RETURNS TABLE("role" "public"."app_role")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = get_user_roles.user_id;
END;
$$;


ALTER FUNCTION "public"."get_user_roles"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_users_by_edital_source"("source_uuid" "uuid") RETURNS TABLE("user_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT ue.user_id::UUID
  FROM user_editais ue
  WHERE ue.source_id::text = source_uuid::text; -- Cast para texto resolve 'text = uuid'
END;
$$;


ALTER FUNCTION "public"."get_users_by_edital_source"("source_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_weighted_reviews"("p_user_id" "uuid", "p_limit" integer DEFAULT 1000, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "name" "text", "subject_id" "uuid", "review_stage" "text", "next_review" timestamp with time zone, "review_count" integer, "first_studied_at" timestamp with time zone, "last_reviewed_at" timestamp with time zone, "completed" boolean, "difficulty_level" integer, "notes" "jsonb", "subject_name" "text", "subject_color" "text", "priority_score" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_exam_date DATE;
  v_week_zero_start DATE;
BEGIN
  -- Buscar data da prova do usuário
  SELECT data_prova_meta INTO v_exam_date
  FROM user_settings
  WHERE user_id = p_user_id;
  
  -- Calcular início da Semana Zero (prova - 7 dias)
  IF v_exam_date IS NOT NULL THEN
    v_week_zero_start := v_exam_date - INTERVAL '7 days';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.subject_id,
    t.review_stage,
    t.next_review,
    COALESCE(t.review_count, 0) as review_count,
    t.first_studied_at,
    t.last_reviewed_at,
    COALESCE(t.completed, false) as completed,
    t.difficulty_level,
    t.notes,
    s.name as subject_name,
    s.color as subject_color,
    CASE
      -- Prioridade 1: R1 ou R2 (Emergência - Curto Prazo)
      WHEN COALESCE(t.review_count, 0) <= 2 AND t.review_stage NOT IN ('Concluído', 'Primeiro Contato') THEN 1
      WHEN t.review_stage IN ('24h', 'R1', 'R2', '7d') THEN 1
      
      -- Prioridade 2: Revisões na Semana Zero (comprimidas pelo Prompt 4)
      WHEN v_exam_date IS NOT NULL 
           AND t.next_review::date >= v_week_zero_start 
           AND t.next_review::date <= v_exam_date THEN 2
      
      -- Prioridade 3: Difíceis (4 ou 5 estrelas)
      WHEN t.difficulty_level >= 4 THEN 3
      
      -- Prioridade 4: Backlog Geral
      ELSE 4
    END as priority_score
  FROM topics t
  JOIN subjects s ON t.subject_id = s.id
  WHERE
    s.user_id = p_user_id
    AND t.next_review IS NOT NULL
  ORDER BY
    -- Ordenação Primária: Score de Prioridade (1 → 2 → 3 → 4)
    priority_score ASC,
    -- Ordenação Secundária: 
    -- Para backlog (prioridade 4), mostrar mais recentes primeiro
    -- Para outros, ordenar cronologicamente
    CASE 
      WHEN priority_score = 4 THEN t.next_review 
      ELSE t.next_review 
    END ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_weighted_reviews"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url, provider_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    CASE
      WHEN NEW.raw_user_meta_data->>'iss' = 'https://accounts.google.com' THEN 'Google'
      WHEN NEW.raw_user_meta_data->>'provider_type' IS NOT NULL THEN NEW.raw_user_meta_data->>'provider_type'
      ELSE 'Email'
    END
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.billing_access_grants (
    user_id, source, plan_code, starts_at, ends_at, reason
  ) VALUES (
    NEW.id, 'trial', 'free_trial', now(), now() + interval '7 days', 'Teste gratuito inicial'
  ) ON CONFLICT (user_id) WHERE source = 'trial' DO NOTHING;

  IF NEW.raw_user_meta_data->>'legal_documents_accepted' = 'true' THEN
    IF NEW.raw_user_meta_data->>'terms_version' <> '2026-08-21.1'
      OR NEW.raw_user_meta_data->>'privacy_version' <> '2026-08-21.1'
    THEN
      RAISE EXCEPTION 'legal document version mismatch' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.legal_document_acceptances (
      user_id, acceptance_context, terms_version, privacy_version
    ) VALUES (
      NEW.id,
      'signup_trial',
      NEW.raw_user_meta_data->>'terms_version',
      NEW.raw_user_meta_data->>'privacy_version'
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_topic_orphan_recovery"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Se o parent_topic_id for setado como NULL (via ON DELETE SET NULL automático da FK pai)
    -- OU se for atualizado manualmente para NULL
    -- E o tópico estiver oculto
    IF NEW.parent_topic_id IS NULL AND OLD.parent_topic_id IS NOT NULL AND NEW.is_hidden = true THEN
        NEW.is_hidden := false;
        NEW.merged_with_ia := false;
        -- Log da operação (opcional, pode ser visto via logs do postgres se habilitado)
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_topic_orphan_recovery"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") IS 'Verifica se usuário tem role específica. SECURITY DEFINER evita recursão infinita em RLS policies.';



CREATE OR REPLACE FUNCTION "public"."has_role"("check_role" "public"."app_role", "check_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Retorna true se o usuário tem a role especificada
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = check_user_id 
    AND role = check_role
  );
END;
$$;


ALTER FUNCTION "public"."has_role"("check_role" "public"."app_role", "check_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_role"("check_role" "public"."app_role", "check_user_id" "uuid") IS 'Verifica se um usuário tem uma role específica. Uso: SELECT has_role(''admin'', user_id)';



CREATE OR REPLACE FUNCTION "public"."has_role_or_higher"("_user_id" "uuid", "_min_role" "public"."app_role") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_roles_array app_role[];
BEGIN
  SELECT ARRAY_AGG(role) INTO user_roles_array
  FROM public.user_roles 
  WHERE user_id = _user_id;
  
  IF user_roles_array IS NULL THEN
    RETURN FALSE;
  END IF;
  
  CASE _min_role
    WHEN 'user' THEN 
      RETURN user_roles_array && ARRAY['user', 'moderator', 'admin', 'owner']::app_role[];
    WHEN 'moderator' THEN 
      RETURN user_roles_array && ARRAY['moderator', 'admin', 'owner']::app_role[];
    WHEN 'admin' THEN 
      RETURN user_roles_array && ARRAY['admin', 'owner']::app_role[];
    WHEN 'owner' THEN 
      RETURN user_roles_array && ARRAY['owner']::app_role[];
    ELSE 
      RETURN FALSE;
  END CASE;
END;
$$;


ALTER FUNCTION "public"."has_role_or_higher"("_user_id" "uuid", "_min_role" "public"."app_role") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_role_or_higher"("_user_id" "uuid", "_min_role" "public"."app_role") IS 'Versão SECURITY DEFINER da verificação de hierarquia. Evita problemas de RLS em policies complexas.';



CREATE OR REPLACE FUNCTION "public"."has_role_or_higher"("min_role" "public"."app_role", "check_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_roles_array app_role[];
BEGIN
  -- Busca todas as roles do usuário
  SELECT ARRAY_AGG(role) INTO user_roles_array
  FROM user_roles 
  WHERE user_id = check_user_id;
  
  -- Se não tem roles, retorna false
  IF user_roles_array IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verifica hierarquia (owner > admin > moderator > user)
  CASE min_role
    WHEN 'user' THEN 
      RETURN user_roles_array && ARRAY['user', 'moderator', 'admin', 'owner']::app_role[];
    WHEN 'moderator' THEN 
      RETURN user_roles_array && ARRAY['moderator', 'admin', 'owner']::app_role[];
    WHEN 'admin' THEN 
      RETURN user_roles_array && ARRAY['admin', 'owner']::app_role[];
    WHEN 'owner' THEN 
      RETURN user_roles_array && ARRAY['owner']::app_role[];
    ELSE 
      RETURN FALSE;
  END CASE;
END;
$$;


ALTER FUNCTION "public"."has_role_or_higher"("min_role" "public"."app_role", "check_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_role_or_higher"("min_role" "public"."app_role", "check_user_id" "uuid") IS 'Verifica se um usuário tem uma role igual ou superior na hierarquia. Uso: SELECT has_role_or_higher(''moderator'')';



CREATE OR REPLACE FUNCTION "public"."internal_get_auth_methods"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("user_id" "uuid", "has_password" boolean, "providers" "text"[])
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT
    target.id,
    COALESCE(target.encrypted_password, '') <> '' AS has_password,
    COALESCE((
      SELECT array_agg(DISTINCT identity.provider ORDER BY identity.provider)
      FROM auth.identities AS identity
      WHERE identity.user_id = target.id
    ), ARRAY[]::text[]) AS providers
  FROM auth.users AS target
  WHERE p_user_id IS NULL OR target.id = p_user_id
$$;


ALTER FUNCTION "public"."internal_get_auth_methods"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."internal_get_auth_methods"("p_user_id" "uuid") IS 'Returns authentication capabilities to trusted service-role Edge Functions only.';



CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin'::public.app_role, 'owner'::public.app_role)
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_organization_member"("_org_id" "uuid", "_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = _org_id 
    AND user_id = _user_id
  )
$$;


ALTER FUNCTION "public"."is_organization_member"("_org_id" "uuid", "_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_organization_member"("_org_id" "uuid", "_user_id" "uuid") IS 'Verifica se usuário é membro de uma organização. Usado em policies complexas.';



CREATE OR REPLACE FUNCTION "public"."is_owner"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'owner'::public.app_role
  );
$$;


ALTER FUNCTION "public"."is_owner"("_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_owner"("_user_id" "uuid") IS 'Verifica se usuário é owner. Função otimizada para verificações de permissão administrativa.';



CREATE OR REPLACE FUNCTION "public"."is_user_active"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true
  );
$$;


ALTER FUNCTION "public"."is_user_active"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_users_with_roles"() RETURNS TABLE("user_id" "uuid", "email" character varying, "roles" "text"[], "highest_role" "public"."app_role", "created_at" timestamp with time zone, "last_sign_in_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- APENAS owners podem listar usuários
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Only owners can list users';
  END IF;
  
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email,
    COALESCE(ARRAY_AGG(ur.role::TEXT), ARRAY[]::TEXT[]) as roles,
    CASE 
      WHEN 'owner' = ANY(ARRAY_AGG(ur.role)) THEN 'owner'::app_role
      WHEN 'admin' = ANY(ARRAY_AGG(ur.role)) THEN 'admin'::app_role
      WHEN 'moderator' = ANY(ARRAY_AGG(ur.role)) THEN 'moderator'::app_role
      WHEN 'user' = ANY(ARRAY_AGG(ur.role)) THEN 'user'::app_role
      ELSE NULL::app_role
    END as highest_role,
    au.created_at,
    au.last_sign_in_at
  FROM auth.users au
  LEFT JOIN public.user_roles ur ON ur.user_id = au.id
  GROUP BY au.id, au.email, au.created_at, au.last_sign_in_at
  ORDER BY au.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."list_users_with_roles"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."list_users_with_roles"() IS 'Lista todos os usuários com suas roles. Apenas owners podem executar. Retorna array de roles e role mais alta.';



CREATE OR REPLACE FUNCTION "public"."log_admin_error"("p_error_id" "text", "p_module" "text", "p_action" "text", "p_user_message" "text", "p_technical_message" "text", "p_code" "text" DEFAULT NULL::"text", "p_severity" "text" DEFAULT 'medium'::"text", "p_retryable" boolean DEFAULT false, "p_actor_user_id" "uuid" DEFAULT NULL::"uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_fingerprint" "text" DEFAULT NULL::"text", "p_scope" "text" DEFAULT 'core'::"text", "p_category" "text" DEFAULT 'unknown'::"text", "p_recoverability" "text" DEFAULT 'non_retryable'::"text", "p_is_user_visible" boolean DEFAULT true, "p_recommended_action" "text" DEFAULT NULL::"text", "p_fingerprint_version" "text" DEFAULT 'v1'::"text", "p_environment" "text" DEFAULT 'production'::"text", "p_route_path" "text" DEFAULT NULL::"text", "p_feature_area" "text" DEFAULT NULL::"text", "p_actor_email" "text" DEFAULT NULL::"text", "p_target_user_id" "uuid" DEFAULT NULL::"uuid", "p_target_email" "text" DEFAULT NULL::"text", "p_session_id" "text" DEFAULT NULL::"text", "p_request_id" "text" DEFAULT NULL::"text", "p_context_label" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_existing_id UUID;
    v_new_id UUID;
BEGIN
    -- 1. Dedup: find existing ACTIVE error with same fingerprint + environment
    IF p_fingerprint IS NOT NULL THEN
        SELECT id INTO v_existing_id
        FROM admin_error_events
        WHERE fingerprint = p_fingerprint
          AND environment = p_environment
          AND status IN ('new', 'investigating')
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
            UPDATE admin_error_events
            SET
                occurrence_count = occurrence_count + 1,
                updated_at = NOW(),
                last_seen_at = NOW(),
                metadata = p_metadata
            WHERE id = v_existing_id;

            RETURN v_existing_id;
        END IF;
    END IF;

    -- 2. Insert new error with all fields
    INSERT INTO admin_error_events (
        error_id, module, action, user_message, technical_message,
        code, severity, retryable, actor_user_id, metadata,
        fingerprint, scope, category, recoverability, is_user_visible,
        recommended_action, fingerprint_version, environment,
        route_path, feature_area, actor_email, target_user_id, target_email,
        session_id, request_id, context_label,
        status, occurrence_count, first_seen_at, last_seen_at
    ) VALUES (
        p_error_id, p_module, p_action, p_user_message, p_technical_message,
        p_code, p_severity, p_retryable, p_actor_user_id, p_metadata,
        p_fingerprint, p_scope, p_category, p_recoverability, p_is_user_visible,
        p_recommended_action, p_fingerprint_version, p_environment,
        p_route_path, p_feature_area, p_actor_email, p_target_user_id, p_target_email,
        p_session_id, p_request_id, p_context_label,
        'new', 1, NOW(), NOW()
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;


ALTER FUNCTION "public"."log_admin_error"("p_error_id" "text", "p_module" "text", "p_action" "text", "p_user_message" "text", "p_technical_message" "text", "p_code" "text", "p_severity" "text", "p_retryable" boolean, "p_actor_user_id" "uuid", "p_metadata" "jsonb", "p_fingerprint" "text", "p_scope" "text", "p_category" "text", "p_recoverability" "text", "p_is_user_visible" boolean, "p_recommended_action" "text", "p_fingerprint_version" "text", "p_environment" "text", "p_route_path" "text", "p_feature_area" "text", "p_actor_email" "text", "p_target_user_id" "uuid", "p_target_email" "text", "p_session_id" "text", "p_request_id" "text", "p_context_label" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_api_usage"("p_user_id" "uuid", "p_endpoint" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate the start of the current hour window
  v_window_start := DATE_TRUNC('hour', NOW());
  
  -- Insert or update usage record
  INSERT INTO api_usage (user_id, endpoint, request_count, last_request, window_start)
  VALUES (p_user_id, p_endpoint, 1, NOW(), v_window_start)
  ON CONFLICT (user_id, endpoint, window_start) 
  DO UPDATE SET
    request_count = api_usage.request_count + 1,
    last_request = NOW();
END;
$$;


ALTER FUNCTION "public"."log_api_usage"("p_user_id" "uuid", "p_endpoint" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_custom_action"("_action" "text", "_table_name" "text" DEFAULT NULL::"text", "_record_id" "uuid" DEFAULT NULL::"uuid", "_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    changes,
    created_at
  ) VALUES (
    auth.uid(),
    _action,
    _table_name,
    _record_id,
    _metadata,
    now()
  );
END;
$$;


ALTER FUNCTION "public"."log_custom_action"("_action" "text", "_table_name" "text", "_record_id" "uuid", "_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_custom_action"("_action" "text", "_table_name" "text", "_record_id" "uuid", "_metadata" "jsonb") IS 'Permite inserir logs manuais para ações customizadas do sistema.';



CREATE OR REPLACE FUNCTION "public"."log_signup_event"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Avoid logging if already managed (defensive)
  INSERT INTO public.user_events (user_id, event_type, source, metadata)
  VALUES (NEW.id, 'SIGNUP', 'auth_trigger', '{"trigger": "on_auth_user_created"}'::jsonb);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_signup_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_user_event"("p_event_type" "text", "p_target_user_id" "uuid" DEFAULT NULL::"uuid", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid", "p_origin" "text" DEFAULT 'web_app'::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_status" "text" DEFAULT 'SUCCESS'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_auth_user_id uuid;
    v_target_id uuid;
    v_actor_id uuid;
    v_user_id_insert uuid;
    v_request_id text;
    v_dedupe_key text;
    v_existing_log_id bigint;
    v_session_fingerprint text;
    v_final_origin text;
    v_final_metadata jsonb;
BEGIN
    v_final_metadata := COALESCE(p_metadata, '{}'::jsonb);

    -- Normalização de p_origin (mapeia internamente para a coluna source)
    IF p_origin NOT IN ('web_app', 'mobile_app', 'system') THEN
        IF p_origin IS NOT NULL AND p_origin <> '' THEN
            v_final_metadata := jsonb_set(v_final_metadata, '{source_detail}', to_jsonb(p_origin), true);
        END IF;
        v_final_origin := 'web_app';
    ELSE
        v_final_origin := p_origin;
    END IF;

    -- Contexto de usuário
    v_auth_user_id := auth.uid();
    v_actor_id := COALESCE(p_actor_user_id, v_auth_user_id, p_target_user_id);
    v_target_id := COALESCE(p_target_user_id, v_auth_user_id, p_actor_user_id);
    v_user_id_insert := COALESCE(v_target_id, v_actor_id);

    IF v_user_id_insert IS NULL THEN
        RETURN json_build_object('status','error','reason','missing_user_context');
    END IF;

    v_request_id := v_final_metadata->>'request_id';
    
    -- LOGIN_SUCCESS dedupe
    IF p_event_type = 'LOGIN_SUCCESS' AND v_request_id IS NOT NULL THEN
        SELECT id INTO v_existing_log_id
        FROM public.user_events
        WHERE event_type = 'LOGIN_SUCCESS'
          AND metadata->>'request_id' = v_request_id
        LIMIT 1;

        IF v_existing_log_id IS NOT NULL THEN
            RETURN json_build_object('status','skipped','reason','duplicate_request_id','origin',v_final_origin,'log_id',v_existing_log_id);
        END IF;
    END IF;

    -- INSERT usando a nova coluna 'source'
    INSERT INTO public.user_events (
        user_id, target_user_id, actor_user_id, event_type, source, metadata, status, occurred_at
    ) VALUES (
        v_user_id_insert, v_target_id, v_actor_id, p_event_type, v_final_origin, v_final_metadata, p_status, now()
    )
    RETURNING id INTO v_existing_log_id;

    RETURN json_build_object('status','logged','log_id',v_existing_log_id,'origin',v_final_origin);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('status','error','message',SQLERRM);
END;
$$;


ALTER FUNCTION "public"."log_user_event"("p_event_type" "text", "p_target_user_id" "uuid", "p_actor_user_id" "uuid", "p_origin" "text", "p_metadata" "jsonb", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_user_on_feedback_response"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status NOT IN ('new')) 
       OR (OLD.response_note IS DISTINCT FROM NEW.response_note AND NEW.response_note IS NOT NULL) THEN
       
        INSERT INTO user_notifications (user_id, type, title, message, data)
        VALUES (
            NEW.actor_user_id, 
            'feedback_response',
            'Atualização na sua solicitação',
            CASE 
                WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'O status da sua solicitação ' || NEW.feedback_id || ' mudou para: ' || NEW.status
                ELSE 'Você recebeu uma resposta na solicitação ' || NEW.feedback_id
            END,
            jsonb_build_object('feedback_id', NEW.feedback_id, 'db_id', NEW.id)
        );
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_user_on_feedback_response"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_billing_affiliate_payout"("p_affiliate_id" "uuid", "p_livemode" boolean, "p_period_start" "date", "p_period_end" "date", "p_payment_reference" "text", "p_created_by" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  payout_record public.billing_affiliate_payouts%ROWTYPE;
  conversion_ids uuid[];
  total_cents integer;
BEGIN
  IF p_period_end < p_period_start THEN
    RAISE EXCEPTION 'invalid_payout_period' USING ERRCODE = '22023';
  END IF;

  WITH locked_conversions AS (
    SELECT conversion.id, conversion.paid_at, conversion.commission_amount_cents
    FROM public.billing_affiliate_conversions AS conversion
    JOIN public.billing_affiliates AS affiliate
      ON affiliate.id = conversion.affiliate_id
    WHERE conversion.affiliate_id = p_affiliate_id
      AND affiliate.livemode = p_livemode
      AND conversion.status = 'pending'
      AND conversion.payout_id IS NULL
      AND conversion.eligible_at <= now()
      AND (conversion.paid_at AT TIME ZONE 'America/Sao_Paulo')::date
        BETWEEN p_period_start AND p_period_end
    FOR UPDATE OF conversion
  )
  SELECT
    array_agg(locked.id ORDER BY locked.paid_at),
    sum(locked.commission_amount_cents)::integer
  INTO conversion_ids, total_cents
  FROM locked_conversions AS locked;

  IF conversion_ids IS NULL OR total_cents IS NULL OR total_cents <= 0 THEN
    RAISE EXCEPTION 'no_eligible_affiliate_conversions' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.billing_affiliate_payouts (
    affiliate_id,
    livemode,
    period_start,
    period_end,
    amount_cents,
    conversion_count,
    payment_reference,
    created_by
  )
  VALUES (
    p_affiliate_id,
    p_livemode,
    p_period_start,
    p_period_end,
    total_cents,
    cardinality(conversion_ids),
    nullif(trim(p_payment_reference), ''),
    p_created_by
  )
  RETURNING * INTO payout_record;

  UPDATE public.billing_affiliate_conversions
  SET status = 'paid', payout_id = payout_record.id
  WHERE id = ANY(conversion_ids);

  RETURN jsonb_build_object(
    'id', payout_record.id,
    'amount_cents', payout_record.amount_cents,
    'conversion_count', payout_record.conversion_count,
    'paid_at', payout_record.paid_at
  );
END;
$$;


ALTER FUNCTION "public"."record_billing_affiliate_payout"("p_affiliate_id" "uuid", "p_livemode" boolean, "p_period_start" "date", "p_period_end" "date", "p_payment_reference" "text", "p_created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_role"("_target_user_id" "uuid", "_role" "public"."app_role") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- APENAS owners podem remover roles
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Only owners can remove roles';
  END IF;
  
  -- Evita que owner remova a própria role de owner
  IF _target_user_id = auth.uid() AND _role = 'owner' THEN
    RAISE EXCEPTION 'Owners cannot remove their own owner role';
  END IF;
  
  DELETE FROM public.user_roles
  WHERE user_id = _target_user_id AND role = _role;
END;
$$;


ALTER FUNCTION "public"."remove_role"("_target_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."remove_role"("_target_user_id" "uuid", "_role" "public"."app_role") IS 'Remove role específica de usuário. Apenas owners podem executar. Protege role de owner.';



CREATE OR REPLACE FUNCTION "public"."remove_user_role_admin"("target_user_id" "uuid", "role_to_remove" "public"."app_role") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_user_id UUID;
  current_user_highest_role app_role;
  target_user_highest_role app_role;
  owner_count INTEGER;
BEGIN
  -- Obter ID do usuário atual
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar role do usuário atual
  SELECT get_highest_user_role(current_user_id) INTO current_user_highest_role;
  
  -- Verificar role atual do usuário alvo
  SELECT get_highest_user_role(target_user_id) INTO target_user_highest_role;

  -- Regras de negócio CORRIGIDAS para remoção de roles
  CASE role_to_remove
    WHEN 'owner' THEN
      -- Apenas owners podem remover outros owners
      IF current_user_highest_role != 'owner' THEN
        RAISE EXCEPTION 'Apenas proprietários podem remover a role de owner';
      END IF;
      
      -- Verificar se não é o último owner
      SELECT COUNT(*) INTO owner_count
      FROM user_roles 
      WHERE role = 'owner';
      
      IF owner_count <= 1 THEN
        RAISE EXCEPTION 'Não é possível remover o último proprietário do sistema';
      END IF;
      
    WHEN 'admin' THEN
      -- Owners e admins podem remover outros admins
      IF NOT has_role_or_higher(current_user_id, 'admin') THEN
        RAISE EXCEPTION 'Apenas admins ou proprietários podem remover a role de admin';
      END IF;
      
    WHEN 'moderator' THEN
      -- Admins e owners podem remover moderators
      IF NOT has_role_or_higher(current_user_id, 'admin') THEN
        RAISE EXCEPTION 'Apenas admins ou proprietários podem remover a role de moderator';
      END IF;
      
    WHEN 'user' THEN
      -- Moderators e acima podem remover role de user
      IF NOT has_role_or_higher(current_user_id, 'moderator') THEN
        RAISE EXCEPTION 'Apenas moderators ou acima podem remover a role de user';
      END IF;
      
    ELSE
      RAISE EXCEPTION 'Role inválida: %', role_to_remove;
  END CASE;

  -- Verificar se não está tentando alterar um owner (apenas outros owners podem)
  IF target_user_highest_role = 'owner' AND current_user_highest_role != 'owner' THEN
    RAISE EXCEPTION 'Apenas proprietários podem alterar roles de outros proprietários';
  END IF;

  -- Remover a role
  DELETE FROM user_roles 
  WHERE user_id = target_user_id AND role = role_to_remove;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."remove_user_role_admin"("target_user_id" "uuid", "role_to_remove" "public"."app_role") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."remove_user_role_admin"("target_user_id" "uuid", "role_to_remove" "public"."app_role") IS 'Remove uma role de um usuário - Admins podem remover admin/moderator/user, Owners podem remover qualquer role';



CREATE OR REPLACE FUNCTION "public"."reset_daily_progress"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Resetar progresso diário para usuários que não foram resetados hoje
  UPDATE user_cycles 
  SET 
    materias_estudadas_hoje = '{}',
    data_ultimo_reset = CURRENT_DATE,
    -- Atualizar streak: se estudou ontem, manter/incrementar; senão, resetar
    streak_dias_consecutivos = CASE 
      WHEN data_ultimo_reset = CURRENT_DATE - INTERVAL '1 day' 
           AND array_length(materias_estudadas_hoje, 1) > 0 
      THEN streak_dias_consecutivos + 1
      WHEN data_ultimo_reset = CURRENT_DATE - INTERVAL '1 day'
           AND (materias_estudadas_hoje IS NULL OR array_length(materias_estudadas_hoje, 1) = 0)
      THEN 0
      ELSE streak_dias_consecutivos -- Manter se já foi resetado hoje
    END,
    atualizado_em = NOW()
  WHERE data_ultimo_reset < CURRENT_DATE;
  
  -- Log da operação
  RAISE NOTICE 'Daily progress reset completed for % users', 
    (SELECT COUNT(*) FROM user_cycles WHERE data_ultimo_reset = CURRENT_DATE);
END;
$$;


ALTER FUNCTION "public"."reset_daily_progress"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_edital_study_progress"("p_user_id" "uuid", "p_edital_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_subject_ids text[] := '{}';
  v_topic_ids text[] := '{}';
  v_reset_topics integer := 0;
  v_deleted_history integer := 0;
  v_deleted_sessions integer := 0;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select coalesce(subject_ids, '{}'::text[])
    into v_subject_ids
  from public.user_editais
  where id = p_edital_id
    and user_id = p_user_id;

  if not found then
    raise exception 'Edital not found for authenticated user' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(id::text), '{}'::text[])
    into v_topic_ids
  from public.topics
  where subject_id::text = any(v_subject_ids)
     or edital_id = p_edital_id;

  if array_length(v_topic_ids, 1) is null then
    return jsonb_build_object(
      'ok', true,
      'reset_topics', 0,
      'deleted_history', 0,
      'deleted_sessions', 0
    );
  end if;

  delete from public.topic_review_history
  where user_id = p_user_id
    and topic_id::text = any(v_topic_ids);
  get diagnostics v_deleted_history = row_count;

  delete from public.study_sessions
  where user_id = p_user_id
    and (
      edital_id = p_edital_id
      or subject_id::text = any(v_subject_ids)
      or coalesce(topics_studied, '{}'::text[]) && v_topic_ids
    );
  get diagnostics v_deleted_sessions = row_count;

  update public.topics
  set completed = false,
      review_count = 0,
      next_review = null,
      first_studied_at = null,
      last_reviewed_at = null,
      review_stage = null,
      difficulty_level = null,
      difficulty_set_at = null,
      memory_stability = null,
      current_interval = null,
      retention_score = null,
      total_reviews = null,
      last_session_duration = null,
      is_marked_for_review = false,
      marked_for_review_at = null,
      updated_at = now()
  where id::text = any(v_topic_ids);
  get diagnostics v_reset_topics = row_count;

  return jsonb_build_object(
    'ok', true,
    'reset_topics', v_reset_topics,
    'deleted_history', v_deleted_history,
    'deleted_sessions', v_deleted_sessions
  );
end;
$$;


ALTER FUNCTION "public"."reset_edital_study_progress"("p_user_id" "uuid", "p_edital_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_user_ai_quota"("p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_reset_at timestamptz := NOW();
  v_limits json;
  v_limit integer;
  v_plan text;
  v_message text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required' USING ERRCODE = '22023';
  END IF;

  SELECT public.get_user_ai_limits(p_user_id)
  INTO v_limits;
  v_limit := COALESCE((v_limits ->> 'limit')::integer, 0);
  v_plan := COALESCE(v_limits ->> 'plan', 'free_trial');

  IF v_limit <= 0 THEN
    RAISE EXCEPTION 'user has no active AI quota' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.user_ai_quota_resets (user_id, reset_at, granted_by)
  VALUES (p_user_id, v_reset_at, auth.uid())
  ON CONFLICT (user_id) DO UPDATE
  SET reset_at = EXCLUDED.reset_at,
      granted_by = EXCLUDED.granted_by,
      updated_at = NOW();

  v_message := CASE
    WHEN v_plan = 'free_trial' THEN
      'A administração liberou 1 nova importação com IA como crédito de cortesia.'
    ELSE
      format('A administração liberou novamente sua cota de IA. Você pode fazer até %s importações neste período.', v_limit)
  END;

  INSERT INTO public.user_notifications (
    user_id, type, category, title, message, action_url, read, data
  ) VALUES (
    p_user_id,
    'success',
    'sistema',
    'Cota de IA liberada',
    v_message,
    '/meus-editais',
    false,
    jsonb_build_object('source', 'admin_ai_quota_reset', 'reset_at', v_reset_at)
  );

  RETURN json_build_object(
    'user_id', p_user_id,
    'reset_at', v_reset_at,
    'limit', v_limit,
    'plan', v_plan,
    'notified', true
  );
END;
$$;


ALTER FUNCTION "public"."reset_user_ai_quota"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revert_subject_merge"("merge_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE subject_merges 
  SET status = 'reverted', 
      reverted_at = NOW() 
  WHERE id = merge_id AND status = 'active';
  
  -- Também reverte os tópicos relacionados
  UPDATE topic_merges 
  SET status = 'reverted', 
      reverted_at = NOW() 
  WHERE subject_merge_id = merge_id AND status = 'active';
END;
$$;


ALTER FUNCTION "public"."revert_subject_merge"("merge_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revert_subject_merge"("p_user_id" "uuid", "p_merge_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_merge public.subject_merges%rowtype;
  v_topic_merge public.topic_merges%rowtype;
  v_primary_topic public.topics%rowtype;
  v_merged_subject_ids uuid[] := '{}';
  v_all_subject_ids uuid[] := '{}';
  v_merged_topic_ids uuid[] := '{}';
  v_all_topic_ids uuid[] := '{}';
  v_current_cycle text[] := '{}';
  v_current_studied_subjects text[] := '{}';
  v_new_cycle text[] := '{}';
  v_new_studied_subjects text[] := '{}';
  v_subjects_updated integer := 0;
  v_topics_updated integer := 0;
  v_topic_merges_deleted integer := 0;
  v_editais_updated integer := 0;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select *
    into v_merge
  from public.subject_merges
  where id = p_merge_id
    and user_id = p_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Subject merge not found for authenticated user' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(value::uuid), '{}'::uuid[])
    into v_merged_subject_ids
  from jsonb_array_elements_text(coalesce(v_merge.merged_subject_ids, '[]'::jsonb)) as value;

  v_all_subject_ids := array_prepend(v_merge.primary_subject_id, v_merged_subject_ids);

  if exists (
    select 1
    from public.subjects subject
    where subject.id = any(v_all_subject_ids)
      and subject.user_id is distinct from p_user_id
  ) then
    raise exception 'Subject merge contains subjects outside authenticated user scope' using errcode = '42501';
  end if;

  for v_topic_merge in
    select *
    from public.topic_merges
    where subject_merge_id = p_merge_id
      and user_id = p_user_id
      and status = 'active'
    for update
  loop
    select coalesce(array_agg(value::uuid), '{}'::uuid[])
      into v_merged_topic_ids
    from jsonb_array_elements_text(coalesce(v_topic_merge.merged_topic_ids, '[]'::jsonb)) as value;

    select *
      into v_primary_topic
    from public.topics
    where id = v_topic_merge.primary_topic_id
    for update;

    if found and array_length(v_merged_topic_ids, 1) > 0 then
      update public.topics
      set completed = v_primary_topic.completed,
          review_count = v_primary_topic.review_count,
          review_stage = v_primary_topic.review_stage,
          next_review = v_primary_topic.next_review,
          first_studied_at = v_primary_topic.first_studied_at,
          last_reviewed_at = v_primary_topic.last_reviewed_at,
          difficulty_level = v_primary_topic.difficulty_level,
          difficulty_set_at = v_primary_topic.difficulty_set_at,
          notes = v_primary_topic.notes,
          memory_stability = v_primary_topic.memory_stability,
          current_interval = v_primary_topic.current_interval,
          retention_score = v_primary_topic.retention_score,
          total_reviews = v_primary_topic.total_reviews,
          last_session_duration = v_primary_topic.last_session_duration,
          is_marked_for_review = v_primary_topic.is_marked_for_review,
          marked_for_review_at = v_primary_topic.marked_for_review_at,
          updated_at = now()
      where id = any(v_merged_topic_ids);
    end if;
  end loop;

  select coalesce(array_agg(topic.id), '{}'::uuid[])
    into v_all_topic_ids
  from public.topics topic
  join public.subjects subject on subject.id = topic.subject_id
  where subject.id = any(v_all_subject_ids)
    and subject.user_id = p_user_id;

  if array_length(v_all_topic_ids, 1) > 0 then
    update public.topics
    set parent_topic_id = null,
        is_hidden = false,
        merged_with_ia = false,
        updated_at = now()
    where id = any(v_all_topic_ids);
    get diagnostics v_topics_updated = row_count;
  end if;

  delete from public.topic_merges
  where subject_merge_id = p_merge_id
    and user_id = p_user_id;
  get diagnostics v_topic_merges_deleted = row_count;

  delete from public.subject_merges
  where id = p_merge_id
    and user_id = p_user_id;

  update public.subjects
  set is_unified = false,
      is_visible = true,
      updated_at = now()
  where id = any(v_all_subject_ids)
    and user_id = p_user_id;
  get diagnostics v_subjects_updated = row_count;

  select coalesce(ciclo_atual, '{}'::text[]),
         coalesce(materias_estudadas_ciclo, '{}'::text[])
    into v_current_cycle, v_current_studied_subjects
  from public.user_cycles
  where user_id = p_user_id
    and status = 'active'
  limit 1
  for update;

  if found then
    v_new_cycle := v_current_cycle || coalesce(array(
      select subject_id::text
      from unnest(v_all_subject_ids) as subject_id
      where not (subject_id::text = any(v_current_cycle))
    ), '{}'::text[]);

    v_new_studied_subjects := coalesce(array(
      select studied_id
      from unnest(v_current_studied_subjects) as studied_id
      where studied_id <> all(coalesce(array(
        select subject_id::text
        from unnest(v_all_subject_ids) as subject_id
      ), '{}'::text[]))
    ), '{}'::text[]);

    update public.user_cycles
    set ciclo_atual = v_new_cycle,
        materias_estudadas_ciclo = v_new_studied_subjects,
        atualizado_em = now()
    where user_id = p_user_id
      and status = 'active';
  end if;

  update public.user_editais edital
  set active_subject_ids = coalesce(edital.active_subject_ids, '{}'::text[]) || coalesce(array(
        select subject_id::text
        from unnest(v_all_subject_ids) as subject_id
        where subject_id::text = any(coalesce(edital.subject_ids, '{}'::text[]))
          and not (subject_id::text = any(coalesce(edital.active_subject_ids, '{}'::text[])))
      ), '{}'::text[])
  where edital.user_id = p_user_id
    and coalesce(edital.subject_ids, '{}'::text[]) && (select array_agg(subject_id::text) from unnest(v_all_subject_ids) as subject_id);
  get diagnostics v_editais_updated = row_count;

  return jsonb_build_object(
    'ok', true,
    'reverted_subject_merge_id', p_merge_id,
    'updated_subjects', v_subjects_updated,
    'updated_topics', v_topics_updated,
    'deleted_topic_merges', v_topic_merges_deleted,
    'updated_editais', v_editais_updated,
    'cleared_cycle_closure_subject_ids', to_jsonb(v_all_subject_ids)
  );
end;
$$;


ALTER FUNCTION "public"."revert_subject_merge"("p_user_id" "uuid", "p_merge_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revert_topic_merge"("merge_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE topic_merges 
  SET status = 'reverted', 
      reverted_at = NOW() 
  WHERE id = merge_id AND status = 'active';
END;
$$;


ALTER FUNCTION "public"."revert_topic_merge"("merge_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revert_topic_merge"("p_user_id" "uuid", "p_merge_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_merge public.topic_merges%rowtype;
  v_primary_topic public.topics%rowtype;
  v_merged_topic_ids uuid[] := '{}';
  v_all_topic_ids uuid[] := '{}';
  v_updated_topics integer := 0;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select *
    into v_merge
  from public.topic_merges
  where id = p_merge_id
    and user_id = p_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Topic merge not found for authenticated user' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(value::uuid), '{}'::uuid[])
    into v_merged_topic_ids
  from jsonb_array_elements_text(coalesce(v_merge.merged_topic_ids, '[]'::jsonb)) as value;

  v_all_topic_ids := array_prepend(v_merge.primary_topic_id, v_merged_topic_ids);

  if exists (
    select 1
    from public.topics topic
    join public.subjects subject on subject.id = topic.subject_id
    where topic.id = any(v_all_topic_ids)
      and subject.user_id is distinct from p_user_id
  ) then
    raise exception 'Topic merge contains topics outside authenticated user scope' using errcode = '42501';
  end if;

  select *
    into v_primary_topic
  from public.topics
  where id = v_merge.primary_topic_id
  for update;

  if found and array_length(v_merged_topic_ids, 1) > 0 then
    update public.topics
    set completed = v_primary_topic.completed,
        review_count = v_primary_topic.review_count,
        review_stage = v_primary_topic.review_stage,
        next_review = v_primary_topic.next_review,
        first_studied_at = v_primary_topic.first_studied_at,
        last_reviewed_at = v_primary_topic.last_reviewed_at,
        difficulty_level = v_primary_topic.difficulty_level,
        difficulty_set_at = v_primary_topic.difficulty_set_at,
        notes = v_primary_topic.notes,
        memory_stability = v_primary_topic.memory_stability,
        current_interval = v_primary_topic.current_interval,
        retention_score = v_primary_topic.retention_score,
        total_reviews = v_primary_topic.total_reviews,
        last_session_duration = v_primary_topic.last_session_duration,
        is_marked_for_review = v_primary_topic.is_marked_for_review,
        marked_for_review_at = v_primary_topic.marked_for_review_at,
        updated_at = now()
    where id = any(v_merged_topic_ids);
  end if;

  update public.topics
  set parent_topic_id = null,
      is_hidden = false,
      merged_with_ia = false,
      updated_at = now()
  where id = any(v_all_topic_ids);
  get diagnostics v_updated_topics = row_count;

  delete from public.topic_merges
  where id = p_merge_id
    and user_id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'reverted_topic_merge_id', p_merge_id,
    'updated_topics', v_updated_topics
  );
end;
$$;


ALTER FUNCTION "public"."revert_topic_merge"("p_user_id" "uuid", "p_merge_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_active_study_timer_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_active_study_timer_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_user_role"("_target_user_id" "uuid", "_role" "public"."app_role") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- APENAS owners podem definir roles
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Only owners can set user roles';
  END IF;
  
  -- Evita que owner remova a própria role de owner
  IF _target_user_id = auth.uid() AND _role != 'owner' THEN
    RAISE EXCEPTION 'Owners cannot remove their own owner role';
  END IF;
  
  -- Remove todas as roles existentes
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  
  -- Adiciona a nova role
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (_target_user_id, _role, auth.uid());
END;
$$;


ALTER FUNCTION "public"."set_user_role"("_target_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_user_role"("_target_user_id" "uuid", "_role" "public"."app_role") IS 'Substitui todas as roles do usuário por uma única role. Apenas owners podem executar.';



CREATE OR REPLACE FUNCTION "public"."submit_practice_attempt_internal"("p_user_id" "uuid", "p_session_id" "uuid", "p_item_id" "uuid", "p_client_attempt_id" "uuid", "p_answer_payload" "jsonb", "p_response_time_ms" integer, "p_algorithm_version" "text" DEFAULT 'v1'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."submit_practice_attempt_internal"("p_user_id" "uuid", "p_session_id" "uuid", "p_item_id" "uuid", "p_client_attempt_id" "uuid", "p_answer_payload" "jsonb", "p_response_time_ms" integer, "p_algorithm_version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."suggest_topics_by_time"("p_user_id" "uuid", "p_available_minutes" integer DEFAULT 30) RETURNS TABLE("topic_id" "uuid", "topic_name" "text", "subject_name" "text", "difficulty_level" integer, "estimated_minutes" integer, "priority_score" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as topic_id,
    t.name as topic_name,
    s.name as subject_name,
    t.difficulty_level,
    get_estimated_time_by_difficulty(t.difficulty_level) as estimated_minutes,
    CASE 
      WHEN t.next_review IS NOT NULL AND t.next_review <= NOW() THEN 100 -- Revisão atrasada
      WHEN t.next_review IS NOT NULL AND DATE(t.next_review) = CURRENT_DATE THEN 80 -- Revisão hoje
      WHEN t.difficulty_level = 1 THEN 60 -- Tópicos fáceis (vitórias rápidas)
      WHEN t.difficulty_level = 2 THEN 50
      WHEN t.difficulty_level IS NULL THEN 40 -- Tópicos não avaliados
      WHEN t.difficulty_level = 3 THEN 30
      WHEN t.difficulty_level = 4 THEN 20
      WHEN t.difficulty_level = 5 THEN 10 -- Tópicos difíceis (quando há tempo)
      ELSE 25
    END as priority_score
  FROM topics t
  INNER JOIN subjects s ON t.subject_id = s.id
  WHERE s.user_id = p_user_id
    AND t.completed = false
    AND get_estimated_time_by_difficulty(t.difficulty_level) <= p_available_minutes
  ORDER BY 
    CASE 
      WHEN t.next_review IS NOT NULL AND t.next_review <= NOW() THEN 100
      WHEN t.next_review IS NOT NULL AND DATE(t.next_review) = CURRENT_DATE THEN 80
      WHEN t.difficulty_level = 1 THEN 60
      WHEN t.difficulty_level = 2 THEN 50
      WHEN t.difficulty_level IS NULL THEN 40
      WHEN t.difficulty_level = 3 THEN 30
      WHEN t.difficulty_level = 4 THEN 20
      WHEN t.difficulty_level = 5 THEN 10
      ELSE 25
    END DESC,
    get_estimated_time_by_difficulty(t.difficulty_level) ASC
  LIMIT 10;
END;
$$;


ALTER FUNCTION "public"."suggest_topics_by_time"("p_user_id" "uuid", "p_available_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_general_reminder_completed_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.completed IS TRUE THEN
    NEW.completed_at := COALESCE(NEW.completed_at, NOW());
  ELSIF NEW.completed IS TRUE AND COALESCE(OLD.completed, FALSE) IS FALSE THEN
    NEW.completed_at := NOW();
  ELSIF NEW.completed IS FALSE AND COALESCE(OLD.completed, FALSE) IS TRUE THEN
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_general_reminder_completed_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_last_access"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.event_type IN ('LOGIN', 'LOGIN_SUCCESS', 'SESSION_START') THEN
    UPDATE public.profiles
    SET last_access_at = GREATEST(
      COALESCE(last_access_at, '-infinity'::timestamptz),
      NEW.occurred_at
    )
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_last_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_last_sign_in"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only update if last_sign_in_at changed
  IF OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at THEN
    UPDATE public.profiles
    SET last_sign_in_at = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_last_sign_in"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_merges_on_cycle_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Remover subject_merges que não têm mais nenhum ID no ciclo_atual
    DELETE FROM topic_merges tm
    WHERE tm.subject_merge_id IN (
        SELECT sm.id FROM subject_merges sm
        WHERE NOT EXISTS (
            SELECT 1 FROM JSONB_ARRAY_ELEMENTS_TEXT(
                COALESCE(sm.merged_subject_ids::jsonb, '[]'::jsonb)
                || JSONB_BUILD_ARRAY(sm.primary_subject_id)
            ) elem
            WHERE elem = ANY(NEW.ciclo_atual)
        )
    );
    
    DELETE FROM subject_merges sm
    WHERE NOT EXISTS (
        SELECT 1 FROM JSONB_ARRAY_ELEMENTS_TEXT(
            COALESCE(sm.merged_subject_ids::jsonb, '[]'::jsonb)
            || JSONB_BUILD_ARRAY(sm.primary_subject_id)
        ) elem
        WHERE elem = ANY(NEW.ciclo_atual)
    );
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_merges_on_cycle_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_topic_merge_progress"("p_user_id" "uuid", "p_topic_id" "uuid", "p_progress" "jsonb", "p_history" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_topic_merge_progress"("p_user_id" "uuid", "p_topic_id" "uuid", "p_progress" "jsonb", "p_history" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_difficulty_system"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  test_result TEXT := '';
  col_type TEXT;
  sample_user UUID;
BEGIN
  -- Verificar tipo da coluna difficulty_level
  SELECT data_type INTO col_type
  FROM information_schema.columns 
  WHERE table_name = 'topics' AND column_name = 'difficulty_level';
  
  IF col_type = 'integer' THEN
    test_result := test_result || '✅ Coluna difficulty_level é INTEGER' || E'\n';
  ELSE
    test_result := test_result || '❌ Coluna difficulty_level não é INTEGER (tipo: ' || COALESCE(col_type, 'não encontrada') || ')' || E'\n';
  END IF;
  
  -- Verificar se difficulty_set_at existe
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'topics' AND column_name = 'difficulty_set_at') THEN
    test_result := test_result || '✅ Coluna difficulty_set_at criada' || E'\n';
  ELSE
    test_result := test_result || '❌ Coluna difficulty_set_at não encontrada' || E'\n';
  END IF;
  
  -- Testar funções auxiliares
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_estimated_time_by_difficulty') THEN
    test_result := test_result || '✅ Função get_estimated_time_by_difficulty criada' || E'\n';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_points_by_difficulty') THEN
    test_result := test_result || '✅ Função get_points_by_difficulty criada' || E'\n';
  END IF;
  
  -- Testar funções principais
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_difficulty_stats') THEN
    test_result := test_result || '✅ Função get_user_difficulty_stats criada' || E'\n';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'suggest_topics_by_time') THEN
    test_result := test_result || '✅ Função suggest_topics_by_time criada' || E'\n';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'calculate_difficulty_points') THEN
    test_result := test_result || '✅ Função calculate_difficulty_points criada' || E'\n';
  END IF;
  
  -- Testar view
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'user_difficulty_overview') THEN
    test_result := test_result || '✅ View user_difficulty_overview criada' || E'\n';
  END IF;
  
  -- Teste funcional básico
  BEGIN
    SELECT get_estimated_time_by_difficulty(3) INTO STRICT col_type;
    test_result := test_result || '✅ Função de tempo funciona (3 estrelas = ' || col_type || ' min)' || E'\n';
  EXCEPTION WHEN OTHERS THEN
    test_result := test_result || '❌ Erro ao testar função de tempo' || E'\n';
  END;
  
  RETURN test_result;
END;
$$;


ALTER FUNCTION "public"."test_difficulty_system"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_owner_access"() RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN has_role('owner', 'e2de8e3b-9484-4064-b9ae-771a576091e1'::UUID);
END;
$$;


ALTER FUNCTION "public"."test_owner_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_admin_error_events_modtime"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_admin_error_events_modtime"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_admin_error_events_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_admin_error_events_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_atualizado_em_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_atualizado_em_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_cycle_subject_states_modtime"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_cycle_subject_states_modtime"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_daily_progress"("p_user_id" "uuid", "p_subject_id" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_studied TEXT[];
  daily_goal INTEGER;
  is_new_subject BOOLEAN := FALSE;
BEGIN
  -- Buscar dados atuais
  SELECT materias_estudadas_hoje, materias_por_dia
  INTO current_studied, daily_goal
  FROM user_cycles
  WHERE user_id = p_user_id;
  
  -- Se não encontrou o ciclo, retornar false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se a matéria já foi estudada hoje
  IF NOT (p_subject_id = ANY(current_studied)) THEN
    -- Adicionar matéria à lista
    current_studied := array_append(current_studied, p_subject_id);
    is_new_subject := TRUE;
    
    -- Atualizar no banco
    UPDATE user_cycles 
    SET 
      materias_estudadas_hoje = current_studied,
      atualizado_em = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN is_new_subject;
END;
$$;


ALTER FUNCTION "public"."update_daily_progress"("p_user_id" "uuid", "p_subject_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_difficulty_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF OLD.difficulty_level IS DISTINCT FROM NEW.difficulty_level THEN
    NEW.difficulty_set_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_difficulty_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pending_cycle_merges_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_pending_cycle_merges_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pending_merge_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_pending_merge_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pending_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_pending_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_study_cycles_v2_modtime"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_study_cycles_v2_modtime"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_study_sessions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_study_sessions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_subscription_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_subscription_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_editais_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_editais_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_study_analytics_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_study_analytics_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."use_coupon"("target_coupon_code" "text", "target_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  coupon_record RECORD;
BEGIN
  SELECT * INTO coupon_record
  FROM public.coupons
  WHERE code = target_coupon_code
    AND active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Cupom inválido ou inativo');
  END IF;

  IF coupon_record.valid_until IS NOT NULL AND coupon_record.valid_until < now() THEN
    RETURN json_build_object('success', false, 'error', 'Cupom expirado');
  END IF;

  IF coupon_record.max_uses IS NOT NULL AND coupon_record.uses_count >= coupon_record.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Cupom esgotado');
  END IF;

  INSERT INTO public.coupon_uses (coupon_id, user_id)
  VALUES (coupon_record.id, target_user_id);

  UPDATE public.coupons
  SET uses_count = uses_count + 1
  WHERE id = coupon_record.id;

  RETURN json_build_object(
    'success', true,
    'discount_type', coupon_record.discount_type,
    'discount_value', coupon_record.discount_value
  );
END;
$$;


ALTER FUNCTION "public"."use_coupon"("target_coupon_code" "text", "target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_rpc_dispatch"("p_action" "text", "p_args" "jsonb" DEFAULT '{}'::"jsonb", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_result jsonb;
begin
  if p_actor_user_id is null then
    raise exception 'User RPC actor is required';
  end if;

  perform set_config('request.jwt.claim.sub', p_actor_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  case p_action
    when 'atomic_archive_edital_from_cycle' then
      select to_jsonb(public.atomic_archive_edital_from_cycle(
        (p_args->>'p_user_id')::uuid,
        (p_args->>'p_edital_id')::uuid
      )) into v_result;

    when 'atomic_cycle_load' then
      select to_jsonb(public.atomic_cycle_load(
        (p_args->>'p_user_id')::uuid,
        (p_args->>'p_new_edital_id')::uuid,
        coalesce(array(select jsonb_array_elements_text(p_args->'p_new_subject_ids')), array[]::text[]),
        coalesce(array(select jsonb_array_elements_text(p_args->'p_old_edital_ids'))::uuid[], array[]::uuid[]),
        p_args->>'p_mode',
        p_args->>'p_cycle_name',
        nullif(p_args->>'p_exam_date', '')::date,
        coalesce((p_args->>'p_reset_cycle_state')::boolean, false)
      )) into v_result;

    when 'reset_edital_study_progress' then
      select to_jsonb(public.reset_edital_study_progress(
        (p_args->>'p_user_id')::uuid,
        (p_args->>'p_edital_id')::uuid
      )) into v_result;

    when 'revert_subject_merge' then
      select to_jsonb(public.revert_subject_merge(
        (p_args->>'p_user_id')::uuid,
        (p_args->>'p_merge_id')::uuid
      )) into v_result;

    when 'revert_topic_merge' then
      select to_jsonb(public.revert_topic_merge(
        (p_args->>'p_user_id')::uuid,
        (p_args->>'p_merge_id')::uuid
      )) into v_result;

    when 'get_subscription_info' then
      select to_jsonb(public.get_subscription_info(nullif(p_args->>'check_user_id', '')::uuid)) into v_result;

    when 'get_unified_subject_name' then
      select to_jsonb(public.get_unified_subject_name(
        (p_args->>'subject_id')::uuid,
        (p_args->>'user_id')::uuid
      )) into v_result;

    when 'get_unified_topic_name' then
      select to_jsonb(public.get_unified_topic_name(
        (p_args->>'topic_id')::uuid,
        (p_args->>'user_id')::uuid
      )) into v_result;

    when 'get_user_ai_limits' then
      select to_jsonb(public.get_user_ai_limits((p_args->>'p_user_id')::uuid)) into v_result;

    when 'log_admin_error' then
      select to_jsonb(public.log_admin_error(
        p_args->>'p_error_id',
        p_args->>'p_module',
        p_args->>'p_action',
        p_args->>'p_user_message',
        p_args->>'p_technical_message',
        p_args->>'p_code',
        p_args->>'p_severity',
        coalesce((p_args->>'p_retryable')::boolean, false),
        nullif(p_args->>'p_actor_user_id', '')::uuid,
        coalesce(p_args->'p_metadata', '{}'::jsonb),
        p_args->>'p_fingerprint',
        p_args->>'p_scope',
        p_args->>'p_category',
        p_args->>'p_recoverability',
        coalesce((p_args->>'p_is_user_visible')::boolean, false),
        p_args->>'p_recommended_action',
        p_args->>'p_fingerprint_version',
        p_args->>'p_environment',
        p_args->>'p_route_path',
        p_args->>'p_feature_area',
        p_args->>'p_actor_email',
        nullif(p_args->>'p_target_user_id', '')::uuid,
        p_args->>'p_target_email',
        p_args->>'p_session_id',
        p_args->>'p_request_id',
        p_args->>'p_context_label'
      )) into v_result;

    when 'log_user_event' then
      select to_jsonb(public.log_user_event(
        p_args->>'p_event_type',
        (p_args->>'p_target_user_id')::uuid,
        (p_args->>'p_actor_user_id')::uuid,
        p_args->>'p_origin',
        coalesce(p_args->'p_metadata', '{}'::jsonb),
        p_args->>'p_status'
      )) into v_result;

    when 'sync_topic_merge_progress' then
      select to_jsonb(public.sync_topic_merge_progress(
        (p_args->>'p_user_id')::uuid,
        (p_args->>'p_topic_id')::uuid,
        coalesce(p_args->'p_progress', '{}'::jsonb),
        p_args->'p_history'
      )) into v_result;

    else
      raise exception 'User RPC action is not allowed: %', p_action;
  end case;

  return v_result;
end;
$$;


ALTER FUNCTION "public"."user_rpc_dispatch"("p_action" "text", "p_args" "jsonb", "p_actor_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_coupon"("target_coupon_code" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    coupon_record RECORD;
BEGIN
    -- 1. Buscar o cupom
    SELECT * INTO coupon_record FROM coupons WHERE code = target_coupon_code AND active = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Cupom inválido ou inativo');
    END IF;
    
    -- 2. Validar data de expiração
    IF coupon_record.valid_until IS NOT NULL AND coupon_record.valid_until < NOW() THEN
        RETURN json_build_object('success', false, 'error', 'Cupom expirado');
    END IF;
    
    -- 3. Validar limite de uso
    IF coupon_record.max_uses IS NOT NULL AND coupon_record.uses_count >= coupon_record.max_uses THEN
        RETURN json_build_object('success', false, 'error', 'Cupom esgotado');
    END IF;
    
    RETURN json_build_object(
        'success', true, 
        'coupon_id', coupon_record.id,
        'discount_type', coupon_record.discount_type, 
        'discount_value', coupon_record.discount_value
    );
END;
$$;


ALTER FUNCTION "public"."validate_coupon"("target_coupon_code" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "private"."practice_item_answers" (
    "item_id" "uuid" NOT NULL,
    "answer_key" "jsonb" NOT NULL,
    "explanation" "text" NOT NULL,
    "source_citations" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "validation_result" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "model_id" "text",
    "prompt_version" "text",
    "schema_version" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "practice_item_answers_answer_key_check" CHECK (("jsonb_typeof"("answer_key") = 'object'::"text")),
    CONSTRAINT "practice_item_answers_explanation_check" CHECK ((("char_length"(TRIM(BOTH FROM "explanation")) >= 1) AND ("char_length"(TRIM(BOTH FROM "explanation")) <= 6000))),
    CONSTRAINT "practice_item_answers_source_citations_check" CHECK (("jsonb_typeof"("source_citations") = 'array'::"text")),
    CONSTRAINT "practice_item_answers_validation_result_check" CHECK (("jsonb_typeof"("validation_result") = 'object'::"text"))
);


ALTER TABLE "private"."practice_item_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."active_study_timers" (
    "user_id" "uuid" NOT NULL,
    "topic_id" "uuid",
    "status" "text" DEFAULT 'RUNNING'::"text" NOT NULL,
    "started_at" timestamp with time zone,
    "accumulated_ms" bigint DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "active_study_timers_status_check" CHECK (("status" = ANY (ARRAY['RUNNING'::"text", 'PAUSED'::"text"])))
);


ALTER TABLE "public"."active_study_timers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_alert_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alert_type" "text" NOT NULL,
    "message" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'active'::"text",
    "acknowledged_by" "uuid",
    "acknowledged_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_alert_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_alert_events" IS 'Tabela de alertas operacionais para administradores';



CREATE TABLE IF NOT EXISTS "public"."admin_error_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "error_id" "text" NOT NULL,
    "module" "text" NOT NULL,
    "action" "text" NOT NULL,
    "user_message" "text" NOT NULL,
    "technical_message" "text" NOT NULL,
    "code" "text",
    "severity" "text" NOT NULL,
    "retryable" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "actor_user_id" "uuid",
    "target_user_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "occurrence_count" integer DEFAULT 1 NOT NULL,
    "first_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fingerprint" "text",
    "scope" "text" DEFAULT 'admin'::"text" NOT NULL,
    "category" "text",
    "recoverability" "text",
    "is_user_visible" boolean DEFAULT true,
    "recommended_action" "text",
    "fingerprint_version" "text" DEFAULT 'v1'::"text",
    "classification_feedback" boolean,
    "severity_feedback" boolean,
    "suggested_category" "text",
    "environment" "text" DEFAULT 'production'::"text",
    "route_path" "text",
    "feature_area" "text",
    "actor_email" "text",
    "target_email" "text",
    "session_id" "text",
    "request_id" "text",
    "context_label" "text",
    "assigned_to" "uuid",
    "assigned_at" timestamp with time zone,
    "triage_note" "text",
    "first_response_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    CONSTRAINT "admin_error_events_scope_check" CHECK (("scope" = ANY (ARRAY['admin'::"text", 'core'::"text"]))),
    CONSTRAINT "admin_error_events_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "admin_error_events_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'investigating'::"text", 'resolved'::"text", 'ignored'::"text"])))
);


ALTER TABLE "public"."admin_error_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_error_events" IS 'Tabela de logs de erros técnicos para observabilidade administrativa';



COMMENT ON COLUMN "public"."admin_error_events"."error_id" IS 'ID único do erro no formato ERR-YYYYMMDD-XXXX';



COMMENT ON COLUMN "public"."admin_error_events"."module" IS 'Módulo onde o erro ocorreu (users, auth, reviews, etc.)';



COMMENT ON COLUMN "public"."admin_error_events"."action" IS 'Ação que gerou o erro (update_user_status, create_review, etc.)';



COMMENT ON COLUMN "public"."admin_error_events"."user_message" IS 'Mensagem amigável exibida ao usuário';



COMMENT ON COLUMN "public"."admin_error_events"."technical_message" IS 'Mensagem técnica completa do erro';



COMMENT ON COLUMN "public"."admin_error_events"."severity" IS 'Nível de severidade: low, medium, high, critical';



COMMENT ON COLUMN "public"."admin_error_events"."retryable" IS 'Se a operação pode ser retentada pelo usuário';



COMMENT ON COLUMN "public"."admin_error_events"."status" IS 'Status do incidente: new, investigating, resolved, ignored';



COMMENT ON COLUMN "public"."admin_error_events"."metadata" IS 'Dados contextuais sanitizados (sem informações sensíveis)';



COMMENT ON COLUMN "public"."admin_error_events"."occurrence_count" IS 'Número de vezes que o erro ocorreu (para deduplicação)';



CREATE TABLE IF NOT EXISTS "public"."ai_error_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "error_code" character varying(50),
    "error_message" "text",
    "context" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_error_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_extraction_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "stage" "text",
    "progress" integer DEFAULT 0 NOT NULL,
    "message" "text",
    "mode" "text" DEFAULT 'extractForCargo'::"text" NOT NULL,
    "selected_cargo" "text",
    "analysis_result" "jsonb",
    "source_payload" "jsonb",
    "extraction_result" "jsonb",
    "error_message" "text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ai_extraction_jobs_progress_check" CHECK ((("progress" >= 0) AND ("progress" <= 100))),
    CONSTRAINT "ai_extraction_jobs_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."ai_extraction_jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_extraction_jobs" IS 'Background jobs for AI edital extraction by selected cargo/area.';



CREATE TABLE IF NOT EXISTS "public"."ai_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status" character varying(20) DEFAULT 'unknown'::character varying,
    "last_check" timestamp with time zone,
    "error_message" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "model_name" "text"
);


ALTER TABLE "public"."ai_status" OWNER TO "postgres";


COMMENT ON COLUMN "public"."ai_status"."model_name" IS 'Nome do modelo retornado pelo ai-handler no ultimo check de status.';



CREATE TABLE IF NOT EXISTS "public"."ai_usage_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "model_name" "text" NOT NULL,
    "mode" "text" NOT NULL,
    "prompt_tokens" integer,
    "candidates_tokens" integer,
    "cost_estimate" numeric(10,6) DEFAULT 0.0,
    "status" "text" DEFAULT 'success'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_usage_logs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."ai_usage_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "request_count" integer DEFAULT 1 NOT NULL,
    "last_request" timestamp with time zone DEFAULT "now"() NOT NULL,
    "window_start" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."api_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "table_name" "text",
    "record_id" "uuid",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "changes" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_logs" IS 'Log de auditoria de todas as ações do sistema. Apenas admins+ podem visualizar. Imutável após inserção.';



CREATE TABLE IF NOT EXISTS "public"."billing_access_grants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "plan_code" "text" NOT NULL,
    "starts_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "revoked_at" timestamp with time zone,
    "reason" "text",
    "granted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "billing_access_grants_check" CHECK (("ends_at" > "starts_at")),
    CONSTRAINT "billing_access_grants_plan_code_check" CHECK (("plan_code" = ANY (ARRAY['free_trial'::"text", 'monthly'::"text", 'annual'::"text"]))),
    CONSTRAINT "billing_access_grants_source_check" CHECK (("source" = ANY (ARRAY['trial'::"text", 'manual'::"text", 'goodwill'::"text", 'migration'::"text"])))
);


ALTER TABLE "public"."billing_access_grants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_affiliate_conversions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "affiliate_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "billing_subscription_id" "uuid",
    "payout_id" "uuid",
    "stripe_invoice_id" "text" NOT NULL,
    "stripe_checkout_session_id" "text",
    "plan_code" "text" NOT NULL,
    "gross_amount_cents" integer NOT NULL,
    "discount_amount_cents" integer NOT NULL,
    "paid_amount_cents" integer NOT NULL,
    "commission_percent" smallint NOT NULL,
    "commission_amount_cents" integer NOT NULL,
    "currency" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "paid_at" timestamp with time zone NOT NULL,
    "eligible_at" timestamp with time zone NOT NULL,
    "provider_updated_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "billing_affiliate_conversions_check" CHECK (("eligible_at" >= "paid_at")),
    CONSTRAINT "billing_affiliate_conversions_commission_amount_cents_check" CHECK (("commission_amount_cents" >= 0)),
    CONSTRAINT "billing_affiliate_conversions_commission_percent_check" CHECK ((("commission_percent" >= 1) AND ("commission_percent" <= 100))),
    CONSTRAINT "billing_affiliate_conversions_currency_check" CHECK (("currency" ~ '^[a-z]{3}$'::"text")),
    CONSTRAINT "billing_affiliate_conversions_discount_amount_cents_check" CHECK (("discount_amount_cents" >= 0)),
    CONSTRAINT "billing_affiliate_conversions_gross_amount_cents_check" CHECK (("gross_amount_cents" >= 0)),
    CONSTRAINT "billing_affiliate_conversions_paid_amount_cents_check" CHECK (("paid_amount_cents" >= 0)),
    CONSTRAINT "billing_affiliate_conversions_plan_code_check" CHECK (("plan_code" = ANY (ARRAY['monthly'::"text", 'annual'::"text"]))),
    CONSTRAINT "billing_affiliate_conversions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'refunded'::"text", 'disputed'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."billing_affiliate_conversions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_affiliate_payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "affiliate_id" "uuid" NOT NULL,
    "livemode" boolean NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "amount_cents" integer NOT NULL,
    "conversion_count" integer NOT NULL,
    "payment_reference" "text",
    "paid_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "billing_affiliate_payouts_amount_cents_check" CHECK (("amount_cents" > 0)),
    CONSTRAINT "billing_affiliate_payouts_check" CHECK (("period_end" >= "period_start")),
    CONSTRAINT "billing_affiliate_payouts_conversion_count_check" CHECK (("conversion_count" > 0)),
    CONSTRAINT "billing_affiliate_payouts_payment_reference_check" CHECK ((("payment_reference" IS NULL) OR ("char_length"("payment_reference") <= 160)))
);


ALTER TABLE "public"."billing_affiliate_payouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_affiliates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "stripe_coupon_id" "text" NOT NULL,
    "stripe_promotion_code_id" "text" NOT NULL,
    "discount_percent" smallint DEFAULT 20 NOT NULL,
    "commission_percent" smallint DEFAULT 30 NOT NULL,
    "livemode" boolean NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "billing_affiliates_code_check" CHECK (("code" ~ '^[A-Z0-9][A-Z0-9-]{2,31}$'::"text")),
    CONSTRAINT "billing_affiliates_commission_percent_check" CHECK ((("commission_percent" >= 1) AND ("commission_percent" <= 100))),
    CONSTRAINT "billing_affiliates_discount_percent_check" CHECK ((("discount_percent" >= 1) AND ("discount_percent" <= 100))),
    CONSTRAINT "billing_affiliates_name_check" CHECK ((("char_length"(TRIM(BOTH FROM "name")) >= 2) AND ("char_length"(TRIM(BOTH FROM "name")) <= 120)))
);


ALTER TABLE "public"."billing_affiliates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_checkout_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "request_id" "uuid" NOT NULL,
    "plan_code" "text" NOT NULL,
    "stripe_checkout_session_id" "text",
    "status" "text" DEFAULT 'creating'::"text" NOT NULL,
    "expires_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "error_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "billing_checkout_attempts_plan_code_check" CHECK (("plan_code" = ANY (ARRAY['monthly'::"text", 'annual'::"text"]))),
    CONSTRAINT "billing_checkout_attempts_status_check" CHECK (("status" = ANY (ARRAY['creating'::"text", 'open'::"text", 'complete'::"text", 'expired'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."billing_checkout_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_contract_acceptances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "checkout_attempt_id" "uuid" NOT NULL,
    "livemode" boolean NOT NULL,
    "plan_code" "text" NOT NULL,
    "amount_cents" integer NOT NULL,
    "currency" "text" NOT NULL,
    "billing_interval" "text" NOT NULL,
    "terms_version" "text" NOT NULL,
    "privacy_version" "text" NOT NULL,
    "refund_policy_version" "text" NOT NULL,
    "terms_sha256" "text" NOT NULL,
    "refund_policy_sha256" "text" NOT NULL,
    "accepted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "contracted_at" timestamp with time zone,
    "withdrawal_deadline" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "billing_subscription_id" "uuid",
    CONSTRAINT "billing_contract_acceptances_amount_cents_check" CHECK (("amount_cents" > 0)),
    CONSTRAINT "billing_contract_acceptances_billing_interval_check" CHECK (("billing_interval" = ANY (ARRAY['month'::"text", 'year'::"text"]))),
    CONSTRAINT "billing_contract_acceptances_check" CHECK (((("contracted_at" IS NULL) AND ("withdrawal_deadline" IS NULL)) OR (("contracted_at" IS NOT NULL) AND ("withdrawal_deadline" IS NOT NULL) AND ("withdrawal_deadline" > "contracted_at")))),
    CONSTRAINT "billing_contract_acceptances_currency_check" CHECK (("currency" ~ '^[a-z]{3}$'::"text")),
    CONSTRAINT "billing_contract_acceptances_plan_code_check" CHECK (("plan_code" = ANY (ARRAY['monthly'::"text", 'annual'::"text"]))),
    CONSTRAINT "billing_contract_acceptances_privacy_version_check" CHECK ((("length"("privacy_version") >= 1) AND ("length"("privacy_version") <= 80))),
    CONSTRAINT "billing_contract_acceptances_refund_policy_sha256_check" CHECK (("refund_policy_sha256" ~ '^[a-f0-9]{64}$'::"text")),
    CONSTRAINT "billing_contract_acceptances_refund_policy_version_check" CHECK ((("length"("refund_policy_version") >= 1) AND ("length"("refund_policy_version") <= 80))),
    CONSTRAINT "billing_contract_acceptances_terms_sha256_check" CHECK (("terms_sha256" ~ '^[a-f0-9]{64}$'::"text")),
    CONSTRAINT "billing_contract_acceptances_terms_version_check" CHECK ((("length"("terms_version") >= 1) AND ("length"("terms_version") <= 80)))
);


ALTER TABLE "public"."billing_contract_acceptances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "text" DEFAULT 'stripe'::"text" NOT NULL,
    "stripe_customer_id" "text" NOT NULL,
    "livemode" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "billing_customers_provider_check" CHECK (("provider" = 'stripe'::"text"))
);


ALTER TABLE "public"."billing_customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_plan_change_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "billing_subscription_id" "uuid" NOT NULL,
    "livemode" boolean NOT NULL,
    "from_plan_code" "text" NOT NULL,
    "to_plan_code" "text" NOT NULL,
    "effective_at" timestamp with time zone NOT NULL,
    "stripe_schedule_id" "text",
    "status" "text" DEFAULT 'creating'::"text" NOT NULL,
    "terms_version" "text" NOT NULL,
    "privacy_version" "text" NOT NULL,
    "refund_policy_version" "text" NOT NULL,
    "terms_sha256" "text" NOT NULL,
    "refund_policy_sha256" "text" NOT NULL,
    "accepted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scheduled_at" timestamp with time zone,
    "canceled_at" timestamp with time zone,
    "applied_at" timestamp with time zone,
    "confirmation_email_sent_at" timestamp with time zone,
    "error_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "billing_plan_change_requests_check" CHECK (("effective_at" > "created_at")),
    CONSTRAINT "billing_plan_change_requests_check1" CHECK (((("status" = 'scheduled'::"text") AND ("stripe_schedule_id" IS NOT NULL) AND ("scheduled_at" IS NOT NULL)) OR ("status" <> 'scheduled'::"text"))),
    CONSTRAINT "billing_plan_change_requests_error_code_check" CHECK ((("error_code" IS NULL) OR ("length"("error_code") <= 250))),
    CONSTRAINT "billing_plan_change_requests_from_plan_code_check" CHECK (("from_plan_code" = 'monthly'::"text")),
    CONSTRAINT "billing_plan_change_requests_privacy_version_check" CHECK ((("length"("privacy_version") >= 1) AND ("length"("privacy_version") <= 80))),
    CONSTRAINT "billing_plan_change_requests_refund_policy_sha256_check" CHECK (("refund_policy_sha256" ~ '^[a-f0-9]{64}$'::"text")),
    CONSTRAINT "billing_plan_change_requests_refund_policy_version_check" CHECK ((("length"("refund_policy_version") >= 1) AND ("length"("refund_policy_version") <= 80))),
    CONSTRAINT "billing_plan_change_requests_status_check" CHECK (("status" = ANY (ARRAY['creating'::"text", 'scheduled'::"text", 'canceled'::"text", 'applied'::"text", 'failed'::"text"]))),
    CONSTRAINT "billing_plan_change_requests_terms_sha256_check" CHECK (("terms_sha256" ~ '^[a-f0-9]{64}$'::"text")),
    CONSTRAINT "billing_plan_change_requests_terms_version_check" CHECK ((("length"("terms_version") >= 1) AND ("length"("terms_version") <= 80))),
    CONSTRAINT "billing_plan_change_requests_to_plan_code_check" CHECK (("to_plan_code" = 'annual'::"text"))
);


ALTER TABLE "public"."billing_plan_change_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_refund_admin_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action_request_id" "uuid" NOT NULL,
    "billing_refund_request_id" "uuid" NOT NULL,
    "actor_user_id" "uuid" NOT NULL,
    "livemode" boolean NOT NULL,
    "action" "text" DEFAULT 'reconcile'::"text" NOT NULL,
    "reason" "text" NOT NULL,
    "status" "text" DEFAULT 'processing'::"text" NOT NULL,
    "request_status_before" "text" NOT NULL,
    "request_status_after" "text",
    "error_code" "text",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finished_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "billing_refund_admin_actions_action_check" CHECK (("action" = 'reconcile'::"text")),
    CONSTRAINT "billing_refund_admin_actions_error_code_check" CHECK ((("error_code" IS NULL) OR ("length"("error_code") <= 250))),
    CONSTRAINT "billing_refund_admin_actions_reason_check" CHECK ((("length"("btrim"("reason")) >= 10) AND ("length"("btrim"("reason")) <= 500))),
    CONSTRAINT "billing_refund_admin_actions_status_check" CHECK (("status" = ANY (ARRAY['processing'::"text", 'succeeded'::"text", 'no_change'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."billing_refund_admin_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_refund_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "billing_subscription_id" "uuid" NOT NULL,
    "billing_contract_acceptance_id" "uuid" NOT NULL,
    "livemode" boolean NOT NULL,
    "request_reason" "text" DEFAULT 'consumer_withdrawal'::"text" NOT NULL,
    "eligibility_started_at" timestamp with time zone NOT NULL,
    "eligibility_deadline" timestamp with time zone NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "amount_cents" integer NOT NULL,
    "currency" "text" NOT NULL,
    "stripe_invoice_id" "text",
    "stripe_payment_intent_id" "text",
    "stripe_refund_id" "text",
    "status" "text" DEFAULT 'requested'::"text" NOT NULL,
    "subscription_cancel_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "processing_started_at" timestamp with time zone,
    "processing_attempts" integer DEFAULT 0 NOT NULL,
    "last_stripe_event_created_at" timestamp with time zone,
    "error_code" "text",
    "received_email_sent_at" timestamp with time zone,
    "result_email_sent_at" timestamp with time zone,
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "result_email_status" "text",
    CONSTRAINT "billing_refund_requests_amount_cents_check" CHECK (("amount_cents" > 0)),
    CONSTRAINT "billing_refund_requests_check" CHECK (("eligibility_deadline" > "eligibility_started_at")),
    CONSTRAINT "billing_refund_requests_currency_check" CHECK (("currency" ~ '^[a-z]{3}$'::"text")),
    CONSTRAINT "billing_refund_requests_error_code_check" CHECK ((("error_code" IS NULL) OR ("length"("error_code") <= 250))),
    CONSTRAINT "billing_refund_requests_processing_attempts_check" CHECK (("processing_attempts" >= 0)),
    CONSTRAINT "billing_refund_requests_request_reason_check" CHECK (("request_reason" = 'consumer_withdrawal'::"text")),
    CONSTRAINT "billing_refund_requests_result_email_status_check" CHECK ((("result_email_status" IS NULL) OR ("result_email_status" = ANY (ARRAY['succeeded'::"text", 'failed'::"text", 'manual_review'::"text"])))),
    CONSTRAINT "billing_refund_requests_status_check" CHECK (("status" = ANY (ARRAY['requested'::"text", 'processing'::"text", 'pending'::"text", 'succeeded'::"text", 'failed'::"text", 'manual_review'::"text", 'rejected'::"text"]))),
    CONSTRAINT "billing_refund_requests_subscription_cancel_status_check" CHECK (("subscription_cancel_status" = ANY (ARRAY['pending'::"text", 'succeeded'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."billing_refund_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "billing_customer_id" "uuid" NOT NULL,
    "stripe_subscription_id" "text" NOT NULL,
    "stripe_product_id" "text" NOT NULL,
    "stripe_price_id" "text" NOT NULL,
    "plan_code" "text" NOT NULL,
    "status" "text" NOT NULL,
    "amount_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'brl'::"text" NOT NULL,
    "billing_interval" "text" NOT NULL,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "canceled_at" timestamp with time zone,
    "scheduled_plan_code" "text",
    "stripe_schedule_id" "text",
    "latest_invoice_id" "text",
    "default_payment_method_id" "text",
    "card_brand" "text",
    "card_last4" "text",
    "access_suspended_at" timestamp with time zone,
    "access_suspension_reason" "text",
    "access_restored_at" timestamp with time zone,
    "provider_created_at" timestamp with time zone,
    "last_event_created_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cancel_at" timestamp with time zone,
    CONSTRAINT "billing_subscriptions_amount_cents_check" CHECK (("amount_cents" >= 0)),
    CONSTRAINT "billing_subscriptions_billing_interval_check" CHECK (("billing_interval" = ANY (ARRAY['month'::"text", 'year'::"text"]))),
    CONSTRAINT "billing_subscriptions_card_last4_check" CHECK ((("card_last4" IS NULL) OR ("card_last4" ~ '^[0-9]{4}$'::"text"))),
    CONSTRAINT "billing_subscriptions_currency_check" CHECK (("currency" ~ '^[a-z]{3}$'::"text")),
    CONSTRAINT "billing_subscriptions_plan_code_check" CHECK (("plan_code" = ANY (ARRAY['monthly'::"text", 'annual'::"text"]))),
    CONSTRAINT "billing_subscriptions_scheduled_plan_code_check" CHECK (("scheduled_plan_code" = ANY (ARRAY['monthly'::"text", 'annual'::"text"]))),
    CONSTRAINT "billing_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['incomplete'::"text", 'incomplete_expired'::"text", 'trialing'::"text", 'active'::"text", 'past_due'::"text", 'canceled'::"text", 'unpaid'::"text", 'paused'::"text"])))
);


ALTER TABLE "public"."billing_subscriptions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."billing_subscriptions"."cancel_at" IS 'Stripe scheduled cancellation timestamp. Required by flexible billing subscriptions.';



CREATE TABLE IF NOT EXISTS "public"."billing_webhook_events" (
    "stripe_event_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "stripe_object_id" "text",
    "livemode" boolean NOT NULL,
    "event_created_at" timestamp with time zone NOT NULL,
    "processing_status" "text" DEFAULT 'processing'::"text" NOT NULL,
    "attempts" integer DEFAULT 1 NOT NULL,
    "error_code" "text",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone,
    CONSTRAINT "billing_webhook_events_attempts_check" CHECK (("attempts" > 0)),
    CONSTRAINT "billing_webhook_events_processing_status_check" CHECK (("processing_status" = ANY (ARRAY['processing'::"text", 'processed'::"text", 'failed'::"text", 'ignored'::"text"])))
);


ALTER TABLE "public"."billing_webhook_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "content" "text" NOT NULL,
    "status" "text" DEFAULT 'published'::"text",
    "likes_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


COMMENT ON TABLE "public"."comments" IS 'Comentários hierárquicos. Visibilidade baseada no post pai e moderação por roles.';



CREATE TABLE IF NOT EXISTS "public"."coupon_uses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coupon_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "used_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."coupon_uses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "discount_type" "text" NOT NULL,
    "discount_value" numeric NOT NULL,
    "max_uses" integer,
    "uses_count" integer DEFAULT 0 NOT NULL,
    "valid_until" timestamp with time zone,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "coupons_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['PERCENTAGE'::"text", 'FIXED'::"text"]))),
    CONSTRAINT "coupons_discount_value_check" CHECK (("discount_value" > (0)::numeric))
);


ALTER TABLE "public"."coupons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cycle_rotation_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_cycle_id" "uuid" NOT NULL,
    "cycle_number" integer NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "subject_count" integer DEFAULT 0 NOT NULL,
    "studied_subject_count" integer DEFAULT 0 NOT NULL,
    "topics_started_count" integer DEFAULT 0 NOT NULL,
    "topics_completed_count" integer DEFAULT 0 NOT NULL,
    "studied_subject_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "cycle_subject_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "edital_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "per_subject" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."cycle_rotation_snapshots" OWNER TO "postgres";


COMMENT ON TABLE "public"."cycle_rotation_snapshots" IS 'Resumo fechado de cada giro/ciclo antes de iniciar o proximo. Alimenta comparacoes entre ciclos.';



COMMENT ON COLUMN "public"."cycle_rotation_snapshots"."per_subject" IS 'Lista de materias com total de topicos, topicos iniciados no ciclo, concluidos no ciclo e status de materia estudada.';



CREATE TABLE IF NOT EXISTS "public"."cycle_rotations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cycle_id" "uuid" NOT NULL,
    "rotation_number" integer DEFAULT 1 NOT NULL,
    "started_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."cycle_rotations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cycle_study_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_cycle_id" "uuid",
    "cycle_number" integer DEFAULT 1 NOT NULL,
    "event_type" "text" NOT NULL,
    "subject_id" "uuid",
    "topic_id" "uuid",
    "edital_id" "uuid",
    "subject_position" integer,
    "cycle_order_snapshot" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cycle_study_events_cycle_number_check" CHECK (("cycle_number" >= 1)),
    CONSTRAINT "cycle_study_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['topic_started'::"text", 'topic_reviewed'::"text", 'topic_continued'::"text", 'subject_marked_studied'::"text", 'subject_returned_to_queue'::"text", 'cycle_reordered'::"text"]))),
    CONSTRAINT "cycle_study_events_subject_position_check" CHECK ((("subject_position" IS NULL) OR ("subject_position" >= 1)))
);


ALTER TABLE "public"."cycle_study_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."cycle_study_events" IS 'Eventos reais do uso da fila do ciclo: topico iniciado, topico revisado, materia marcada, materia devolvida e reordenacao.';



COMMENT ON COLUMN "public"."cycle_study_events"."event_type" IS 'Tipo do evento de ciclo/fila.';



COMMENT ON COLUMN "public"."cycle_study_events"."subject_position" IS 'Posicao da materia na fila no momento do evento, com base em user_cycles.ciclo_atual.';



COMMENT ON COLUMN "public"."cycle_study_events"."cycle_order_snapshot" IS 'Snapshot da ordem da fila no momento do evento.';



COMMENT ON COLUMN "public"."cycle_study_events"."metadata" IS 'Contexto adicional do evento, sem substituir dados canonicos de topics/topic_review_history.';



CREATE TABLE IF NOT EXISTS "public"."cycle_study_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rotation_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "studied_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."cycle_study_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cycle_subject_states" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "cycle_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "last_studied_date" "date",
    "completed_in_current_rotation" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."cycle_subject_states" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."edital_incidence_maps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "edital_id" "uuid" NOT NULL,
    "user_cycle_id" "uuid",
    "status" "text" DEFAULT 'nao_iniciado'::"text" NOT NULL,
    "total_topics" integer DEFAULT 0 NOT NULL,
    "with_signal_count" integer DEFAULT 0 NOT NULL,
    "no_signal_count" integer DEFAULT 0 NOT NULL,
    "catalog_count" integer DEFAULT 0 NOT NULL,
    "ai_count" integer DEFAULT 0 NOT NULL,
    "skipped_count" integer DEFAULT 0 NOT NULL,
    "error_count" integer DEFAULT 0 NOT NULL,
    "pending_count" integer DEFAULT 0 NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "last_processed_at" timestamp with time zone,
    "last_error" "text",
    "notification_sent_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "edital_incidence_maps_ai_count_check" CHECK (("ai_count" >= 0)),
    CONSTRAINT "edital_incidence_maps_catalog_count_check" CHECK (("catalog_count" >= 0)),
    CONSTRAINT "edital_incidence_maps_error_count_check" CHECK (("error_count" >= 0)),
    CONSTRAINT "edital_incidence_maps_no_signal_count_check" CHECK (("no_signal_count" >= 0)),
    CONSTRAINT "edital_incidence_maps_pending_count_check" CHECK (("pending_count" >= 0)),
    CONSTRAINT "edital_incidence_maps_skipped_count_check" CHECK (("skipped_count" >= 0)),
    CONSTRAINT "edital_incidence_maps_status_check" CHECK (("status" = ANY (ARRAY['nao_iniciado'::"text", 'em_fila'::"text", 'processando'::"text", 'concluido_parcial'::"text", 'concluido'::"text", 'erro'::"text"]))),
    CONSTRAINT "edital_incidence_maps_total_topics_check" CHECK (("total_topics" >= 0)),
    CONSTRAINT "edital_incidence_maps_with_signal_count_check" CHECK (("with_signal_count" >= 0))
);


ALTER TABLE "public"."edital_incidence_maps" OWNER TO "postgres";


COMMENT ON TABLE "public"."edital_incidence_maps" IS 'Status e resumo do mapa de cobranca/sinal bruto por edital do aluno. O catalogo global de sinais permanece em topic_incidence_catalog.';



COMMENT ON COLUMN "public"."edital_incidence_maps"."status" IS 'Status do processamento do mapa: nao_iniciado, em_fila, processando, concluido_parcial, concluido ou erro.';



CREATE TABLE IF NOT EXISTS "public"."edital_suggestions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "concurso" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "response_message" "text",
    "responded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "edital_suggestions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'cadastrado'::"text", 'ja_cadastrado'::"text", 'nao_cadastrado'::"text"])))
);


ALTER TABLE "public"."edital_suggestions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."feedback_protocol_seq"
    START WITH 10001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."feedback_protocol_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flashcard_schedules" (
    "user_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "due_at" timestamp with time zone NOT NULL,
    "state" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "repetitions" integer DEFAULT 0 NOT NULL,
    "lapses" integer DEFAULT 0 NOT NULL,
    "last_rating" "public"."practice_attempt_result",
    "algorithm_version" "text" DEFAULT 'v1'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "flashcard_schedules_lapses_check" CHECK (("lapses" >= 0)),
    CONSTRAINT "flashcard_schedules_last_rating_check" CHECK ((("last_rating" IS NULL) OR ("last_rating" = ANY (ARRAY['recalled'::"public"."practice_attempt_result", 'effortful'::"public"."practice_attempt_result", 'forgotten'::"public"."practice_attempt_result"])))),
    CONSTRAINT "flashcard_schedules_repetitions_check" CHECK (("repetitions" >= 0)),
    CONSTRAINT "flashcard_schedules_state_check" CHECK (("jsonb_typeof"("state") = 'object'::"text"))
);


ALTER TABLE "public"."flashcard_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."general_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "note_content_length" CHECK (("char_length"("content") <= 100000))
);


ALTER TABLE "public"."general_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."general_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "reminder_date" timestamp with time zone,
    "completed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "reminder_text_length" CHECK ((("char_length"("text") <= 1000) AND ("char_length"("text") > 0)))
);


ALTER TABLE "public"."general_reminders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."incident_action_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "incident_id" "text" NOT NULL,
    "incident_type" "text" NOT NULL,
    "action_type" "text" NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "note" "text",
    "actor_user_id" "uuid" NOT NULL,
    "actor_email" "text",
    "actor_role" "text",
    CONSTRAINT "incident_action_log_action_type_check" CHECK (("action_type" = ANY (ARRAY['status_change'::"text", 'assignment'::"text", 'triage_note'::"text", 'response_note'::"text", 'reassignment'::"text"]))),
    CONSTRAINT "incident_action_log_incident_type_check" CHECK (("incident_type" = ANY (ARRAY['error'::"text", 'feedback'::"text"])))
);


ALTER TABLE "public"."incident_action_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."legal_document_acceptances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "acceptance_context" "text" NOT NULL,
    "terms_version" "text" NOT NULL,
    "privacy_version" "text" NOT NULL,
    "accepted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "legal_document_acceptances_acceptance_context_check" CHECK (("acceptance_context" = 'signup_trial'::"text")),
    CONSTRAINT "legal_document_acceptances_privacy_version_check" CHECK ((("length"("privacy_version") >= 1) AND ("length"("privacy_version") <= 80))),
    CONSTRAINT "legal_document_acceptances_terms_version_check" CHECK ((("length"("terms_version") >= 1) AND ("length"("terms_version") <= 80)))
);


ALTER TABLE "public"."legal_document_acceptances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text",
    "type" "text" DEFAULT 'info'::"text",
    "read" boolean DEFAULT false,
    "action_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Sistema de notificações. Usuários veem apenas suas notificações. Admins podem gerenciar todas.';



CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'member'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "owner_id" "uuid" NOT NULL,
    "is_public" boolean DEFAULT false,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON TABLE "public"."organizations" IS 'Sistema de organizações/equipes. Owners gerenciam, membros acessam, público vê organizações públicas.';



CREATE TABLE IF NOT EXISTS "public"."pending_ai_extractions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "edital_name" "text" NOT NULL,
    "origin" "text",
    "position" "text",
    "year" "text",
    "ai_result" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "analysis_result" "jsonb",
    "selected_cargo" "text",
    "source_type" "text",
    "pdf_url" "text",
    "source_files" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    CONSTRAINT "pending_ai_extractions_source_files_is_array" CHECK (("jsonb_typeof"("source_files") = 'array'::"text"))
);


ALTER TABLE "public"."pending_ai_extractions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pending_ai_extractions"."analysis_result" IS 'Resultado da etapa inicial de análise do edital: metadados e cargos disponíveis.';



COMMENT ON COLUMN "public"."pending_ai_extractions"."selected_cargo" IS 'Cargo selecionado pelo usuário antes da extração de disciplinas.';



COMMENT ON COLUMN "public"."pending_ai_extractions"."source_type" IS 'Origem do documento analisado: text ou pdf.';



COMMENT ON COLUMN "public"."pending_ai_extractions"."pdf_url" IS 'URL temporária do PDF usado na extração, quando houver.';



COMMENT ON COLUMN "public"."pending_ai_extractions"."source_files" IS 'Storage paths for the main edital and its companion annexes. pdf_url remains the backwards-compatible primary document reference.';



CREATE TABLE IF NOT EXISTS "public"."pending_cycle_merges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "edital_id" "uuid",
    "state_data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pending_cycle_merges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pending_merge_suggestions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "cycle_id" "uuid",
    "suggestion_type" "text" NOT NULL,
    "original_names" "jsonb" NOT NULL,
    "suggested_name" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "original_ids" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "reviewed_at" timestamp with time zone,
    CONSTRAINT "pending_merge_suggestions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "pending_merge_suggestions_suggestion_type_check" CHECK (("suggestion_type" = ANY (ARRAY['subject'::"text", 'topic'::"text"])))
);


ALTER TABLE "public"."pending_merge_suggestions" OWNER TO "postgres";


COMMENT ON TABLE "public"."pending_merge_suggestions" IS 'Sugestões de mesclagem geradas pela IAawait，等待用户审核';



COMMENT ON COLUMN "public"."pending_merge_suggestions"."suggestion_type" IS 'Tipo: subject ou topic';



COMMENT ON COLUMN "public"."pending_merge_suggestions"."original_names" IS 'Array de nomes originais a serem unificados';



COMMENT ON COLUMN "public"."pending_merge_suggestions"."status" IS 'pending=aguardo, approved=aprovado, rejected=rejeitado';



CREATE TABLE IF NOT EXISTS "public"."plan_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "value" numeric NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "features" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "badge" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "plan_configs_slug_check" CHECK (("slug" = ANY (ARRAY['monthly'::"text", 'annual'::"text"]))),
    CONSTRAINT "plan_configs_value_check" CHECK (("value" >= (0)::numeric))
);


ALTER TABLE "public"."plan_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pomodoro_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "sessions_completed" integer DEFAULT 0,
    "total_minutes_studied" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pomodoro_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "status" "text" DEFAULT 'draft'::"text",
    "visibility" "text" DEFAULT 'public'::"text",
    "tags" "text"[],
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "published_at" timestamp with time zone
);


ALTER TABLE "public"."posts" OWNER TO "postgres";


COMMENT ON TABLE "public"."posts" IS 'Sistema de posts com moderação. Diferentes níveis de acesso baseados em role e status do conteúdo.';



CREATE TABLE IF NOT EXISTS "public"."practice_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "topic_id" "uuid",
    "attempt_kind" "public"."practice_attempt_kind" NOT NULL,
    "answer_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "result" "public"."practice_attempt_result" NOT NULL,
    "response_time_ms" integer,
    "mistake_tag" "text",
    "client_attempt_id" "uuid" NOT NULL,
    "algorithm_version" "text" DEFAULT 'v1'::"text" NOT NULL,
    "invalidated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "practice_attempts_answer_payload_check" CHECK (("jsonb_typeof"("answer_payload") = 'object'::"text")),
    CONSTRAINT "practice_attempts_check" CHECK (((("attempt_kind" = 'objective_answer'::"public"."practice_attempt_kind") AND ("result" = ANY (ARRAY['correct'::"public"."practice_attempt_result", 'incorrect'::"public"."practice_attempt_result", 'skipped'::"public"."practice_attempt_result"]))) OR (("attempt_kind" = 'flashcard_recall'::"public"."practice_attempt_kind") AND ("result" = ANY (ARRAY['recalled'::"public"."practice_attempt_result", 'effortful'::"public"."practice_attempt_result", 'forgotten'::"public"."practice_attempt_result"]))))),
    CONSTRAINT "practice_attempts_response_time_ms_check" CHECK ((("response_time_ms" IS NULL) OR (("response_time_ms" >= 0) AND ("response_time_ms" <= 7200000))))
);


ALTER TABLE "public"."practice_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practice_item_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_id" "uuid",
    "item_id" "uuid" NOT NULL,
    "rating" smallint NOT NULL,
    "reason" "public"."practice_feedback_reason",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "practice_item_feedback_check" CHECK (((("rating" = 1) AND ("reason" IS NULL)) OR (("rating" = '-1'::integer) AND ("reason" IS NOT NULL)))),
    CONSTRAINT "practice_item_feedback_rating_check" CHECK (("rating" = ANY (ARRAY['-1'::integer, 1])))
);


ALTER TABLE "public"."practice_item_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practice_item_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "reason" "public"."practice_feedback_reason" NOT NULL,
    "details" "text",
    "status" "public"."practice_report_status" DEFAULT 'open'::"public"."practice_report_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "practice_item_reports_details_check" CHECK ((("details" IS NULL) OR ("char_length"("details") <= 1000)))
);


ALTER TABLE "public"."practice_item_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practice_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "package_id" "uuid" NOT NULL,
    "item_type" "public"."practice_item_type" NOT NULL,
    "prompt" "text" NOT NULL,
    "options" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "learning_objective" "text",
    "depth" "text",
    "target_difficulty" "text",
    "scope_fingerprint" "text",
    "source_kind" "text" DEFAULT 'generated'::"text" NOT NULL,
    "source_hash" "text",
    "legal_as_of" "date",
    "content_version" integer DEFAULT 1 NOT NULL,
    "status" "public"."practice_item_status" DEFAULT 'draft'::"public"."practice_item_status" NOT NULL,
    "quality_score" numeric(5,2),
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "practice_items_check" CHECK (((("item_type" = 'flashcard'::"public"."practice_item_type") AND ("jsonb_array_length"("options") = 0)) OR (("item_type" = 'true_false'::"public"."practice_item_type") AND ("jsonb_array_length"("options") = 2)) OR (("item_type" = 'multiple_choice'::"public"."practice_item_type") AND (("jsonb_array_length"("options") >= 2) AND ("jsonb_array_length"("options") <= 6))))),
    CONSTRAINT "practice_items_content_version_check" CHECK (("content_version" > 0)),
    CONSTRAINT "practice_items_depth_check" CHECK (("depth" = ANY (ARRAY['foundation'::"text", 'application'::"text", 'distinction'::"text", 'integration'::"text"]))),
    CONSTRAINT "practice_items_options_check" CHECK (("jsonb_typeof"("options") = 'array'::"text")),
    CONSTRAINT "practice_items_prompt_check" CHECK ((("char_length"(TRIM(BOTH FROM "prompt")) >= 1) AND ("char_length"(TRIM(BOTH FROM "prompt")) <= 4000))),
    CONSTRAINT "practice_items_quality_score_check" CHECK ((("quality_score" >= (0)::numeric) AND ("quality_score" <= (100)::numeric))),
    CONSTRAINT "practice_items_source_kind_check" CHECK (("source_kind" = ANY (ARRAY['generated'::"text", 'curated'::"text", 'imported'::"text"]))),
    CONSTRAINT "practice_items_target_difficulty_check" CHECK (("target_difficulty" = ANY (ARRAY['basic'::"text", 'intermediate'::"text", 'advanced'::"text"])))
);


ALTER TABLE "public"."practice_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practice_packages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "topic_id" "uuid" NOT NULL,
    "context_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "source_hash" "text",
    "quick_recap" "jsonb",
    "content_version" integer DEFAULT 1 NOT NULL,
    "bank_profile_version" "text",
    "status" "public"."practice_package_status" DEFAULT 'draft'::"public"."practice_package_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "practice_packages_content_version_check" CHECK (("content_version" > 0)),
    CONSTRAINT "practice_packages_context_snapshot_check" CHECK (("jsonb_typeof"("context_snapshot") = 'object'::"text")),
    CONSTRAINT "practice_packages_quick_recap_check" CHECK ((("quick_recap" IS NULL) OR ("jsonb_typeof"("quick_recap") = 'object'::"text")))
);


ALTER TABLE "public"."practice_packages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practice_session_items" (
    "session_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "topic_id" "uuid",
    "position" smallint NOT NULL,
    "served_reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "practice_session_items_position_check" CHECK (("position" > 0)),
    CONSTRAINT "practice_session_items_served_reason_check" CHECK ((("char_length"(TRIM(BOTH FROM "served_reason")) >= 1) AND ("char_length"(TRIM(BOTH FROM "served_reason")) <= 160)))
);


ALTER TABLE "public"."practice_session_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practice_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "topic_id" "uuid",
    "cycle_id" "uuid",
    "mode" "public"."practice_session_mode" NOT NULL,
    "status" "public"."practice_session_status" DEFAULT 'active'::"public"."practice_session_status" NOT NULL,
    "signal_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "algorithm_version" "text" DEFAULT 'v1'::"text" NOT NULL,
    "idempotency_key" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "practice_sessions_check" CHECK ((("status" = 'completed'::"public"."practice_session_status") = ("completed_at" IS NOT NULL))),
    CONSTRAINT "practice_sessions_signal_snapshot_check" CHECK (("jsonb_typeof"("signal_snapshot") = 'object'::"text"))
);


ALTER TABLE "public"."practice_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "name" "text",
    "email" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "phone" "text",
    "provider_type" "text" DEFAULT 'Email'::"text",
    "display_name" "text",
    "bio" "text",
    "website" "text",
    "location" "text",
    "is_public" boolean DEFAULT true,
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "deleted_at" timestamp with time zone,
    "last_sign_in_at" timestamp with time zone,
    "last_access_at" timestamp with time zone,
    "marketing_opt_in" boolean DEFAULT false NOT NULL,
    "marketing_opt_in_at" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "deactivated_at" timestamp with time zone,
    "deactivated_by" "uuid"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Perfis dos usuários. Usuários gerenciam próprio perfil, podem ver perfis públicos. Admins veem tudo.';



COMMENT ON COLUMN "public"."profiles"."deleted_at" IS 'Timestamp for soft delete. If NULL, user is active. If set, user is archived.';



CREATE TABLE IF NOT EXISTS "public"."public_editais" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organ" "text" NOT NULL,
    "position" "text" NOT NULL,
    "status" "text" NOT NULL,
    "year" "text" NOT NULL,
    "category" "text" NOT NULL,
    "subjects" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_public" boolean DEFAULT true,
    "exam_date" "text",
    "created_by" "uuid",
    "exam_board" "text"
);


ALTER TABLE "public"."public_editais" OWNER TO "postgres";


COMMENT ON COLUMN "public"."public_editais"."exam_date" IS 'Data da prova do concurso (opcional)';



COMMENT ON COLUMN "public"."public_editais"."created_by" IS 'ID do administrador que cadastrou o edital no catálogo público';



COMMENT ON COLUMN "public"."public_editais"."exam_board" IS 'Banca organizadora do edital oficial, when informada ou identificada pela IA.';



CREATE TABLE IF NOT EXISTS "public"."question_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "subject" "text" NOT NULL,
    "topic" "text" NOT NULL,
    "bank" "text" NOT NULL,
    "question_text" "text" NOT NULL,
    "question_type" "text" NOT NULL,
    "difficulty" "text" NOT NULL,
    "user_answer" "text",
    "correct_answer" "text" NOT NULL,
    "is_correct" boolean NOT NULL,
    "attempted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "question_attempts_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['facil'::"text", 'medio'::"text", 'dificil'::"text"]))),
    CONSTRAINT "question_attempts_question_type_check" CHECK (("question_type" = ANY (ARRAY['multipla-escolha'::"text", 'verdadeiro-falso'::"text", 'dissertativa'::"text"])))
);


ALTER TABLE "public"."question_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."study_cycles_v2" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "study_cycles_v2_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'paused'::"text"])))
);


ALTER TABLE "public"."study_cycles_v2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."study_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "subject_id" "uuid",
    "subject_name" "text" NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "study_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "session_duration_minutes" integer DEFAULT 0,
    "cycle_position" integer DEFAULT 1,
    "topics_studied" "text"[] DEFAULT '{}'::"text"[],
    "topics_count" integer DEFAULT 0,
    "hour_of_day" integer DEFAULT 12 NOT NULL,
    "day_of_week" integer DEFAULT 1 NOT NULL,
    "is_weekend" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "cycle_id" "uuid",
    "edital_id" "uuid",
    "contact_type" "text" DEFAULT 'unclassified'::"text" NOT NULL,
    CONSTRAINT "study_sessions_contact_type_check" CHECK (("contact_type" = ANY (ARRAY['first_contact'::"text", 'review'::"text", 'continuation'::"text", 'mixed'::"text", 'subject_session'::"text", 'unclassified'::"text"])))
);


ALTER TABLE "public"."study_sessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."study_sessions"."contact_type" IS 'Nature of the recorded session. Historical rows remain unclassified unless the writer provided a reliable type.';



CREATE TABLE IF NOT EXISTS "public"."subject_merges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "cycle_id" "uuid",
    "primary_subject_id" "uuid" NOT NULL,
    "merged_subject_ids" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "display_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reverted_at" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_by_ai" boolean DEFAULT false,
    "match_type" "text",
    "source_edital_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    CONSTRAINT "subject_merges_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'reverted'::"text"])))
);


ALTER TABLE "public"."subject_merges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subject_relations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "main_subject_id" "uuid" NOT NULL,
    "merged_subject_ids" "uuid"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subject_relations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subjects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text",
    "priority" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'Nova'::"text" NOT NULL,
    "completed_at" timestamp with time zone,
    "total_study_time_minutes" integer DEFAULT 0,
    "notes" "jsonb" DEFAULT '{}'::"jsonb",
    "is_visible" boolean DEFAULT true,
    "edital_id" "uuid",
    "is_unified" boolean DEFAULT false,
    "exam_weight_points" numeric,
    "exam_weight_questions" integer,
    "exam_weight_percentage" numeric,
    "exam_weight_raw" "text",
    CONSTRAINT "subject_name_length" CHECK ((("char_length"("name") <= 200) AND ("char_length"("name") > 0)))
);

ALTER TABLE ONLY "public"."subjects" REPLICA IDENTITY FULL;


ALTER TABLE "public"."subjects" OWNER TO "postgres";


COMMENT ON COLUMN "public"."subjects"."exam_weight_points" IS 'Pontuação/peso oficial da matéria no edital, quando identificado pela IA.';



COMMENT ON COLUMN "public"."subjects"."exam_weight_questions" IS 'Quantidade de questões da matéria no edital, quando identificada pela IA.';



COMMENT ON COLUMN "public"."subjects"."exam_weight_percentage" IS 'Percentual da matéria na prova, quando identificado pela IA.';



COMMENT ON COLUMN "public"."subjects"."exam_weight_raw" IS 'Trecho bruto do edital usado como evidência do peso da matéria.';



CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "jsonb",
    "visible_to_users" boolean DEFAULT false,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."system_settings" IS 'Configurações globais do sistema. Owners podem gerenciar tudo, usuários veem apenas configurações públicas.';



CREATE TABLE IF NOT EXISTS "public"."topic_incidence_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "context_hash" "text" NOT NULL,
    "topic_key" "text" NOT NULL,
    "topic_name" "text" NOT NULL,
    "subject_key" "text" NOT NULL,
    "subject_name" "text" NOT NULL,
    "exam_board_key" "text",
    "exam_board_name" "text",
    "career_key" "text",
    "career_name" "text",
    "organization_key" "text",
    "organization_name" "text",
    "total_volume" integer DEFAULT 0 NOT NULL,
    "importance_score" smallint,
    "source" "text" DEFAULT 'ai'::"text" NOT NULL,
    "confidence_status" "text" DEFAULT 'auto'::"text" NOT NULL,
    "search_context" "text",
    "winner_query" "text",
    "audit_log" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "analysis_metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "sample_count" integer DEFAULT 1 NOT NULL,
    "last_analyzed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "topic_incidence_catalog_confidence_status_check" CHECK (("confidence_status" = ANY (ARRAY['auto'::"text", 'approved'::"text", 'needs_review'::"text", 'rejected'::"text"]))),
    CONSTRAINT "topic_incidence_catalog_importance_score_check" CHECK ((("importance_score" >= 1) AND ("importance_score" <= 5))),
    CONSTRAINT "topic_incidence_catalog_sample_count_check" CHECK (("sample_count" >= 1)),
    CONSTRAINT "topic_incidence_catalog_source_check" CHECK (("source" = ANY (ARRAY['ai'::"text", 'manual'::"text", 'admin'::"text"]))),
    CONSTRAINT "topic_incidence_catalog_total_volume_check" CHECK (("total_volume" >= 0))
);


ALTER TABLE "public"."topic_incidence_catalog" OWNER TO "postgres";


COMMENT ON TABLE "public"."topic_incidence_catalog" IS 'Catalogo compartilhado de incidencia/cobranca de topicos normalizados para reaproveitar analises antes de chamar IA.';



CREATE TABLE IF NOT EXISTS "public"."topic_learning_signals" (
    "user_id" "uuid" NOT NULL,
    "topic_id" "uuid" NOT NULL,
    "evidence_count" integer DEFAULT 0 NOT NULL,
    "objective_attempt_count" integer DEFAULT 0 NOT NULL,
    "flashcard_attempt_count" integer DEFAULT 0 NOT NULL,
    "accuracy_smoothed" numeric(5,4),
    "recall_score" numeric(5,4),
    "weakness_score" numeric(5,4),
    "evidence_level" "text" DEFAULT 'low'::"text" NOT NULL,
    "score_version" "text" DEFAULT 'v1'::"text" NOT NULL,
    "last_practiced_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "topic_learning_signals_accuracy_smoothed_check" CHECK ((("accuracy_smoothed" >= (0)::numeric) AND ("accuracy_smoothed" <= (1)::numeric))),
    CONSTRAINT "topic_learning_signals_evidence_count_check" CHECK (("evidence_count" >= 0)),
    CONSTRAINT "topic_learning_signals_evidence_level_check" CHECK (("evidence_level" = ANY (ARRAY['low'::"text", 'observing'::"text", 'needs_reinforcement'::"text", 'consolidating'::"text"]))),
    CONSTRAINT "topic_learning_signals_flashcard_attempt_count_check" CHECK (("flashcard_attempt_count" >= 0)),
    CONSTRAINT "topic_learning_signals_objective_attempt_count_check" CHECK (("objective_attempt_count" >= 0)),
    CONSTRAINT "topic_learning_signals_recall_score_check" CHECK ((("recall_score" >= (0)::numeric) AND ("recall_score" <= (1)::numeric))),
    CONSTRAINT "topic_learning_signals_weakness_score_check" CHECK ((("weakness_score" >= (0)::numeric) AND ("weakness_score" <= (1)::numeric)))
);


ALTER TABLE "public"."topic_learning_signals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topic_merges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "cycle_id" "uuid",
    "subject_merge_id" "uuid",
    "primary_topic_id" "uuid" NOT NULL,
    "merged_topic_ids" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "display_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reverted_at" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_by_ai" boolean DEFAULT false,
    "match_type" "text",
    "source_edital_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    CONSTRAINT "topic_merges_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'reverted'::"text"])))
);


ALTER TABLE "public"."topic_merges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topic_review_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "topic_id" "uuid" NOT NULL,
    "review_stage" "text" NOT NULL,
    "reviewed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "study_duration_minutes" integer,
    "difficulty_numeric" integer,
    "memory_stability_after_review" double precision,
    "interval_after_review" double precision,
    "trend_delta" double precision,
    "trend_label" "text",
    "cycle_id" "uuid",
    "edital_id" "uuid",
    "user_id" "uuid"
);


ALTER TABLE "public"."topic_review_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."topic_review_history" IS 'Histórico completo de revisões de tópicos para rastreamento e análise';



COMMENT ON COLUMN "public"."topic_review_history"."review_stage" IS 'Estágio da revisão: 24h, 7d, 15d, 30d, 60d, completed';



COMMENT ON COLUMN "public"."topic_review_history"."reviewed_at" IS 'Data e hora em que a revisão foi realizada';



COMMENT ON COLUMN "public"."topic_review_history"."study_duration_minutes" IS 'Tempo estudado (em minutos) nesta revisão específica';



COMMENT ON COLUMN "public"."topic_review_history"."difficulty_numeric" IS 'Dificuldade normalizada (1=Difícil, 2=Médio, 3=Fácil)';



COMMENT ON COLUMN "public"."topic_review_history"."memory_stability_after_review" IS 'Nova estabilidade calculada após esta revisão';



COMMENT ON COLUMN "public"."topic_review_history"."interval_after_review" IS 'Novo intervalo calculado (em dias)';



COMMENT ON COLUMN "public"."topic_review_history"."trend_delta" IS 'Variação de performance em relação às revisões anteriores';



CREATE TABLE IF NOT EXISTS "public"."topics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "review_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "next_review" timestamp with time zone,
    "review_stage" "text",
    "last_reviewed_at" timestamp with time zone,
    "first_studied_at" timestamp with time zone,
    "total_reviews" integer DEFAULT 0,
    "is_marked_for_review" boolean DEFAULT false,
    "marked_for_review_at" timestamp without time zone,
    "notes" "jsonb",
    "subtopics" "jsonb" DEFAULT '[]'::"jsonb",
    "difficulty_set_at" timestamp with time zone,
    "difficulty_level" integer,
    "last_session_duration" integer DEFAULT 0,
    "last_trend_check_at" timestamp with time zone,
    "is_skipped" boolean DEFAULT false,
    "skip_reason" "text",
    "total_volume" integer DEFAULT 0,
    "last_search_context" "text",
    "last_used_query" "text",
    "last_audit_log" "jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "position" integer,
    "memory_stability" real DEFAULT 0.0,
    "current_interval" real DEFAULT 0.0,
    "retention_score" real DEFAULT 0.0,
    "edital_id" "uuid",
    "parent_topic_id" "uuid",
    "is_hidden" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "merged_with_ia" boolean DEFAULT false,
    "incidence_catalog_id" "uuid",
    "incidence_source" "text",
    "incidence_applied_at" timestamp with time zone,
    "incidence_context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "incidence_score" smallint,
    "incidence_level" "text",
    CONSTRAINT "topic_name_length" CHECK ((("char_length"("name") <= 500) AND ("char_length"("name") > 0))),
    CONSTRAINT "topics_difficulty_level_check" CHECK ((("difficulty_level" >= 1) AND ("difficulty_level" <= 5))),
    CONSTRAINT "topics_incidence_level_check" CHECK (("incidence_level" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"]))),
    CONSTRAINT "topics_incidence_score_check" CHECK ((("incidence_score" >= 1) AND ("incidence_score" <= 5))),
    CONSTRAINT "topics_incidence_source_check" CHECK (("incidence_source" = ANY (ARRAY['ai'::"text", 'catalog'::"text", 'manual'::"text"])))
);

ALTER TABLE ONLY "public"."topics" REPLICA IDENTITY FULL;


ALTER TABLE "public"."topics" OWNER TO "postgres";


COMMENT ON COLUMN "public"."topics"."difficulty_set_at" IS 'Data e hora quando a dificuldade foi definida pelo usuário';



COMMENT ON COLUMN "public"."topics"."difficulty_level" IS 'Nível de dificuldade do tópico (1=Muito Fácil, 2=Fácil, 3=Médio, 4=Difícil, 5=Muito Difícil)';



COMMENT ON COLUMN "public"."topics"."last_session_duration" IS 'Duração da última sessão de estudo (em minutos), usado para popular o histórico';



COMMENT ON COLUMN "public"."topics"."last_trend_check_at" IS 'Timestamp da última vez que o tópico foi processado pela automação GUT. Usado para priorizar tópicos pendentes.';



COMMENT ON COLUMN "public"."topics"."is_skipped" IS 'Flag indicando se o tópico foi pulado/rejeitado pela IA de validação';



COMMENT ON COLUMN "public"."topics"."skip_reason" IS 'Motivo pelo qual o tópico foi rejeitado (ex: dados inválidos, teste, etc)';



COMMENT ON COLUMN "public"."topics"."parent_topic_id" IS 'ID do tópico principal ao qual este tópico foi unificado';



COMMENT ON COLUMN "public"."topics"."is_hidden" IS 'Indica se o tópico deve ser ocultado na interface (por ser uma duplicata unificada)';



COMMENT ON COLUMN "public"."topics"."is_active" IS 'Indica se o tópico está ativo no ciclo de estudos atual';



COMMENT ON COLUMN "public"."topics"."incidence_catalog_id" IS 'Referencia ao catalogo quando o volume do topico foi preenchido por reaproveitamento.';



COMMENT ON COLUMN "public"."topics"."incidence_source" IS 'Origem do valor atual de incidencia do topico: ai, catalog ou manual.';



COMMENT ON COLUMN "public"."topics"."incidence_score" IS 'Nota normalizada de cobranca entre 1 e 5, comparada dentro da materia do edital.';



COMMENT ON COLUMN "public"."topics"."incidence_level" IS 'Faixa consultavel de cobranca: low, medium ou high.';



CREATE TABLE IF NOT EXISTS "public"."user_ai_quota_resets" (
    "user_id" "uuid" NOT NULL,
    "reset_at" timestamp with time zone NOT NULL,
    "granted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_ai_quota_resets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_cycles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "ciclo_atual" "text"[] DEFAULT '{}'::"text"[],
    "disciplinas_do_dia" "text"[] DEFAULT '{}'::"text"[],
    "ciclos_realizados" integer DEFAULT 0,
    "data_inicio_ciclo" timestamp with time zone DEFAULT "now"(),
    "data_fim_ciclo" timestamp with time zone,
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "materias_pendentes" "text"[] DEFAULT '{}'::"text"[],
    "skipped_subjects" "text"[] DEFAULT '{}'::"text"[],
    "indice_atual" integer DEFAULT 0,
    "materias_estudadas_ciclo" "text"[] DEFAULT '{}'::"text"[],
    "materias_por_dia" integer DEFAULT 2,
    "materias_estudadas_hoje" "text"[] DEFAULT '{}'::"text"[],
    "data_ultimo_reset" "date" DEFAULT CURRENT_DATE,
    "streak_dias_consecutivos" integer DEFAULT 0,
    "status" "text" DEFAULT 'active'::"text",
    "name" "text",
    "unification_map" "jsonb",
    "exam_date" "date",
    CONSTRAINT "user_cycles_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."user_cycles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_cycles"."materias_estudadas_ciclo" IS 'Array of subject IDs that have been studied in the current cycle';



COMMENT ON COLUMN "public"."user_cycles"."materias_por_dia" IS 'Meta de matérias que o usuário pretende estudar por dia';



COMMENT ON COLUMN "public"."user_cycles"."materias_estudadas_hoje" IS 'Array com IDs das matérias já estudadas no dia atual';



COMMENT ON COLUMN "public"."user_cycles"."data_ultimo_reset" IS 'Data do último reset diário (para controle automático)';



COMMENT ON COLUMN "public"."user_cycles"."streak_dias_consecutivos" IS 'Quantidade de dias consecutivos estudando';



COMMENT ON COLUMN "public"."user_cycles"."exam_date" IS 'Data da prova que rege o ciclo de estudos ativo. Em ciclos compostos por mesclagem, deve ser escolhida pelo aluno.';



CREATE OR REPLACE VIEW "public"."user_difficulty_overview" WITH ("security_invoker"='true') AS
 SELECT "s"."user_id",
    "count"("t"."id") AS "total_topics",
    "count"("t"."difficulty_level") AS "rated_topics",
    "round"("avg"(("t"."difficulty_level")::numeric), 2) AS "avg_difficulty",
    "count"(
        CASE
            WHEN ("t"."difficulty_level" = 1) THEN 1
            ELSE NULL::integer
        END) AS "very_easy_count",
    "count"(
        CASE
            WHEN ("t"."difficulty_level" = 2) THEN 1
            ELSE NULL::integer
        END) AS "easy_count",
    "count"(
        CASE
            WHEN ("t"."difficulty_level" = 3) THEN 1
            ELSE NULL::integer
        END) AS "medium_count",
    "count"(
        CASE
            WHEN ("t"."difficulty_level" = 4) THEN 1
            ELSE NULL::integer
        END) AS "hard_count",
    "count"(
        CASE
            WHEN ("t"."difficulty_level" = 5) THEN 1
            ELSE NULL::integer
        END) AS "very_hard_count",
    "count"(
        CASE
            WHEN (("t"."completed" = true) AND ("t"."difficulty_level" >= 4)) THEN 1
            ELSE NULL::integer
        END) AS "hard_topics_mastered"
   FROM ("public"."subjects" "s"
     LEFT JOIN "public"."topics" "t" ON (("s"."id" = "t"."subject_id")))
  GROUP BY "s"."user_id";


ALTER VIEW "public"."user_difficulty_overview" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_editais" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "exam_date" "date",
    "is_imported" boolean DEFAULT false NOT NULL,
    "source_id" "text",
    "subject_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "merged_with" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "merged_into_cycle" boolean DEFAULT false,
    "active_subject_ids" "text"[] DEFAULT '{}'::"text"[],
    "organ" "text",
    "position" "text",
    "year" "text",
    "last_sync_snapshot" "jsonb" DEFAULT '[]'::"jsonb",
    "category" "text",
    "exam_board" "text",
    "cycle_archived_at" timestamp with time zone,
    "ai_extraction_used" boolean DEFAULT false NOT NULL,
    CONSTRAINT "user_editais_name_check" CHECK ((("char_length"("name") > 0) AND ("char_length"("name") <= 200)))
);


ALTER TABLE "public"."user_editais" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_editais" IS 'Editais personalizados do usuário. Podem ser importados (clonados) ou criados manualmente.';



COMMENT ON COLUMN "public"."user_editais"."exam_date" IS 'Data opcional da prova/concurso para contagem regressiva de urgência.';



COMMENT ON COLUMN "public"."user_editais"."is_imported" IS 'true = clonado de edital global, false = criado manualmente.';



COMMENT ON COLUMN "public"."user_editais"."source_id" IS 'ID do edital global original (quando importado).';



COMMENT ON COLUMN "public"."user_editais"."subject_ids" IS 'Array de UUIDs de matérias vinculadas a este edital.';



COMMENT ON COLUMN "public"."user_editais"."merged_with" IS 'Array de IDs de editais mesclados neste (para desfazer mescla).';



COMMENT ON COLUMN "public"."user_editais"."category" IS 'Categoria do concurso (ex: Policial, Jurídica, Administrativa, etc.)';



COMMENT ON COLUMN "public"."user_editais"."exam_board" IS 'Banca organizadora copiada do catálogo ou informada no edital do aluno.';



COMMENT ON COLUMN "public"."user_editais"."cycle_archived_at" IS 'Momento em que o edital saiu do ciclo. Usado para pausar e deslocar a agenda de revisões na retomada.';



COMMENT ON COLUMN "public"."user_editais"."ai_extraction_used" IS 'true when the edital was created from an IA extraction and consumed an IA quota unit.';



CREATE TABLE IF NOT EXISTS "public"."user_events" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tz" "text",
    "utc_offset_minutes" integer,
    "source" "text",
    "user_agent" "text",
    "ip" "inet",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "target_user_id" "uuid",
    "actor_user_id" "uuid",
    "status" "text" DEFAULT 'SUCCESS'::"text",
    CONSTRAINT "user_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['SIGNUP'::"text", 'LOGIN'::"text", 'LOGIN_SUCCESS'::"text", 'SESSION_START'::"text", 'LOGOUT'::"text", 'PASSWORD_RESET_REQUEST'::"text", 'PASSWORD_RESET_SUCCESS'::"text", 'EMAIL_CONFIRMED'::"text", 'EMAIL_CHANGED'::"text", 'MARKETING_CONSENT_GRANTED'::"text", 'MARKETING_CONSENT_REVOKED'::"text", 'ACCOUNT_DEACTIVATED'::"text", 'ACCOUNT_REACTIVATED'::"text", 'ROLE_CHANGED'::"text", 'PROFILE_UPDATED'::"text"])))
);


ALTER TABLE "public"."user_events" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_events_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_events_id_seq" OWNED BY "public"."user_events"."id";



CREATE TABLE IF NOT EXISTS "public"."user_feedback_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "feedback_id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "impact" "text" DEFAULT 'medium'::"text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "actor_user_id" "uuid" NOT NULL,
    "actor_email" "text",
    "route_path" "text",
    "feature_area" "text",
    "context_label" "text",
    "related_error_id" "text",
    "session_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "admin_notes" "text",
    "assigned_to" "uuid",
    "assigned_at" timestamp with time zone,
    "first_response_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "response_note" "text",
    "protocol_code" "text",
    "admin_reply" "text",
    "admin_reply_at" timestamp with time zone,
    "admin_reason" "text",
    "sla_first_response_due_at" timestamp with time zone,
    "sla_resolution_due_at" timestamp with time zone,
    "sla_breached_first_response" boolean DEFAULT false,
    "sla_breached_resolution" boolean DEFAULT false,
    CONSTRAINT "user_feedback_events_description_check" CHECK ((("char_length"("description") > 0) AND ("char_length"("description") <= 5000))),
    CONSTRAINT "user_feedback_events_impact_check" CHECK (("impact" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"]))),
    CONSTRAINT "user_feedback_events_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'triaged'::"text", 'in_progress'::"text", 'resolved'::"text", 'wont_fix'::"text", 'nova'::"text", 'planejada'::"text", 'em_desenvolvimento'::"text", 'concluida'::"text", 'nao_planejada'::"text"]))),
    CONSTRAINT "user_feedback_events_title_check" CHECK ((("char_length"("title") > 0) AND ("char_length"("title") <= 500))),
    CONSTRAINT "user_feedback_events_type_check" CHECK (("type" = ANY (ARRAY['improvement'::"text", 'feature_request'::"text", 'ux_issue'::"text", 'melhoria'::"text", 'nova_funcionalidade'::"text", 'problema'::"text"])))
);

ALTER TABLE ONLY "public"."user_feedback_events" REPLICA IDENTITY FULL;


ALTER TABLE "public"."user_feedback_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_feedback_events" IS 'Canal de feedback de produto. Separado do pipeline de erros técnicos (admin_error_events).';



CREATE TABLE IF NOT EXISTS "public"."user_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb",
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "text" DEFAULT 'sistema'::"text",
    "action_url" "text",
    CONSTRAINT "user_notifications_category_check" CHECK (("category" = ANY (ARRAY['sistema'::"text", 'estudo'::"text"])))
);

ALTER TABLE ONLY "public"."user_notifications" REPLICA IDENTITY FULL;


ALTER TABLE "public"."user_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "assigned_by" "uuid"
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_roles" IS 'Tabela que armazena as roles dos usuários. Separada para evitar escalada de privilégios.';



COMMENT ON COLUMN "public"."user_roles"."assigned_at" IS 'Timestamp de quando a role foi atribuída';



COMMENT ON COLUMN "public"."user_roles"."assigned_by" IS 'ID do usuário que atribuiu esta role (auditoria)';



CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "user_id" "uuid" NOT NULL,
    "subjects_per_day" integer DEFAULT 3 NOT NULL,
    "notifications_enabled" boolean DEFAULT true NOT NULL,
    "notification_time" "text" DEFAULT '08:00'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "review_profile" "text",
    "data_prova_meta" "date"
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_settings"."data_prova_meta" IS 'Data da prova/concurso que o estudante está se preparando. Nullable pois nem todos terão edital definido.';



CREATE TABLE IF NOT EXISTS "public"."user_study_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "melhor_horario_inicio" time without time zone,
    "melhor_horario_fim" time without time zone,
    "media_sessoes_por_dia" numeric(4,2) DEFAULT 0,
    "media_duracao_sessao" integer DEFAULT 0,
    "dias_mais_produtivos" integer[] DEFAULT '{}'::integer[],
    "horarios_pico" integer[] DEFAULT '{}'::integer[],
    "streak_atual" integer DEFAULT 0,
    "maior_streak" integer DEFAULT 0,
    "total_sessoes" integer DEFAULT 0,
    "total_horas_estudadas" numeric(6,2) DEFAULT 0,
    "melhor_dia_semana" integer,
    "pior_dia_semana" integer,
    "horario_mais_produtivo" integer,
    "calculado_em" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_study_analytics" OWNER TO "postgres";


ALTER TABLE ONLY "public"."user_events" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_events_id_seq"'::"regclass");



ALTER TABLE ONLY "private"."practice_item_answers"
    ADD CONSTRAINT "practice_item_answers_pkey" PRIMARY KEY ("item_id");



ALTER TABLE ONLY "public"."active_study_timers"
    ADD CONSTRAINT "active_study_timers_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."admin_alert_events"
    ADD CONSTRAINT "admin_alert_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_error_events"
    ADD CONSTRAINT "admin_error_events_error_id_key" UNIQUE ("error_id");



ALTER TABLE ONLY "public"."admin_error_events"
    ADD CONSTRAINT "admin_error_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_error_logs"
    ADD CONSTRAINT "ai_error_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_extraction_jobs"
    ADD CONSTRAINT "ai_extraction_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_status"
    ADD CONSTRAINT "ai_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_usage"
    ADD CONSTRAINT "api_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_access_grants"
    ADD CONSTRAINT "billing_access_grants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_affiliate_conversions"
    ADD CONSTRAINT "billing_affiliate_conversions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_affiliate_payouts"
    ADD CONSTRAINT "billing_affiliate_payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_affiliates"
    ADD CONSTRAINT "billing_affiliates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_checkout_attempts"
    ADD CONSTRAINT "billing_checkout_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_checkout_attempts"
    ADD CONSTRAINT "billing_checkout_attempts_request_id_key" UNIQUE ("request_id");



ALTER TABLE ONLY "public"."billing_checkout_attempts"
    ADD CONSTRAINT "billing_checkout_attempts_stripe_checkout_session_id_key" UNIQUE ("stripe_checkout_session_id");



ALTER TABLE ONLY "public"."billing_contract_acceptances"
    ADD CONSTRAINT "billing_contract_acceptances_checkout_attempt_id_key" UNIQUE ("checkout_attempt_id");



ALTER TABLE ONLY "public"."billing_contract_acceptances"
    ADD CONSTRAINT "billing_contract_acceptances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_customers"
    ADD CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_plan_change_requests"
    ADD CONSTRAINT "billing_plan_change_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_plan_change_requests"
    ADD CONSTRAINT "billing_plan_change_requests_request_id_key" UNIQUE ("request_id");



ALTER TABLE ONLY "public"."billing_plan_change_requests"
    ADD CONSTRAINT "billing_plan_change_requests_stripe_schedule_id_key" UNIQUE ("stripe_schedule_id");



ALTER TABLE ONLY "public"."billing_refund_admin_actions"
    ADD CONSTRAINT "billing_refund_admin_actions_action_request_id_key" UNIQUE ("action_request_id");



ALTER TABLE ONLY "public"."billing_refund_admin_actions"
    ADD CONSTRAINT "billing_refund_admin_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_refund_requests"
    ADD CONSTRAINT "billing_refund_requests_billing_contract_acceptance_id_key" UNIQUE ("billing_contract_acceptance_id");



ALTER TABLE ONLY "public"."billing_refund_requests"
    ADD CONSTRAINT "billing_refund_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_refund_requests"
    ADD CONSTRAINT "billing_refund_requests_request_id_key" UNIQUE ("request_id");



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_stripe_schedule_id_key" UNIQUE ("stripe_schedule_id");



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."billing_webhook_events"
    ADD CONSTRAINT "billing_webhook_events_pkey" PRIMARY KEY ("stripe_event_id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupon_uses"
    ADD CONSTRAINT "coupon_uses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cycle_rotation_snapshots"
    ADD CONSTRAINT "cycle_rotation_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cycle_rotation_snapshots"
    ADD CONSTRAINT "cycle_rotation_snapshots_user_cycle_id_cycle_number_key" UNIQUE ("user_cycle_id", "cycle_number");



ALTER TABLE ONLY "public"."cycle_rotations"
    ADD CONSTRAINT "cycle_rotations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cycle_study_events"
    ADD CONSTRAINT "cycle_study_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cycle_study_logs"
    ADD CONSTRAINT "cycle_study_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cycle_subject_states"
    ADD CONSTRAINT "cycle_subject_states_cycle_id_subject_id_key" UNIQUE ("cycle_id", "subject_id");



ALTER TABLE ONLY "public"."cycle_subject_states"
    ADD CONSTRAINT "cycle_subject_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."edital_incidence_maps"
    ADD CONSTRAINT "edital_incidence_maps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."edital_incidence_maps"
    ADD CONSTRAINT "edital_incidence_maps_user_id_edital_id_key" UNIQUE ("user_id", "edital_id");



ALTER TABLE ONLY "public"."edital_suggestions"
    ADD CONSTRAINT "edital_suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flashcard_schedules"
    ADD CONSTRAINT "flashcard_schedules_pkey" PRIMARY KEY ("user_id", "item_id");



ALTER TABLE ONLY "public"."general_notes"
    ADD CONSTRAINT "general_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."general_notes"
    ADD CONSTRAINT "general_notes_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."general_reminders"
    ADD CONSTRAINT "general_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."incident_action_log"
    ADD CONSTRAINT "incident_action_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."legal_document_acceptances"
    ADD CONSTRAINT "legal_document_acceptances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."legal_document_acceptances"
    ADD CONSTRAINT "legal_document_acceptances_user_id_acceptance_context_terms_key" UNIQUE ("user_id", "acceptance_context", "terms_version", "privacy_version");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pending_ai_extractions"
    ADD CONSTRAINT "one_pending_per_user" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."pending_ai_extractions"
    ADD CONSTRAINT "pending_ai_extractions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pending_cycle_merges"
    ADD CONSTRAINT "pending_cycle_merges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pending_merge_suggestions"
    ADD CONSTRAINT "pending_merge_suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pending_merge_suggestions"
    ADD CONSTRAINT "pending_merge_suggestions_unique_key" UNIQUE ("user_id", "cycle_id", "suggestion_type", "original_names");



ALTER TABLE ONLY "public"."plan_configs"
    ADD CONSTRAINT "plan_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_configs"
    ADD CONSTRAINT "plan_configs_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."pomodoro_sessions"
    ADD CONSTRAINT "pomodoro_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pomodoro_sessions"
    ADD CONSTRAINT "pomodoro_sessions_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practice_attempts"
    ADD CONSTRAINT "practice_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practice_attempts"
    ADD CONSTRAINT "practice_attempts_user_id_client_attempt_id_key" UNIQUE ("user_id", "client_attempt_id");



ALTER TABLE ONLY "public"."practice_item_feedback"
    ADD CONSTRAINT "practice_item_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practice_item_feedback"
    ADD CONSTRAINT "practice_item_feedback_user_id_item_id_key" UNIQUE ("user_id", "item_id");



ALTER TABLE ONLY "public"."practice_item_reports"
    ADD CONSTRAINT "practice_item_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practice_items"
    ADD CONSTRAINT "practice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practice_packages"
    ADD CONSTRAINT "practice_packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practice_session_items"
    ADD CONSTRAINT "practice_session_items_pkey" PRIMARY KEY ("session_id", "item_id");



ALTER TABLE ONLY "public"."practice_session_items"
    ADD CONSTRAINT "practice_session_items_session_id_position_key" UNIQUE ("session_id", "position");



ALTER TABLE ONLY "public"."practice_session_items"
    ADD CONSTRAINT "practice_session_items_user_id_session_id_item_id_key" UNIQUE ("user_id", "session_id", "item_id");



ALTER TABLE ONLY "public"."practice_sessions"
    ADD CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practice_sessions"
    ADD CONSTRAINT "practice_sessions_user_id_idempotency_key_key" UNIQUE ("user_id", "idempotency_key");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."public_editais"
    ADD CONSTRAINT "public_editais_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_attempts"
    ADD CONSTRAINT "question_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."study_cycles_v2"
    ADD CONSTRAINT "study_cycles_v2_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."study_sessions"
    ADD CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subject_merges"
    ADD CONSTRAINT "subject_merges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subject_relations"
    ADD CONSTRAINT "subject_relations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topic_incidence_catalog"
    ADD CONSTRAINT "topic_incidence_catalog_context_hash_key" UNIQUE ("context_hash");



ALTER TABLE ONLY "public"."topic_incidence_catalog"
    ADD CONSTRAINT "topic_incidence_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topic_learning_signals"
    ADD CONSTRAINT "topic_learning_signals_pkey" PRIMARY KEY ("user_id", "topic_id");



ALTER TABLE ONLY "public"."topic_merges"
    ADD CONSTRAINT "topic_merges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topic_review_history"
    ADD CONSTRAINT "topic_review_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subject_merges"
    ADD CONSTRAINT "unique_active_merge" UNIQUE ("user_id", "primary_subject_id", "status");



ALTER TABLE ONLY "public"."topic_merges"
    ADD CONSTRAINT "unique_active_topic_merge" UNIQUE ("user_id", "primary_topic_id", "status");



ALTER TABLE ONLY "public"."user_ai_quota_resets"
    ADD CONSTRAINT "user_ai_quota_resets_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_cycles"
    ADD CONSTRAINT "user_cycles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_editais"
    ADD CONSTRAINT "user_editais_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_events"
    ADD CONSTRAINT "user_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_feedback_events"
    ADD CONSTRAINT "user_feedback_events_feedback_id_key" UNIQUE ("feedback_id");



ALTER TABLE ONLY "public"."user_feedback_events"
    ADD CONSTRAINT "user_feedback_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_feedback_events"
    ADD CONSTRAINT "user_feedback_events_protocol_code_unique" UNIQUE ("protocol_code");



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_study_analytics"
    ADD CONSTRAINT "user_study_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_study_analytics"
    ADD CONSTRAINT "user_study_analytics_user_id_key" UNIQUE ("user_id");



CREATE INDEX "billing_access_grants_active_idx" ON "public"."billing_access_grants" USING "btree" ("user_id", "ends_at" DESC) WHERE ("revoked_at" IS NULL);



CREATE UNIQUE INDEX "billing_access_grants_one_trial_per_user" ON "public"."billing_access_grants" USING "btree" ("user_id") WHERE ("source" = 'trial'::"text");



CREATE INDEX "billing_affiliate_conversions_affiliate_paid_idx" ON "public"."billing_affiliate_conversions" USING "btree" ("affiliate_id", "paid_at" DESC);



CREATE UNIQUE INDEX "billing_affiliate_conversions_invoice_key" ON "public"."billing_affiliate_conversions" USING "btree" ("stripe_invoice_id");



CREATE INDEX "billing_affiliate_conversions_payout_ready_idx" ON "public"."billing_affiliate_conversions" USING "btree" ("affiliate_id", "eligible_at", "paid_at") WHERE (("status" = 'pending'::"text") AND ("payout_id" IS NULL));



CREATE UNIQUE INDEX "billing_affiliate_conversions_user_key" ON "public"."billing_affiliate_conversions" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE UNIQUE INDEX "billing_affiliates_code_mode_key" ON "public"."billing_affiliates" USING "btree" ("lower"("code"), "livemode");



CREATE UNIQUE INDEX "billing_affiliates_promotion_mode_key" ON "public"."billing_affiliates" USING "btree" ("stripe_promotion_code_id", "livemode");



CREATE INDEX "billing_checkout_attempts_open_idx" ON "public"."billing_checkout_attempts" USING "btree" ("user_id", "expires_at" DESC) WHERE ("status" = ANY (ARRAY['creating'::"text", 'open'::"text"]));



CREATE INDEX "billing_contract_acceptances_deadline_idx" ON "public"."billing_contract_acceptances" USING "btree" ("withdrawal_deadline") WHERE ("contracted_at" IS NOT NULL);



CREATE UNIQUE INDEX "billing_contract_acceptances_subscription_key" ON "public"."billing_contract_acceptances" USING "btree" ("billing_subscription_id") WHERE ("billing_subscription_id" IS NOT NULL);



CREATE INDEX "billing_contract_acceptances_user_created_idx" ON "public"."billing_contract_acceptances" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "billing_customers_stripe_customer_mode_key" ON "public"."billing_customers" USING "btree" ("stripe_customer_id", "livemode");



CREATE UNIQUE INDEX "billing_customers_user_mode_key" ON "public"."billing_customers" USING "btree" ("user_id", "livemode");



CREATE INDEX "billing_customers_user_mode_updated_idx" ON "public"."billing_customers" USING "btree" ("user_id", "livemode", "updated_at" DESC);



CREATE UNIQUE INDEX "billing_plan_change_requests_one_open_subscription" ON "public"."billing_plan_change_requests" USING "btree" ("billing_subscription_id") WHERE ("status" = ANY (ARRAY['creating'::"text", 'scheduled'::"text"]));



CREATE INDEX "billing_plan_change_requests_user_created_idx" ON "public"."billing_plan_change_requests" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "billing_refund_admin_actions_active_request_key" ON "public"."billing_refund_admin_actions" USING "btree" ("billing_refund_request_id") WHERE ("status" = 'processing'::"text");



CREATE INDEX "billing_refund_admin_actions_created_idx" ON "public"."billing_refund_admin_actions" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "billing_refund_requests_invoice_mode_key" ON "public"."billing_refund_requests" USING "btree" ("livemode", "stripe_invoice_id") WHERE ("stripe_invoice_id" IS NOT NULL);



CREATE INDEX "billing_refund_requests_operational_idx" ON "public"."billing_refund_requests" USING "btree" ("status", "updated_at") WHERE ("status" = ANY (ARRAY['requested'::"text", 'processing'::"text", 'pending'::"text", 'failed'::"text", 'manual_review'::"text"]));



CREATE UNIQUE INDEX "billing_refund_requests_payment_intent_mode_key" ON "public"."billing_refund_requests" USING "btree" ("livemode", "stripe_payment_intent_id") WHERE ("stripe_payment_intent_id" IS NOT NULL);



CREATE UNIQUE INDEX "billing_refund_requests_refund_mode_key" ON "public"."billing_refund_requests" USING "btree" ("livemode", "stripe_refund_id") WHERE ("stripe_refund_id" IS NOT NULL);



CREATE INDEX "billing_refund_requests_user_created_idx" ON "public"."billing_refund_requests" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "billing_subscriptions_customer_idx" ON "public"."billing_subscriptions" USING "btree" ("billing_customer_id");



CREATE INDEX "billing_subscriptions_user_updated_idx" ON "public"."billing_subscriptions" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "billing_webhook_events_status_idx" ON "public"."billing_webhook_events" USING "btree" ("processing_status", "received_at");



CREATE INDEX "edital_incidence_maps_edital_idx" ON "public"."edital_incidence_maps" USING "btree" ("edital_id");



CREATE INDEX "edital_incidence_maps_user_status_idx" ON "public"."edital_incidence_maps" USING "btree" ("user_id", "status", "updated_at" DESC);



CREATE INDEX "flashcard_schedules_due_idx" ON "public"."flashcard_schedules" USING "btree" ("user_id", "due_at");



CREATE INDEX "idx_action_log_created" ON "public"."incident_action_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_action_log_incident" ON "public"."incident_action_log" USING "btree" ("incident_id", "incident_type");



CREATE INDEX "idx_action_log_role" ON "public"."incident_action_log" USING "btree" ("actor_role");



CREATE INDEX "idx_admin_error_events_actor_user_id" ON "public"."admin_error_events" USING "btree" ("actor_user_id");



CREATE INDEX "idx_admin_error_events_created_at" ON "public"."admin_error_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_admin_error_events_environment" ON "public"."admin_error_events" USING "btree" ("environment");



CREATE INDEX "idx_admin_error_events_error_id" ON "public"."admin_error_events" USING "btree" ("error_id");



CREATE INDEX "idx_admin_error_events_fingerprint" ON "public"."admin_error_events" USING "btree" ("fingerprint");



CREATE INDEX "idx_admin_error_events_module" ON "public"."admin_error_events" USING "btree" ("module");



CREATE INDEX "idx_admin_error_events_scope" ON "public"."admin_error_events" USING "btree" ("scope");



CREATE INDEX "idx_admin_error_events_severity" ON "public"."admin_error_events" USING "btree" ("severity");



CREATE INDEX "idx_admin_error_events_status" ON "public"."admin_error_events" USING "btree" ("status");



CREATE INDEX "idx_admin_errors_created_at" ON "public"."admin_error_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_admin_errors_module" ON "public"."admin_error_events" USING "btree" ("module");



CREATE INDEX "idx_admin_errors_severity" ON "public"."admin_error_events" USING "btree" ("severity");



CREATE INDEX "idx_admin_errors_status" ON "public"."admin_error_events" USING "btree" ("status");



CREATE INDEX "idx_ai_extraction_jobs_status" ON "public"."ai_extraction_jobs" USING "btree" ("status", "updated_at" DESC);



CREATE INDEX "idx_ai_extraction_jobs_user_created" ON "public"."ai_extraction_jobs" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "idx_api_usage_unique_window" ON "public"."api_usage" USING "btree" ("user_id", "endpoint", "window_start");



CREATE INDEX "idx_api_usage_user_endpoint_window" ON "public"."api_usage" USING "btree" ("user_id", "endpoint", "window_start");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_table_name" ON "public"."audit_logs" USING "btree" ("table_name");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_comments_author_id" ON "public"."comments" USING "btree" ("author_id");



CREATE INDEX "idx_comments_parent_id" ON "public"."comments" USING "btree" ("parent_id");



CREATE INDEX "idx_comments_post_id" ON "public"."comments" USING "btree" ("post_id");



CREATE INDEX "idx_comments_status" ON "public"."comments" USING "btree" ("status");



CREATE INDEX "idx_cycle_rotation_snapshots_user_cycle" ON "public"."cycle_rotation_snapshots" USING "btree" ("user_id", "user_cycle_id", "cycle_number" DESC);



CREATE INDEX "idx_cycle_study_events_cycle_created" ON "public"."cycle_study_events" USING "btree" ("user_cycle_id", "created_at" DESC);



CREATE INDEX "idx_cycle_study_events_subject_created" ON "public"."cycle_study_events" USING "btree" ("subject_id", "created_at" DESC);



CREATE INDEX "idx_cycle_study_events_topic_created" ON "public"."cycle_study_events" USING "btree" ("topic_id", "created_at" DESC);



CREATE INDEX "idx_cycle_study_events_user_created" ON "public"."cycle_study_events" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_error_assigned_to" ON "public"."admin_error_events" USING "btree" ("assigned_to") WHERE ("assigned_to" IS NOT NULL);



CREATE INDEX "idx_feedback_actor" ON "public"."user_feedback_events" USING "btree" ("actor_user_id");



CREATE INDEX "idx_feedback_actor_user" ON "public"."user_feedback_events" USING "btree" ("actor_user_id");



CREATE INDEX "idx_feedback_assigned_to" ON "public"."user_feedback_events" USING "btree" ("assigned_to") WHERE ("assigned_to" IS NOT NULL);



CREATE INDEX "idx_feedback_created_at" ON "public"."user_feedback_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_feedback_error_link" ON "public"."user_feedback_events" USING "btree" ("related_error_id") WHERE ("related_error_id" IS NOT NULL);



CREATE INDEX "idx_feedback_protocol" ON "public"."user_feedback_events" USING "btree" ("protocol_code");



CREATE INDEX "idx_feedback_status" ON "public"."user_feedback_events" USING "btree" ("status");



CREATE INDEX "idx_feedback_type" ON "public"."user_feedback_events" USING "btree" ("type");



CREATE INDEX "idx_general_notes_user_id" ON "public"."general_notes" USING "btree" ("user_id");



CREATE INDEX "idx_general_reminders_completed" ON "public"."general_reminders" USING "btree" ("completed");



CREATE INDEX "idx_general_reminders_date" ON "public"."general_reminders" USING "btree" ("reminder_date");



CREATE INDEX "idx_general_reminders_user_id" ON "public"."general_reminders" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_expires_at" ON "public"."notifications" USING "btree" ("expires_at");



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("read");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_read" ON "public"."user_notifications" USING "btree" ("user_id", "read");



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "read") WHERE ("read" = false);



COMMENT ON INDEX "public"."idx_notifications_user_unread" IS 'Otimiza queries de notificações não lidas';



CREATE INDEX "idx_org_members_org_id" ON "public"."organization_members" USING "btree" ("organization_id");



CREATE INDEX "idx_org_members_user_id" ON "public"."organization_members" USING "btree" ("user_id");



CREATE INDEX "idx_organizations_owner_id" ON "public"."organizations" USING "btree" ("owner_id");



CREATE INDEX "idx_organizations_slug" ON "public"."organizations" USING "btree" ("slug");



CREATE INDEX "idx_pending_merge_cycle" ON "public"."pending_merge_suggestions" USING "btree" ("cycle_id");



CREATE INDEX "idx_pending_merge_status" ON "public"."pending_merge_suggestions" USING "btree" ("status");



CREATE INDEX "idx_pending_merge_user" ON "public"."pending_merge_suggestions" USING "btree" ("user_id");



CREATE INDEX "idx_pomodoro_sessions_date" ON "public"."pomodoro_sessions" USING "btree" ("date");



CREATE INDEX "idx_pomodoro_sessions_user_date" ON "public"."pomodoro_sessions" USING "btree" ("user_id", "date");



CREATE INDEX "idx_pomodoro_sessions_user_id" ON "public"."pomodoro_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_posts_author_id" ON "public"."posts" USING "btree" ("author_id");



CREATE INDEX "idx_posts_published_at" ON "public"."posts" USING "btree" ("published_at" DESC);



CREATE INDEX "idx_posts_status" ON "public"."posts" USING "btree" ("status");



CREATE INDEX "idx_posts_tags" ON "public"."posts" USING "gin" ("tags");



CREATE INDEX "idx_posts_visibility" ON "public"."posts" USING "btree" ("visibility");



CREATE INDEX "idx_profiles_deleted_at" ON "public"."profiles" USING "btree" ("deleted_at");



CREATE INDEX "idx_profiles_display_name" ON "public"."profiles" USING "btree" ("display_name");



CREATE INDEX "idx_profiles_is_public" ON "public"."profiles" USING "btree" ("is_public");



CREATE INDEX "idx_profiles_name" ON "public"."profiles" USING "btree" ("name");



CREATE INDEX "idx_public_editais_created_by" ON "public"."public_editais" USING "btree" ("created_by");



CREATE INDEX "idx_question_attempts_attempted_at" ON "public"."question_attempts" USING "btree" ("attempted_at");



CREATE INDEX "idx_question_attempts_subject_topic" ON "public"."question_attempts" USING "btree" ("subject", "topic");



CREATE INDEX "idx_question_attempts_user_id" ON "public"."question_attempts" USING "btree" ("user_id");



CREATE INDEX "idx_study_sessions_cycle_id" ON "public"."study_sessions" USING "btree" ("cycle_id") WHERE ("cycle_id" IS NOT NULL);



CREATE INDEX "idx_study_sessions_edital_id" ON "public"."study_sessions" USING "btree" ("edital_id") WHERE ("edital_id" IS NOT NULL);



CREATE INDEX "idx_study_sessions_subject_id" ON "public"."study_sessions" USING "btree" ("subject_id");



COMMENT ON INDEX "public"."idx_study_sessions_subject_id" IS 'Otimiza queries de sessões de estudo filtradas por matéria';



CREATE INDEX "idx_study_sessions_user_created" ON "public"."study_sessions" USING "btree" ("user_id", "created_at" DESC);



COMMENT ON INDEX "public"."idx_study_sessions_user_created" IS 'Otimiza analytics de sessões de estudo';



CREATE INDEX "idx_study_sessions_user_date" ON "public"."study_sessions" USING "btree" ("user_id", "study_date" DESC);



CREATE INDEX "idx_study_sessions_user_hour" ON "public"."study_sessions" USING "btree" ("user_id", "hour_of_day");



CREATE INDEX "idx_study_sessions_user_subject" ON "public"."study_sessions" USING "btree" ("user_id", "subject_id");



CREATE INDEX "idx_subject_merges_primary" ON "public"."subject_merges" USING "btree" ("primary_subject_id");



CREATE INDEX "idx_subject_merges_user_status" ON "public"."subject_merges" USING "btree" ("user_id", "status");



CREATE INDEX "idx_subjects_edital_id" ON "public"."subjects" USING "btree" ("edital_id");



CREATE INDEX "idx_subjects_status" ON "public"."subjects" USING "btree" ("status", "user_id");



CREATE INDEX "idx_subjects_user_id" ON "public"."subjects" USING "btree" ("user_id");



COMMENT ON INDEX "public"."idx_subjects_user_id" IS 'Otimiza listagem de matérias por usuário';



CREATE INDEX "idx_subjects_user_id_id" ON "public"."subjects" USING "btree" ("user_id", "id");



CREATE INDEX "idx_system_settings_key" ON "public"."system_settings" USING "btree" ("key");



CREATE INDEX "idx_system_settings_updated_by" ON "public"."system_settings" USING "btree" ("updated_by");



CREATE INDEX "idx_system_settings_visible" ON "public"."system_settings" USING "btree" ("visible_to_users");



CREATE INDEX "idx_topic_merges_primary" ON "public"."topic_merges" USING "btree" ("primary_topic_id");



CREATE INDEX "idx_topic_merges_subject" ON "public"."topic_merges" USING "btree" ("subject_merge_id");



CREATE INDEX "idx_topic_merges_user_status" ON "public"."topic_merges" USING "btree" ("user_id", "status");



CREATE INDEX "idx_topic_review_history_reviewed_at" ON "public"."topic_review_history" USING "btree" ("reviewed_at" DESC);



CREATE INDEX "idx_topic_review_history_topic_id" ON "public"."topic_review_history" USING "btree" ("topic_id");



CREATE INDEX "idx_topic_review_history_topic_reviewed" ON "public"."topic_review_history" USING "btree" ("topic_id", "reviewed_at" DESC);



CREATE INDEX "idx_topic_review_history_topic_stage" ON "public"."topic_review_history" USING "btree" ("topic_id", "review_stage");



CREATE INDEX "idx_topic_review_history_user_id" ON "public"."topic_review_history" USING "btree" ("user_id");



CREATE INDEX "idx_topics_completed_difficulty" ON "public"."topics" USING "btree" ("completed", "difficulty_level") WHERE ("completed" = true);



CREATE INDEX "idx_topics_difficulty" ON "public"."topics" USING "btree" ("difficulty_level") WHERE ("difficulty_level" IS NOT NULL);



COMMENT ON INDEX "public"."idx_topics_difficulty" IS 'Índice para queries filtradas por nível de dificuldade (duplicata removida)';



CREATE INDEX "idx_topics_edital_id" ON "public"."topics" USING "btree" ("edital_id");



CREATE INDEX "idx_topics_is_active" ON "public"."topics" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_topics_is_skipped" ON "public"."topics" USING "btree" ("is_skipped") WHERE ("is_skipped" = false);



CREATE INDEX "idx_topics_last_trend_check" ON "public"."topics" USING "btree" ("last_trend_check_at") WHERE ("last_trend_check_at" IS NOT NULL);



CREATE INDEX "idx_topics_next_review" ON "public"."topics" USING "btree" ("next_review") WHERE ("next_review" IS NOT NULL);



COMMENT ON INDEX "public"."idx_topics_next_review" IS 'Otimiza queries de revisões pendentes';



CREATE INDEX "idx_topics_next_review_difficulty" ON "public"."topics" USING "btree" ("next_review", "difficulty_level") WHERE ("next_review" IS NOT NULL);



CREATE INDEX "idx_topics_notes" ON "public"."topics" USING "gin" ("notes");



CREATE INDEX "idx_topics_parent_id" ON "public"."topics" USING "btree" ("parent_topic_id");



CREATE INDEX "idx_topics_subject_id_created" ON "public"."topics" USING "btree" ("subject_id", "created_at" DESC);



COMMENT ON INDEX "public"."idx_topics_subject_id_created" IS 'Otimiza queries de tópicos por matéria ordenados por data';



CREATE INDEX "idx_topics_subject_id_id" ON "public"."topics" USING "btree" ("subject_id", "id");



CREATE INDEX "idx_topics_user_difficulty" ON "public"."topics" USING "btree" ("subject_id", "difficulty_level") WHERE ("difficulty_level" IS NOT NULL);



CREATE INDEX "idx_user_editais_user_id" ON "public"."user_editais" USING "btree" ("user_id");



CREATE INDEX "idx_user_events_actor_event_created" ON "public"."user_events" USING "btree" ("actor_user_id", "event_type", "occurred_at" DESC);



CREATE INDEX "idx_user_events_event_created" ON "public"."user_events" USING "btree" ("event_type", "occurred_at" DESC);



CREATE UNIQUE INDEX "idx_user_events_login_request_id" ON "public"."user_events" USING "btree" ((("metadata" ->> 'request_id'::"text"))) WHERE ("event_type" = 'LOGIN_SUCCESS'::"text");



CREATE INDEX "idx_user_events_metadata_request_id" ON "public"."user_events" USING "btree" ((("metadata" ->> 'request_id'::"text")));



CREATE INDEX "idx_user_events_request_id" ON "public"."user_events" USING "btree" ((("metadata" ->> 'request_id'::"text")));



CREATE UNIQUE INDEX "idx_user_events_session_dedupe_key" ON "public"."user_events" USING "btree" ((("metadata" ->> 'dedupe_key'::"text"))) WHERE ("event_type" = 'SESSION_START'::"text");



CREATE INDEX "idx_user_events_session_throttle" ON "public"."user_events" USING "btree" ("actor_user_id", "event_type", "occurred_at");



CREATE INDEX "idx_user_events_type_occurred" ON "public"."user_events" USING "btree" ("event_type", "occurred_at" DESC);



CREATE INDEX "idx_user_events_user_occurred" ON "public"."user_events" USING "btree" ("user_id", "occurred_at" DESC);



CREATE INDEX "idx_user_notifications_category" ON "public"."user_notifications" USING "btree" ("category");



CREATE INDEX "idx_user_notifications_user_unread" ON "public"."user_notifications" USING "btree" ("user_id", "read") WHERE ("read" = false);



CREATE INDEX "idx_user_roles_assigned_at" ON "public"."user_roles" USING "btree" ("assigned_at");



CREATE INDEX "idx_user_roles_assigned_by" ON "public"."user_roles" USING "btree" ("assigned_by");



CREATE INDEX "idx_user_roles_role" ON "public"."user_roles" USING "btree" ("role");



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE INDEX "idx_user_settings_user_id" ON "public"."user_settings" USING "btree" ("user_id");



CREATE INDEX "idx_user_study_analytics_calculado_em" ON "public"."user_study_analytics" USING "btree" ("calculado_em" DESC);



CREATE INDEX "idx_user_study_analytics_user_id" ON "public"."user_study_analytics" USING "btree" ("user_id");



CREATE INDEX "legal_document_acceptances_user_created_idx" ON "public"."legal_document_acceptances" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "practice_attempts_user_topic_created_idx" ON "public"."practice_attempts" USING "btree" ("user_id", "topic_id", "created_at" DESC) WHERE ("invalidated_at" IS NULL);



CREATE INDEX "practice_item_feedback_hidden_idx" ON "public"."practice_item_feedback" USING "btree" ("user_id", "item_id") WHERE ("rating" = '-1'::integer);



CREATE UNIQUE INDEX "practice_item_reports_one_open_report_per_user_item" ON "public"."practice_item_reports" USING "btree" ("user_id", "item_id") WHERE ("status" = 'open'::"public"."practice_report_status");



CREATE INDEX "practice_items_package_ready_idx" ON "public"."practice_items" USING "btree" ("package_id", "created_at") WHERE ("status" = 'private_ready'::"public"."practice_item_status");



CREATE INDEX "practice_packages_user_topic_ready_idx" ON "public"."practice_packages" USING "btree" ("user_id", "topic_id", "created_at" DESC) WHERE ("status" = 'ready'::"public"."practice_package_status");



CREATE INDEX "practice_session_items_user_session_position_idx" ON "public"."practice_session_items" USING "btree" ("user_id", "session_id", "position");



CREATE INDEX "topic_incidence_catalog_context_idx" ON "public"."topic_incidence_catalog" USING "btree" ("subject_key", "exam_board_key", "career_key", "organization_key");



CREATE INDEX "topic_incidence_catalog_topic_subject_idx" ON "public"."topic_incidence_catalog" USING "btree" ("topic_key", "subject_key");



CREATE INDEX "topics_incidence_level_idx" ON "public"."topics" USING "btree" ("incidence_level") WHERE (("incidence_level" IS NOT NULL) AND ("is_active" IS DISTINCT FROM false));



CREATE UNIQUE INDEX "user_cycles_user_id_idx" ON "public"."user_cycles" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "practice_item_answers_set_updated_at" BEFORE UPDATE ON "private"."practice_item_answers" FOR EACH ROW EXECUTE FUNCTION "private"."set_practice_updated_at"();



CREATE OR REPLACE TRIGGER "audit_organization_members_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger_function"();



CREATE OR REPLACE TRIGGER "audit_organizations_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger_function"();



CREATE OR REPLACE TRIGGER "audit_system_settings_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."system_settings" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger_function"();



CREATE OR REPLACE TRIGGER "audit_user_roles_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."audit_user_roles_function"();



CREATE OR REPLACE TRIGGER "billing_affiliate_conversions_set_updated_at" BEFORE UPDATE ON "public"."billing_affiliate_conversions" FOR EACH ROW EXECUTE FUNCTION "private"."set_billing_updated_at"();



CREATE OR REPLACE TRIGGER "billing_affiliates_set_updated_at" BEFORE UPDATE ON "public"."billing_affiliates" FOR EACH ROW EXECUTE FUNCTION "private"."set_billing_updated_at"();



CREATE OR REPLACE TRIGGER "billing_checkout_attempts_set_updated_at" BEFORE UPDATE ON "public"."billing_checkout_attempts" FOR EACH ROW EXECUTE FUNCTION "private"."set_billing_updated_at"();



CREATE OR REPLACE TRIGGER "billing_contract_acceptances_set_updated_at" BEFORE UPDATE ON "public"."billing_contract_acceptances" FOR EACH ROW EXECUTE FUNCTION "private"."set_billing_updated_at"();



CREATE OR REPLACE TRIGGER "billing_customers_set_updated_at" BEFORE UPDATE ON "public"."billing_customers" FOR EACH ROW EXECUTE FUNCTION "private"."set_billing_updated_at"();



CREATE OR REPLACE TRIGGER "billing_plan_change_requests_set_updated_at" BEFORE UPDATE ON "public"."billing_plan_change_requests" FOR EACH ROW EXECUTE FUNCTION "private"."set_billing_updated_at"();



CREATE OR REPLACE TRIGGER "billing_refund_requests_set_updated_at" BEFORE UPDATE ON "public"."billing_refund_requests" FOR EACH ROW EXECUTE FUNCTION "private"."set_billing_updated_at"();



CREATE OR REPLACE TRIGGER "billing_subscriptions_set_updated_at" BEFORE UPDATE ON "public"."billing_subscriptions" FOR EACH ROW EXECUTE FUNCTION "private"."set_billing_updated_at"();



CREATE OR REPLACE TRIGGER "on_user_event_insert" AFTER INSERT ON "public"."user_events" FOR EACH ROW EXECUTE FUNCTION "public"."sync_last_access"();



CREATE OR REPLACE TRIGGER "pending_ai_extractions_updated_at" BEFORE UPDATE ON "public"."pending_ai_extractions" FOR EACH ROW EXECUTE FUNCTION "public"."update_pending_timestamp"();



CREATE OR REPLACE TRIGGER "practice_feedback_set_updated_at" BEFORE UPDATE ON "public"."practice_item_feedback" FOR EACH ROW EXECUTE FUNCTION "private"."set_practice_updated_at"();



CREATE OR REPLACE TRIGGER "practice_items_set_updated_at" BEFORE UPDATE ON "public"."practice_items" FOR EACH ROW EXECUTE FUNCTION "private"."set_practice_updated_at"();



CREATE OR REPLACE TRIGGER "practice_packages_set_updated_at" BEFORE UPDATE ON "public"."practice_packages" FOR EACH ROW EXECUTE FUNCTION "private"."set_practice_updated_at"();



CREATE OR REPLACE TRIGGER "practice_reports_set_updated_at" BEFORE UPDATE ON "public"."practice_item_reports" FOR EACH ROW EXECUTE FUNCTION "private"."set_practice_updated_at"();



CREATE OR REPLACE TRIGGER "practice_sessions_set_updated_at" BEFORE UPDATE ON "public"."practice_sessions" FOR EACH ROW EXECUTE FUNCTION "private"."set_practice_updated_at"();



CREATE OR REPLACE TRIGGER "sync_general_reminder_completed_at" BEFORE INSERT OR UPDATE OF "completed" ON "public"."general_reminders" FOR EACH ROW EXECUTE FUNCTION "public"."sync_general_reminder_completed_at"();



CREATE OR REPLACE TRIGGER "trg_active_study_timers_updated_at" BEFORE UPDATE ON "public"."active_study_timers" FOR EACH ROW EXECUTE FUNCTION "public"."set_active_study_timer_updated_at"();



CREATE OR REPLACE TRIGGER "trg_ensure_topic_visibility" BEFORE UPDATE ON "public"."topics" FOR EACH ROW EXECUTE FUNCTION "public"."handle_topic_orphan_recovery"();



CREATE OR REPLACE TRIGGER "trg_feedback_protocol" BEFORE INSERT ON "public"."user_feedback_events" FOR EACH ROW WHEN (("new"."protocol_code" IS NULL)) EXECUTE FUNCTION "public"."generate_feedback_protocol"();



CREATE OR REPLACE TRIGGER "trg_notify_feedback_response" AFTER UPDATE ON "public"."user_feedback_events" FOR EACH ROW EXECUTE FUNCTION "public"."notify_user_on_feedback_response"();



CREATE OR REPLACE TRIGGER "trigger_auto_assign_user_role" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."auto_assign_user_role"();



COMMENT ON TRIGGER "trigger_auto_assign_user_role" ON "public"."profiles" IS 'Trigger que atribui role "user" automaticamente para novos usuários';



CREATE OR REPLACE TRIGGER "trigger_cleanup_merges_on_edital" AFTER DELETE ON "public"."user_editais" FOR EACH ROW EXECUTE FUNCTION "public"."cleanup_merges_on_edital_delete"();



CREATE OR REPLACE TRIGGER "trigger_cleanup_subject_merges" AFTER DELETE ON "public"."subjects" FOR EACH ROW EXECUTE FUNCTION "public"."cleanup_subject_merges_on_delete"();



CREATE OR REPLACE TRIGGER "trigger_sync_merges_on_cycle" AFTER UPDATE ON "public"."user_cycles" FOR EACH ROW WHEN (("old"."ciclo_atual" IS DISTINCT FROM "new"."ciclo_atual")) EXECUTE FUNCTION "public"."sync_merges_on_cycle_update"();



CREATE OR REPLACE TRIGGER "trigger_update_admin_error_events_updated_at" BEFORE UPDATE ON "public"."admin_error_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_admin_error_events_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_difficulty_timestamp" BEFORE UPDATE ON "public"."topics" FOR EACH ROW EXECUTE FUNCTION "public"."update_difficulty_timestamp"();



CREATE OR REPLACE TRIGGER "trigger_update_pending_cycle_merges_updated_at" BEFORE UPDATE ON "public"."pending_cycle_merges" FOR EACH ROW EXECUTE FUNCTION "public"."update_pending_cycle_merges_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_pending_merge_updated_at" BEFORE UPDATE ON "public"."pending_merge_suggestions" FOR EACH ROW EXECUTE FUNCTION "public"."update_pending_merge_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_editais_updated_at" BEFORE UPDATE ON "public"."user_editais" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_editais_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_user_study_analytics_updated_at" BEFORE UPDATE ON "public"."user_study_analytics" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_study_analytics_updated_at"();



CREATE OR REPLACE TRIGGER "update_admin_error_events_modtime" BEFORE UPDATE ON "public"."admin_error_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_admin_error_events_modtime"();



CREATE OR REPLACE TRIGGER "update_cycle_subject_states_modtime" BEFORE UPDATE ON "public"."cycle_subject_states" FOR EACH ROW EXECUTE FUNCTION "public"."update_cycle_subject_states_modtime"();



CREATE OR REPLACE TRIGGER "update_pomodoro_sessions_updated_at" BEFORE UPDATE ON "public"."pomodoro_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_study_cycles_v2_modtime" BEFORE UPDATE ON "public"."study_cycles_v2" FOR EACH ROW EXECUTE FUNCTION "public"."update_study_cycles_v2_modtime"();



CREATE OR REPLACE TRIGGER "update_subjects_updated_at" BEFORE UPDATE ON "public"."subjects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_topics_updated_at" BEFORE UPDATE ON "public"."topics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_cycles_atualizado_em" BEFORE UPDATE ON "public"."user_cycles" FOR EACH ROW EXECUTE FUNCTION "public"."update_atualizado_em_column"();



CREATE OR REPLACE TRIGGER "update_user_settings_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "private"."practice_item_answers"
    ADD CONSTRAINT "practice_item_answers_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."practice_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."active_study_timers"
    ADD CONSTRAINT "active_study_timers_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."active_study_timers"
    ADD CONSTRAINT "active_study_timers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_alert_events"
    ADD CONSTRAINT "admin_alert_events_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."admin_error_events"
    ADD CONSTRAINT "admin_error_events_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ai_extraction_jobs"
    ADD CONSTRAINT "ai_extraction_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_usage"
    ADD CONSTRAINT "api_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."billing_access_grants"
    ADD CONSTRAINT "billing_access_grants_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_access_grants"
    ADD CONSTRAINT "billing_access_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_affiliate_conversions"
    ADD CONSTRAINT "billing_affiliate_conversions_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "public"."billing_affiliates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_affiliate_conversions"
    ADD CONSTRAINT "billing_affiliate_conversions_billing_subscription_id_fkey" FOREIGN KEY ("billing_subscription_id") REFERENCES "public"."billing_subscriptions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_affiliate_conversions"
    ADD CONSTRAINT "billing_affiliate_conversions_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "public"."billing_affiliate_payouts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_affiliate_conversions"
    ADD CONSTRAINT "billing_affiliate_conversions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_affiliate_payouts"
    ADD CONSTRAINT "billing_affiliate_payouts_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "public"."billing_affiliates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_affiliate_payouts"
    ADD CONSTRAINT "billing_affiliate_payouts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_affiliates"
    ADD CONSTRAINT "billing_affiliates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_checkout_attempts"
    ADD CONSTRAINT "billing_checkout_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_contract_acceptances"
    ADD CONSTRAINT "billing_contract_acceptances_billing_subscription_id_fkey" FOREIGN KEY ("billing_subscription_id") REFERENCES "public"."billing_subscriptions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_contract_acceptances"
    ADD CONSTRAINT "billing_contract_acceptances_checkout_attempt_id_fkey" FOREIGN KEY ("checkout_attempt_id") REFERENCES "public"."billing_checkout_attempts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_contract_acceptances"
    ADD CONSTRAINT "billing_contract_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_customers"
    ADD CONSTRAINT "billing_customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_plan_change_requests"
    ADD CONSTRAINT "billing_plan_change_requests_billing_subscription_id_fkey" FOREIGN KEY ("billing_subscription_id") REFERENCES "public"."billing_subscriptions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_plan_change_requests"
    ADD CONSTRAINT "billing_plan_change_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_refund_admin_actions"
    ADD CONSTRAINT "billing_refund_admin_actions_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_refund_admin_actions"
    ADD CONSTRAINT "billing_refund_admin_actions_billing_refund_request_id_fkey" FOREIGN KEY ("billing_refund_request_id") REFERENCES "public"."billing_refund_requests"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_refund_requests"
    ADD CONSTRAINT "billing_refund_requests_billing_contract_acceptance_id_fkey" FOREIGN KEY ("billing_contract_acceptance_id") REFERENCES "public"."billing_contract_acceptances"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_refund_requests"
    ADD CONSTRAINT "billing_refund_requests_billing_subscription_id_fkey" FOREIGN KEY ("billing_subscription_id") REFERENCES "public"."billing_subscriptions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_refund_requests"
    ADD CONSTRAINT "billing_refund_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_billing_customer_id_fkey" FOREIGN KEY ("billing_customer_id") REFERENCES "public"."billing_customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_uses"
    ADD CONSTRAINT "coupon_uses_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_uses"
    ADD CONSTRAINT "coupon_uses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cycle_rotation_snapshots"
    ADD CONSTRAINT "cycle_rotation_snapshots_user_cycle_id_fkey" FOREIGN KEY ("user_cycle_id") REFERENCES "public"."user_cycles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cycle_rotation_snapshots"
    ADD CONSTRAINT "cycle_rotation_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cycle_rotations"
    ADD CONSTRAINT "cycle_rotations_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."study_cycles_v2"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cycle_study_events"
    ADD CONSTRAINT "cycle_study_events_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cycle_study_events"
    ADD CONSTRAINT "cycle_study_events_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cycle_study_events"
    ADD CONSTRAINT "cycle_study_events_user_cycle_id_fkey" FOREIGN KEY ("user_cycle_id") REFERENCES "public"."user_cycles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cycle_study_events"
    ADD CONSTRAINT "cycle_study_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cycle_study_logs"
    ADD CONSTRAINT "cycle_study_logs_rotation_id_fkey" FOREIGN KEY ("rotation_id") REFERENCES "public"."cycle_rotations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cycle_study_logs"
    ADD CONSTRAINT "cycle_study_logs_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cycle_subject_states"
    ADD CONSTRAINT "cycle_subject_states_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."study_cycles_v2"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cycle_subject_states"
    ADD CONSTRAINT "cycle_subject_states_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."edital_incidence_maps"
    ADD CONSTRAINT "edital_incidence_maps_edital_id_fkey" FOREIGN KEY ("edital_id") REFERENCES "public"."user_editais"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."edital_incidence_maps"
    ADD CONSTRAINT "edital_incidence_maps_user_cycle_id_fkey" FOREIGN KEY ("user_cycle_id") REFERENCES "public"."user_cycles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."edital_incidence_maps"
    ADD CONSTRAINT "edital_incidence_maps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."edital_suggestions"
    ADD CONSTRAINT "edital_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flashcard_schedules"
    ADD CONSTRAINT "flashcard_schedules_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."practice_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flashcard_schedules"
    ADD CONSTRAINT "flashcard_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."incident_action_log"
    ADD CONSTRAINT "incident_action_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."legal_document_acceptances"
    ADD CONSTRAINT "legal_document_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pending_ai_extractions"
    ADD CONSTRAINT "pending_ai_extractions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pending_cycle_merges"
    ADD CONSTRAINT "pending_cycle_merges_edital_id_fkey" FOREIGN KEY ("edital_id") REFERENCES "public"."user_editais"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pending_cycle_merges"
    ADD CONSTRAINT "pending_cycle_merges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pending_merge_suggestions"
    ADD CONSTRAINT "pending_merge_suggestions_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."user_cycles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pending_merge_suggestions"
    ADD CONSTRAINT "pending_merge_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pomodoro_sessions"
    ADD CONSTRAINT "pomodoro_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."practice_attempts"
    ADD CONSTRAINT "practice_attempts_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."practice_attempts"
    ADD CONSTRAINT "practice_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practice_attempts"
    ADD CONSTRAINT "practice_attempts_user_id_session_id_item_id_fkey" FOREIGN KEY ("user_id", "session_id", "item_id") REFERENCES "public"."practice_session_items"("user_id", "session_id", "item_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."practice_item_feedback"
    ADD CONSTRAINT "practice_item_feedback_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."practice_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practice_item_feedback"
    ADD CONSTRAINT "practice_item_feedback_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."practice_item_feedback"
    ADD CONSTRAINT "practice_item_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practice_item_reports"
    ADD CONSTRAINT "practice_item_reports_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."practice_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practice_item_reports"
    ADD CONSTRAINT "practice_item_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practice_items"
    ADD CONSTRAINT "practice_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."practice_packages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practice_packages"
    ADD CONSTRAINT "practice_packages_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practice_packages"
    ADD CONSTRAINT "practice_packages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practice_session_items"
    ADD CONSTRAINT "practice_session_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."practice_items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."practice_session_items"
    ADD CONSTRAINT "practice_session_items_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practice_session_items"
    ADD CONSTRAINT "practice_session_items_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."practice_session_items"
    ADD CONSTRAINT "practice_session_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practice_sessions"
    ADD CONSTRAINT "practice_sessions_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."user_cycles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."practice_sessions"
    ADD CONSTRAINT "practice_sessions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."practice_sessions"
    ADD CONSTRAINT "practice_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."public_editais"
    ADD CONSTRAINT "public_editais_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."question_attempts"
    ADD CONSTRAINT "question_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."study_sessions"
    ADD CONSTRAINT "study_sessions_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."user_cycles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."study_sessions"
    ADD CONSTRAINT "study_sessions_edital_id_fkey" FOREIGN KEY ("edital_id") REFERENCES "public"."user_editais"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."study_sessions"
    ADD CONSTRAINT "study_sessions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."study_sessions"
    ADD CONSTRAINT "study_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subject_merges"
    ADD CONSTRAINT "subject_merges_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."user_cycles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subject_merges"
    ADD CONSTRAINT "subject_merges_primary_subject_id_fkey" FOREIGN KEY ("primary_subject_id") REFERENCES "public"."subjects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subject_merges"
    ADD CONSTRAINT "subject_merges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_edital_id_fkey" FOREIGN KEY ("edital_id") REFERENCES "public"."user_editais"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."topic_incidence_catalog"
    ADD CONSTRAINT "topic_incidence_catalog_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."topic_learning_signals"
    ADD CONSTRAINT "topic_learning_signals_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_learning_signals"
    ADD CONSTRAINT "topic_learning_signals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_merges"
    ADD CONSTRAINT "topic_merges_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."user_cycles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_merges"
    ADD CONSTRAINT "topic_merges_primary_topic_id_fkey" FOREIGN KEY ("primary_topic_id") REFERENCES "public"."topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_merges"
    ADD CONSTRAINT "topic_merges_subject_merge_id_fkey" FOREIGN KEY ("subject_merge_id") REFERENCES "public"."subject_merges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_merges"
    ADD CONSTRAINT "topic_merges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_review_history"
    ADD CONSTRAINT "topic_review_history_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."user_cycles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."topic_review_history"
    ADD CONSTRAINT "topic_review_history_edital_id_fkey" FOREIGN KEY ("edital_id") REFERENCES "public"."user_editais"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."topic_review_history"
    ADD CONSTRAINT "topic_review_history_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_review_history"
    ADD CONSTRAINT "topic_review_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_edital_id_fkey" FOREIGN KEY ("edital_id") REFERENCES "public"."user_editais"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_incidence_catalog_id_fkey" FOREIGN KEY ("incidence_catalog_id") REFERENCES "public"."topic_incidence_catalog"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_parent_topic_id_fkey" FOREIGN KEY ("parent_topic_id") REFERENCES "public"."topics"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_ai_quota_resets"
    ADD CONSTRAINT "user_ai_quota_resets_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_ai_quota_resets"
    ADD CONSTRAINT "user_ai_quota_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_cycles"
    ADD CONSTRAINT "user_cycles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_editais"
    ADD CONSTRAINT "user_editais_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_events"
    ADD CONSTRAINT "user_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_feedback_events"
    ADD CONSTRAINT "user_feedback_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_feedback_events"
    ADD CONSTRAINT "user_feedback_events_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_study_analytics"
    ADD CONSTRAINT "user_study_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "private"."practice_item_answers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Admins can insert action logs" ON "public"."incident_action_log" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."app_role", 'owner'::"public"."app_role"]))))));



CREATE POLICY "Admins can manage ai_error_logs" ON "public"."ai_error_logs" TO "authenticated" USING ("private"."has_role_or_higher"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("private"."has_role_or_higher"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage ai_status" ON "public"."ai_status" TO "authenticated" USING ("private"."has_role_or_higher"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("private"."has_role_or_higher"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage all AI usage logs" ON "public"."ai_usage_logs" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"public"."app_role", 'owner'::"public"."app_role"]))))));



CREATE POLICY "Admins can manage all coupons" ON "public"."coupons" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"public"."app_role", 'owner'::"public"."app_role"]))))));



CREATE POLICY "Admins can manage all posts" ON "public"."posts" USING ("private"."has_role_or_higher"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage coupon uses" ON "public"."coupon_uses" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"public"."app_role", 'owner'::"public"."app_role"]))))));



CREATE POLICY "Admins can update all feedback" ON "public"."user_feedback_events" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."app_role", 'owner'::"public"."app_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."app_role", 'owner'::"public"."app_role"]))))));



CREATE POLICY "Admins can update any profile" ON "public"."profiles" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."app_role", 'owner'::"public"."app_role"]))))));



CREATE POLICY "Admins can view action logs" ON "public"."incident_action_log" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."app_role", 'owner'::"public"."app_role"]))))));



CREATE POLICY "Admins can view ai_error_logs" ON "public"."ai_error_logs" FOR SELECT TO "authenticated" USING ("private"."has_role_or_higher"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view ai_status" ON "public"."ai_status" FOR SELECT TO "authenticated" USING ("private"."has_role_or_higher"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all feedback" ON "public"."user_feedback_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."app_role", 'owner'::"public"."app_role"]))))));



CREATE POLICY "Admins can view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("private"."has_role_or_higher"("auth"."uid"(), 'admin'::"public"."app_role"));



COMMENT ON POLICY "Admins can view all profiles" ON "public"."profiles" IS 'Administrators can view all profiles for user management purposes.';



CREATE POLICY "Admins can view audit logs" ON "public"."audit_logs" FOR SELECT USING (("private"."has_role"("auth"."uid"(), 'owner'::"public"."app_role") OR "private"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Anyone can view published public posts" ON "public"."posts" FOR SELECT USING ((("status" = 'published'::"text") AND ("visibility" = 'public'::"text")));



CREATE POLICY "Authenticated can view active coupons" ON "public"."coupons" FOR SELECT TO "authenticated" USING ((("active" = true) AND (("valid_until" IS NULL) OR ("valid_until" > "now"()))));



CREATE POLICY "Authenticated can view active plans" ON "public"."plan_configs" FOR SELECT USING (("active" = true));



CREATE POLICY "Authenticated users can insert alerts" ON "public"."admin_alert_events" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can insert error logs" ON "public"."admin_error_events" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can insert own topic incidence catalog rows" ON "public"."topic_incidence_catalog" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "Authenticated users can read topic incidence catalog" ON "public"."topic_incidence_catalog" FOR SELECT TO "authenticated" USING (("confidence_status" = ANY (ARRAY['auto'::"text", 'approved'::"text"])));



CREATE POLICY "Authenticated users can update own topic incidence catalog rows" ON "public"."topic_incidence_catalog" FOR UPDATE TO "authenticated" USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "Authenticated users can view public settings" ON "public"."system_settings" FOR SELECT TO "authenticated" USING (("visible_to_users" = true));



COMMENT ON POLICY "Authenticated users can view public settings" ON "public"."system_settings" IS 'Only authenticated users can view system settings marked as visible_to_users. Unauthenticated access is blocked.';



CREATE POLICY "Authors can manage own comments" ON "public"."comments" USING (("author_id" = "auth"."uid"()));



CREATE POLICY "Authors can manage own posts" ON "public"."posts" USING (("author_id" = "auth"."uid"()));



CREATE POLICY "Leitura de editais públicos para todos os usuários" ON "public"."public_editais" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Members can view organization membership" ON "public"."organization_members" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organization_members"."organization_id") AND ("om"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Members can view their organizations" ON "public"."organizations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organizations"."id") AND ("om"."user_id" = "auth"."uid"())))));



CREATE POLICY "Moderators can manage comments" ON "public"."comments" USING ("private"."has_role_or_higher"("auth"."uid"(), 'moderator'::"public"."app_role"));



CREATE POLICY "Moderators can manage flagged posts" ON "public"."posts" USING (("private"."has_role_or_higher"("auth"."uid"(), 'moderator'::"public"."app_role") AND ("status" = 'flagged'::"text")));



CREATE POLICY "No one can delete logs" ON "public"."audit_logs" FOR DELETE USING (false);



CREATE POLICY "No one can modify logs" ON "public"."audit_logs" FOR UPDATE USING (false);



CREATE POLICY "Only owners and admins can update alerts" ON "public"."admin_alert_events" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['owner'::"public"."app_role", 'admin'::"public"."app_role"]))))));



CREATE POLICY "Only owners and admins can update errors" ON "public"."admin_error_events" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['owner'::"public"."app_role", 'admin'::"public"."app_role"]))))));



CREATE POLICY "Only owners and admins can view alerts" ON "public"."admin_alert_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['owner'::"public"."app_role", 'admin'::"public"."app_role"]))))));



CREATE POLICY "Only owners and admins can view errors" ON "public"."admin_error_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['owner'::"public"."app_role", 'admin'::"public"."app_role"]))))));



CREATE POLICY "Organization owners can manage members" ON "public"."organization_members" USING ((EXISTS ( SELECT 1
   FROM "public"."organizations" "o"
  WHERE (("o"."id" = "organization_members"."organization_id") AND ("o"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Owner can manage plan configs" ON "public"."plan_configs" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'owner'::"public"."app_role")))));



CREATE POLICY "Owners can manage system settings" ON "public"."system_settings" USING ("private"."is_owner"("auth"."uid"()));



CREATE POLICY "Owners can manage their organizations" ON "public"."organizations" USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "System admins can manage all organizations" ON "public"."organizations" USING ("private"."has_role_or_higher"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "System can insert logs" ON "public"."audit_logs" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can cancel own ai extraction jobs" ON "public"."ai_extraction_jobs" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can create own edital incidence maps" ON "public"."edital_incidence_maps" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete own cycle study events" ON "public"."cycle_study_events" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own cycle study events" ON "public"."cycle_study_events" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own feedback" ON "public"."user_feedback_events" FOR INSERT TO "authenticated" WITH CHECK (("actor_user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can manage own profile" ON "public"."profiles" USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can manage own subject relations" ON "public"."subject_relations" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own cycle rotation snapshots" ON "public"."cycle_rotation_snapshots" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own pending extractions" ON "public"."pending_ai_extractions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own pending merges" ON "public"."pending_cycle_merges" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own rotations" ON "public"."cycle_rotations" USING ((EXISTS ( SELECT 1
   FROM "public"."study_cycles_v2"
  WHERE (("study_cycles_v2"."id" = "cycle_rotations"."cycle_id") AND ("study_cycles_v2"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage their own study logs" ON "public"."cycle_study_logs" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own subject states" ON "public"."cycle_subject_states" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own v2 cycles" ON "public"."study_cycles_v2" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own edital incidence maps" ON "public"."edital_incidence_maps" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own cycle study events" ON "public"."cycle_study_events" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own edital incidence maps" ON "public"."edital_incidence_maps" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own notifications (mark as read)" ON "public"."user_notifications" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own ai extraction jobs" ON "public"."ai_extraction_jobs" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own coupon uses" ON "public"."coupon_uses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own cycle study events" ON "public"."cycle_study_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own feedback" ON "public"."user_feedback_events" FOR SELECT USING (("actor_user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



COMMENT ON POLICY "Users can view own profile" ON "public"."profiles" IS 'Users can only view their own full profile data. Removed public visibility to prevent data scraping of emails, phone numbers, and personal info.';



CREATE POLICY "Users can view their own AI usage logs" ON "public"."ai_usage_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own API usage" ON "public"."api_usage" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."user_notifications" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "View public organizations" ON "public"."organizations" FOR SELECT USING (("is_public" = true));



CREATE POLICY "View published comments on visible posts" ON "public"."comments" FOR SELECT USING ((("status" = 'published'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "comments"."post_id") AND ("p"."status" = 'published'::"text") AND ("p"."visibility" = 'public'::"text"))))));



ALTER TABLE "public"."active_study_timers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "active_study_timers_all_policy" ON "public"."active_study_timers" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."admin_alert_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_all_public_editais" ON "public"."public_editais" TO "authenticated" USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());



CREATE POLICY "admin_all_suggestions" ON "public"."edital_suggestions" TO "authenticated" USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());



ALTER TABLE "public"."admin_error_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_insert_notifications" ON "public"."user_notifications" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_admin"());



ALTER TABLE "public"."ai_error_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_extraction_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_usage_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_access_grants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_affiliate_conversions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_affiliate_payouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_affiliates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_checkout_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_contract_acceptances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_plan_change_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_refund_admin_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_refund_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupon_uses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cycle_rotation_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cycle_rotations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cycle_study_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cycle_study_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cycle_subject_states" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."edital_incidence_maps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."edital_suggestions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flashcard_schedules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "flashcard_schedules_select_own" ON "public"."flashcard_schedules" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."general_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "general_notes_delete_policy" ON "public"."general_notes" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "general_notes_insert_policy" ON "public"."general_notes" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "general_notes_select_policy" ON "public"."general_notes" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "general_notes_update_policy" ON "public"."general_notes" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."general_reminders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "general_reminders_all_policy" ON "public"."general_reminders" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."incident_action_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."legal_document_acceptances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_insert_policy" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_select_policy" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "notifications_update_policy" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pending_ai_extractions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pending_cycle_merges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pending_merge_suggestions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pending_merge_suggestions_all_policy" ON "public"."pending_merge_suggestions" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."plan_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pomodoro_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pomodoro_sessions_all_policy" ON "public"."pomodoro_sessions" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."practice_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "practice_attempts_select_own" ON "public"."practice_attempts" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."practice_item_feedback" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "practice_item_feedback_select_own" ON "public"."practice_item_feedback" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."practice_item_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "practice_item_reports_select_own" ON "public"."practice_item_reports" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."practice_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "practice_items_select_from_own_package" ON "public"."practice_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."practice_packages" "package"
  WHERE (("package"."id" = "practice_items"."package_id") AND ("package"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."practice_packages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "practice_packages_select_own" ON "public"."practice_packages" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."practice_session_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "practice_session_items_select_own" ON "public"."practice_session_items" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."practice_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "practice_sessions_select_own" ON "public"."practice_sessions" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."public_editais" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "question_attempts_all_policy" ON "public"."question_attempts" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."study_cycles_v2" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."study_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "study_sessions_all_policy" ON "public"."study_sessions" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."subject_merges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subject_merges_all_policy" ON "public"."subject_merges" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."subject_relations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subjects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subjects_delete_policy" ON "public"."subjects" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "subjects_insert_policy" ON "public"."subjects" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "subjects_select_policy" ON "public"."subjects" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "subjects_update_policy" ON "public"."subjects" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."topic_incidence_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."topic_learning_signals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "topic_learning_signals_select_own" ON "public"."topic_learning_signals" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."topic_merges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "topic_merges_all_policy" ON "public"."topic_merges" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."topic_review_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "topic_review_history_all_policy" ON "public"."topic_review_history" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."topics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "topics_delete_policy" ON "public"."topics" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."subjects" "s"
  WHERE (("s"."id" = "topics"."subject_id") AND ("s"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) AND "private"."is_user_active"()));



CREATE POLICY "topics_insert_policy" ON "public"."topics" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."subjects" "s"
  WHERE (("s"."id" = "topics"."subject_id") AND ("s"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) AND "private"."is_user_active"()));



CREATE POLICY "topics_select_policy" ON "public"."topics" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."subjects" "s"
  WHERE (("s"."id" = "topics"."subject_id") AND ("s"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) AND "private"."is_user_active"()));



CREATE POLICY "topics_update_policy" ON "public"."topics" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."subjects" "s"
  WHERE (("s"."id" = "topics"."subject_id") AND ("s"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) AND "private"."is_user_active"()));



ALTER TABLE "public"."user_ai_quota_resets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_cycles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_cycles_all_policy" ON "public"."user_cycles" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_cycles_delete_own" ON "public"."user_cycles" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "user_cycles_insert_own" ON "public"."user_cycles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "user_cycles_select_own" ON "public"."user_cycles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "user_cycles_update_own" ON "public"."user_cycles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."user_editais" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_editais_all_policy" ON "public"."user_editais" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."user_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_events_all_policy" ON "public"."user_events" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."user_feedback_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_select_policy" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."is_owner"(( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_settings_all_policy" ON "public"."user_settings" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."user_study_analytics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_study_analytics_all_policy" ON "public"."user_study_analytics" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "users_insert_own_suggestions" ON "public"."edital_suggestions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_update_own_notifications" ON "public"."user_notifications" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_view_own_notifications" ON "public"."user_notifications" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_view_own_suggestions" ON "public"."edital_suggestions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



GRANT USAGE ON SCHEMA "private" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "private"."has_role"("_user_id" "uuid", "_role" "public"."app_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "private"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



REVOKE ALL ON FUNCTION "private"."has_role"("check_role" "public"."app_role", "check_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."has_role"("check_role" "public"."app_role", "check_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "private"."has_role"("check_role" "public"."app_role", "check_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "private"."has_role_or_higher"("_user_id" "uuid", "_min_role" "public"."app_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."has_role_or_higher"("_user_id" "uuid", "_min_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "private"."has_role_or_higher"("_user_id" "uuid", "_min_role" "public"."app_role") TO "service_role";



REVOKE ALL ON FUNCTION "private"."has_role_or_higher"("min_role" "public"."app_role", "check_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."has_role_or_higher"("min_role" "public"."app_role", "check_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "private"."has_role_or_higher"("min_role" "public"."app_role", "check_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "private"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "private"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "private"."is_owner"("_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_owner"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "private"."is_owner"("_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "private"."is_user_active"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_user_active"() TO "authenticated";
GRANT ALL ON FUNCTION "private"."is_user_active"() TO "service_role";



REVOKE ALL ON FUNCTION "private"."next_flashcard_schedule"("p_now" timestamp with time zone, "p_state" "jsonb", "p_repetitions" integer, "p_lapses" integer, "p_rating" "public"."practice_attempt_result") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."set_practice_updated_at"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."admin_deactivate_user"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_deactivate_user"("target_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_purge_user"("p_target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_purge_user"("p_target_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_purge_user"("p_target_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."admin_reactivate_user"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_reactivate_user"("target_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_rpc_dispatch"("p_action" "text", "p_args" "jsonb", "p_actor_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_rpc_dispatch"("p_action" "text", "p_args" "jsonb", "p_actor_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."assign_role"("_target_user_id" "uuid", "_role" "public"."app_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assign_role"("_target_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



REVOKE ALL ON FUNCTION "public"."assign_user_role_admin"("target_user_id" "uuid", "new_role" "public"."app_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assign_user_role_admin"("target_user_id" "uuid", "new_role" "public"."app_role") TO "service_role";



REVOKE ALL ON FUNCTION "public"."atomic_archive_edital_from_cycle"("p_user_id" "uuid", "p_edital_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."atomic_archive_edital_from_cycle"("p_user_id" "uuid", "p_edital_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."atomic_cycle_load"("p_user_id" "uuid", "p_new_edital_id" "uuid", "p_new_subject_ids" "text"[], "p_old_edital_ids" "uuid"[], "p_mode" "text", "p_cycle_name" "text", "p_exam_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."atomic_cycle_load"("p_user_id" "uuid", "p_new_edital_id" "uuid", "p_new_subject_ids" "text"[], "p_old_edital_ids" "uuid"[], "p_mode" "text", "p_cycle_name" "text", "p_exam_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."atomic_cycle_load"("p_user_id" "uuid", "p_new_edital_id" "uuid", "p_new_subject_ids" "text"[], "p_old_edital_ids" "uuid"[], "p_mode" "text", "p_cycle_name" "text", "p_exam_date" "date", "p_reset_cycle_state" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."atomic_cycle_load"("p_user_id" "uuid", "p_new_edital_id" "uuid", "p_new_subject_ids" "text"[], "p_old_edital_ids" "uuid"[], "p_mode" "text", "p_cycle_name" "text", "p_exam_date" "date", "p_reset_cycle_state" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."atomic_cycle_unload_or_delete"("p_user_id" "uuid", "p_edital_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."atomic_cycle_unload_or_delete"("p_user_id" "uuid", "p_edital_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."atomic_delete_subject"("p_user_id" "uuid", "p_subject_id" "uuid", "p_edital_id_to_remove" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."atomic_delete_subject"("p_user_id" "uuid", "p_subject_id" "uuid", "p_edital_id_to_remove" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."atomic_delete_subject"("p_user_id" "uuid", "p_subject_id" "uuid", "p_edital_id_to_remove" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."audit_trigger_function"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."audit_trigger_function"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."audit_user_roles_function"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."audit_user_roles_function"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."auto_assign_user_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auto_assign_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_difficulty_points"("p_user_id" "uuid", "p_start_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_difficulty_points"("p_user_id" "uuid", "p_start_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_difficulty_points"("p_user_id" "uuid", "p_start_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."calculate_slo_metrics"("p_days_window" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."calculate_slo_metrics"("p_days_window" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_user_analytics"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_user_analytics"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_user_analytics"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_ai_circuit_breaker"("p_daily_limit_usd" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_ai_circuit_breaker"("p_daily_limit_usd" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_email_exists"("email_to_check" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_email_exists"("email_to_check" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_error_alerts"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_error_alerts"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_rate_limit"("p_user_id" "uuid", "p_endpoint" "text", "p_max_per_hour" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_user_id" "uuid", "p_endpoint" "text", "p_max_per_hour" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_billing_refund_request"("p_refund_request_id" "uuid", "p_user_id" "uuid", "p_livemode" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_billing_refund_request"("p_refund_request_id" "uuid", "p_user_id" "uuid", "p_livemode" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_error_logs"("p_days_retention" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_error_logs"("p_days_retention" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_merges_on_edital_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_merges_on_edital_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_merges_on_edital_delete"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_old_audit_logs"("_days_to_keep" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"("_days_to_keep" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_subject_merges_on_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_subject_merges_on_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_subject_merges_on_delete"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_practice_session_internal"("p_user_id" "uuid", "p_topic_id" "uuid", "p_mode" "public"."practice_session_mode", "p_idempotency_key" "uuid", "p_signal_snapshot" "jsonb", "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_practice_session_internal"("p_user_id" "uuid", "p_topic_id" "uuid", "p_mode" "public"."practice_session_mode", "p_idempotency_key" "uuid", "p_signal_snapshot" "jsonb", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_feedback_protocol"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_feedback_protocol"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_feedback_protocol"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_all_topics_admin"("page_number" integer, "page_size" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_all_topics_admin"("page_number" integer, "page_size" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_all_user_roles_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_all_user_roles_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_audit_logs"("p_limit" integer, "p_offset" integer, "p_event_type" "text", "p_target_user_id" "uuid", "p_actor_user_id" "uuid", "p_status" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_audit_logs"("p_limit" integer, "p_offset" integer, "p_event_type" "text", "p_target_user_id" "uuid", "p_actor_user_id" "uuid", "p_status" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_daily_progress"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_daily_progress"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_daily_progress"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_estimated_time_by_difficulty"("p_difficulty" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_estimated_time_by_difficulty"("p_difficulty" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_estimated_time_by_difficulty"("p_difficulty" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_highest_user_role"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_highest_user_role"("target_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_auth_methods"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_auth_methods"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_auth_methods"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_organization_role"("_org_id" "uuid", "_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_organization_role"("_org_id" "uuid", "_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_points_by_difficulty"("p_difficulty" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_points_by_difficulty"("p_difficulty" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_points_by_difficulty"("p_difficulty" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_practice_item_answer_internal"("p_user_id" "uuid", "p_session_id" "uuid", "p_item_id" "uuid", "p_flashcard_only" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_practice_item_answer_internal"("p_user_id" "uuid", "p_session_id" "uuid", "p_item_id" "uuid", "p_flashcard_only" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_role_audit_log"("_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_role_audit_log"("_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_stripe_billing_overview"("p_livemode" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_stripe_billing_overview"("p_livemode" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_stripe_billing_overview"("p_livemode" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_subscription_info"("check_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_subscription_info"("check_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_subscription_info"("check_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_unified_subject_name"("subject_id" "uuid", "user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_unified_subject_name"("subject_id" "uuid", "user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_unified_topic_name"("topic_id" "uuid", "user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_unified_topic_name"("topic_id" "uuid", "user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_ai_limits"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_ai_limits"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_ai_limits"("p_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_user_difficulty_stats"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_difficulty_stats"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_difficulty_stats"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_info"("_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_info"("_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_roles"("user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_roles"("user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_users_by_edital_source"("source_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_users_by_edital_source"("source_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_weighted_reviews"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_weighted_reviews"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_weighted_reviews"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_topic_orphan_recovery"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_topic_orphan_recovery"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_topic_orphan_recovery"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_role"("check_role" "public"."app_role", "check_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_role"("check_role" "public"."app_role", "check_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_role_or_higher"("_user_id" "uuid", "_min_role" "public"."app_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_role_or_higher"("_user_id" "uuid", "_min_role" "public"."app_role") TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_role_or_higher"("min_role" "public"."app_role", "check_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_role_or_higher"("min_role" "public"."app_role", "check_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."internal_get_auth_methods"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."internal_get_auth_methods"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_organization_member"("_org_id" "uuid", "_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_organization_member"("_org_id" "uuid", "_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_owner"("_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_owner"("_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_user_active"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_user_active"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_users_with_roles"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_users_with_roles"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_admin_error"("p_error_id" "text", "p_module" "text", "p_action" "text", "p_user_message" "text", "p_technical_message" "text", "p_code" "text", "p_severity" "text", "p_retryable" boolean, "p_actor_user_id" "uuid", "p_metadata" "jsonb", "p_fingerprint" "text", "p_scope" "text", "p_category" "text", "p_recoverability" "text", "p_is_user_visible" boolean, "p_recommended_action" "text", "p_fingerprint_version" "text", "p_environment" "text", "p_route_path" "text", "p_feature_area" "text", "p_actor_email" "text", "p_target_user_id" "uuid", "p_target_email" "text", "p_session_id" "text", "p_request_id" "text", "p_context_label" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_admin_error"("p_error_id" "text", "p_module" "text", "p_action" "text", "p_user_message" "text", "p_technical_message" "text", "p_code" "text", "p_severity" "text", "p_retryable" boolean, "p_actor_user_id" "uuid", "p_metadata" "jsonb", "p_fingerprint" "text", "p_scope" "text", "p_category" "text", "p_recoverability" "text", "p_is_user_visible" boolean, "p_recommended_action" "text", "p_fingerprint_version" "text", "p_environment" "text", "p_route_path" "text", "p_feature_area" "text", "p_actor_email" "text", "p_target_user_id" "uuid", "p_target_email" "text", "p_session_id" "text", "p_request_id" "text", "p_context_label" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_api_usage"("p_user_id" "uuid", "p_endpoint" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_api_usage"("p_user_id" "uuid", "p_endpoint" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_custom_action"("_action" "text", "_table_name" "text", "_record_id" "uuid", "_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_custom_action"("_action" "text", "_table_name" "text", "_record_id" "uuid", "_metadata" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_signup_event"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_signup_event"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_user_event"("p_event_type" "text", "p_target_user_id" "uuid", "p_actor_user_id" "uuid", "p_origin" "text", "p_metadata" "jsonb", "p_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_user_event"("p_event_type" "text", "p_target_user_id" "uuid", "p_actor_user_id" "uuid", "p_origin" "text", "p_metadata" "jsonb", "p_status" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."notify_user_on_feedback_response"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_user_on_feedback_response"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_billing_affiliate_payout"("p_affiliate_id" "uuid", "p_livemode" boolean, "p_period_start" "date", "p_period_end" "date", "p_payment_reference" "text", "p_created_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_billing_affiliate_payout"("p_affiliate_id" "uuid", "p_livemode" boolean, "p_period_start" "date", "p_period_end" "date", "p_payment_reference" "text", "p_created_by" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."remove_role"("_target_user_id" "uuid", "_role" "public"."app_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."remove_role"("_target_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



REVOKE ALL ON FUNCTION "public"."remove_user_role_admin"("target_user_id" "uuid", "role_to_remove" "public"."app_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."remove_user_role_admin"("target_user_id" "uuid", "role_to_remove" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_daily_progress"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_daily_progress"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_daily_progress"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reset_edital_study_progress"("p_user_id" "uuid", "p_edital_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reset_edital_study_progress"("p_user_id" "uuid", "p_edital_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reset_user_ai_quota"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reset_user_ai_quota"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."revert_subject_merge"("merge_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revert_subject_merge"("merge_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."revert_subject_merge"("p_user_id" "uuid", "p_merge_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revert_subject_merge"("p_user_id" "uuid", "p_merge_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."revert_topic_merge"("merge_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revert_topic_merge"("merge_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."revert_topic_merge"("p_user_id" "uuid", "p_merge_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revert_topic_merge"("p_user_id" "uuid", "p_merge_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_active_study_timer_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_active_study_timer_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_active_study_timer_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_user_role"("_target_user_id" "uuid", "_role" "public"."app_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_user_role"("_target_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_practice_attempt_internal"("p_user_id" "uuid", "p_session_id" "uuid", "p_item_id" "uuid", "p_client_attempt_id" "uuid", "p_answer_payload" "jsonb", "p_response_time_ms" integer, "p_algorithm_version" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_practice_attempt_internal"("p_user_id" "uuid", "p_session_id" "uuid", "p_item_id" "uuid", "p_client_attempt_id" "uuid", "p_answer_payload" "jsonb", "p_response_time_ms" integer, "p_algorithm_version" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."suggest_topics_by_time"("p_user_id" "uuid", "p_available_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."suggest_topics_by_time"("p_user_id" "uuid", "p_available_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."suggest_topics_by_time"("p_user_id" "uuid", "p_available_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_general_reminder_completed_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_general_reminder_completed_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_general_reminder_completed_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_last_access"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_last_access"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_last_sign_in"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_last_sign_in"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_merges_on_cycle_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_merges_on_cycle_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_merges_on_cycle_update"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_topic_merge_progress"("p_user_id" "uuid", "p_topic_id" "uuid", "p_progress" "jsonb", "p_history" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_topic_merge_progress"("p_user_id" "uuid", "p_topic_id" "uuid", "p_progress" "jsonb", "p_history" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."test_difficulty_system"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_difficulty_system"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_difficulty_system"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_owner_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_owner_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_owner_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_admin_error_events_modtime"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_admin_error_events_modtime"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_admin_error_events_modtime"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_admin_error_events_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_admin_error_events_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_admin_error_events_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_atualizado_em_column"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_atualizado_em_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_cycle_subject_states_modtime"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_cycle_subject_states_modtime"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_cycle_subject_states_modtime"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_daily_progress"("p_user_id" "uuid", "p_subject_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_daily_progress"("p_user_id" "uuid", "p_subject_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_daily_progress"("p_user_id" "uuid", "p_subject_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_difficulty_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_difficulty_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_difficulty_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pending_cycle_merges_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_pending_cycle_merges_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pending_cycle_merges_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pending_merge_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_pending_merge_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pending_merge_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pending_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_pending_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pending_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_study_cycles_v2_modtime"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_study_cycles_v2_modtime"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_study_cycles_v2_modtime"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_study_sessions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_study_sessions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_study_sessions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_subscription_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_subscription_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_subscription_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_updated_at_column"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_editais_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_editais_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_editais_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_study_analytics_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_study_analytics_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_study_analytics_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."use_coupon"("target_coupon_code" "text", "target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."use_coupon"("target_coupon_code" "text", "target_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_rpc_dispatch"("p_action" "text", "p_args" "jsonb", "p_actor_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_rpc_dispatch"("p_action" "text", "p_args" "jsonb", "p_actor_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_coupon"("target_coupon_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_coupon"("target_coupon_code" "text") TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."active_study_timers" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."active_study_timers" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."active_study_timers" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."admin_alert_events" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."admin_alert_events" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."admin_alert_events" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."admin_error_events" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."admin_error_events" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."admin_error_events" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."ai_error_logs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."ai_error_logs" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."ai_error_logs" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."ai_extraction_jobs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."ai_extraction_jobs" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."ai_extraction_jobs" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."ai_status" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."ai_status" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."ai_status" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."ai_usage_logs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."ai_usage_logs" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."ai_usage_logs" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."api_usage" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."api_usage" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."api_usage" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."audit_logs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."audit_logs" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."billing_access_grants" TO "service_role";



GRANT ALL ON TABLE "public"."billing_affiliate_conversions" TO "service_role";



GRANT ALL ON TABLE "public"."billing_affiliate_payouts" TO "service_role";



GRANT ALL ON TABLE "public"."billing_affiliates" TO "service_role";



GRANT ALL ON TABLE "public"."billing_checkout_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."billing_contract_acceptances" TO "service_role";



GRANT ALL ON TABLE "public"."billing_customers" TO "service_role";



GRANT ALL ON TABLE "public"."billing_plan_change_requests" TO "service_role";



GRANT ALL ON TABLE "public"."billing_refund_admin_actions" TO "service_role";



GRANT ALL ON TABLE "public"."billing_refund_requests" TO "service_role";



GRANT ALL ON TABLE "public"."billing_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."billing_webhook_events" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."comments" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."comments" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."comments" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."coupon_uses" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."coupon_uses" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."coupon_uses" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."coupons" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."coupons" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."coupons" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cycle_rotation_snapshots" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cycle_rotation_snapshots" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cycle_rotation_snapshots" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cycle_rotations" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cycle_rotations" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cycle_rotations" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cycle_study_events" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cycle_study_events" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cycle_study_events" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cycle_study_logs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cycle_study_logs" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cycle_study_logs" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cycle_subject_states" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cycle_subject_states" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cycle_subject_states" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."edital_incidence_maps" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."edital_incidence_maps" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."edital_incidence_maps" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."edital_suggestions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."edital_suggestions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."edital_suggestions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."feedback_protocol_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."feedback_protocol_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."feedback_protocol_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."flashcard_schedules" TO "service_role";
GRANT SELECT ON TABLE "public"."flashcard_schedules" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."general_notes" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."general_notes" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."general_notes" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."general_reminders" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."general_reminders" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."general_reminders" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."incident_action_log" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."incident_action_log" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."incident_action_log" TO "service_role";



GRANT ALL ON TABLE "public"."legal_document_acceptances" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."notifications" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."notifications" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."notifications" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organization_members" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organization_members" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organization_members" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organizations" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organizations" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organizations" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pending_ai_extractions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pending_ai_extractions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pending_ai_extractions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pending_cycle_merges" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pending_cycle_merges" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pending_cycle_merges" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pending_merge_suggestions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pending_merge_suggestions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pending_merge_suggestions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."plan_configs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."plan_configs" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."plan_configs" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pomodoro_sessions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pomodoro_sessions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pomodoro_sessions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."posts" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."posts" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."posts" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."practice_attempts" TO "service_role";
GRANT SELECT ON TABLE "public"."practice_attempts" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."practice_item_feedback" TO "service_role";
GRANT SELECT ON TABLE "public"."practice_item_feedback" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."practice_item_reports" TO "service_role";
GRANT SELECT ON TABLE "public"."practice_item_reports" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."practice_items" TO "service_role";
GRANT SELECT ON TABLE "public"."practice_items" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."practice_packages" TO "service_role";
GRANT SELECT ON TABLE "public"."practice_packages" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."practice_session_items" TO "service_role";
GRANT SELECT ON TABLE "public"."practice_session_items" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."practice_sessions" TO "service_role";
GRANT SELECT ON TABLE "public"."practice_sessions" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."public_editais" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."public_editais" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."public_editais" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."question_attempts" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."question_attempts" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."question_attempts" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."study_cycles_v2" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."study_cycles_v2" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."study_cycles_v2" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."study_sessions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."study_sessions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."subject_merges" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."subject_merges" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."subject_merges" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."subject_relations" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."subject_relations" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."subject_relations" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."subjects" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."subjects" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."subjects" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."system_settings" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."system_settings" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."system_settings" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."topic_incidence_catalog" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."topic_incidence_catalog" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."topic_incidence_catalog" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."topic_learning_signals" TO "service_role";
GRANT SELECT ON TABLE "public"."topic_learning_signals" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."topic_merges" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."topic_merges" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."topic_merges" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."topic_review_history" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."topic_review_history" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."topic_review_history" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."topics" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."topics" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."topics" TO "service_role";



GRANT ALL ON TABLE "public"."user_ai_quota_resets" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_cycles" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_cycles" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_difficulty_overview" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_difficulty_overview" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_difficulty_overview" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_editais" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_editais" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_editais" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_events" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_events" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_events_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_feedback_events" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_feedback_events" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_feedback_events" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_notifications" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_notifications" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_notifications" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_roles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_roles" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_roles" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_settings" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_settings" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_settings" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_study_analytics" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_study_analytics" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_study_analytics" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";







