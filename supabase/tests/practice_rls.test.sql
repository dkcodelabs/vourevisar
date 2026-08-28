begin;

select plan(38);

-- Fixed identities are rolled back with this test. They never reach the
-- linked project and let us exercise the actual RLS policies as two students.
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'practice-owner-a@example.invalid',
    '$2a$10$practiceRlsFixtureOnlyNotARealPasswordHash00000000000000',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'practice-owner-b@example.invalid',
    '$2a$10$practiceRlsFixtureOnlyNotARealPasswordHash00000000000000',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.subjects (id, user_id, name)
values
  ('11111111-1111-1111-1111-111111111121', '11111111-1111-1111-1111-111111111111', 'Matéria do aluno A'),
  ('22222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'Matéria do aluno B');

insert into public.topics (id, subject_id, name)
values
  ('11111111-1111-1111-1111-111111111131', '11111111-1111-1111-1111-111111111121', 'Tópico do aluno A'),
  ('11111111-1111-1111-1111-111111111132', '11111111-1111-1111-1111-111111111121', 'Tópico novo do aluno A'),
  ('22222222-2222-2222-2222-222222222231', '22222222-2222-2222-2222-222222222221', 'Tópico do aluno B');

insert into public.practice_packages (id, user_id, topic_id, status)
values
  ('11111111-1111-1111-1111-111111111141', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111131', 'ready'),
  ('22222222-2222-2222-2222-222222222241', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222231', 'ready');

insert into public.practice_items (id, package_id, item_type, prompt, options, status)
values
  (
    '11111111-1111-1111-1111-111111111151',
    '11111111-1111-1111-1111-111111111141',
    'flashcard',
    'Qual é a regra do aluno A?',
    '[]'::jsonb,
    'private_ready'
  ),
  (
    '11111111-1111-1111-1111-111111111152',
    '11111111-1111-1111-1111-111111111141',
    'true_false',
    'A afirmação do aluno A está certa?',
    '[{"id":"certo","label":"Certo"},{"id":"errado","label":"Errado"}]'::jsonb,
    'private_ready'
  ),
  (
    '11111111-1111-1111-1111-111111111153',
    '11111111-1111-1111-1111-111111111141',
    'flashcard',
    'Qual é a regra manual do aluno A?',
    '[]'::jsonb,
    'private_ready'
  ),
  (
    '22222222-2222-2222-2222-222222222251',
    '22222222-2222-2222-2222-222222222241',
    'flashcard',
    'Qual é a regra do aluno B?',
    '[]'::jsonb,
    'private_ready'
  );

insert into private.practice_item_answers (item_id, answer_key, explanation)
values
  ('11111111-1111-1111-1111-111111111151', '{}'::jsonb, 'Resposta privada do cartão A.'),
  ('11111111-1111-1111-1111-111111111152', '{"correctOptionId":"errado"}'::jsonb, 'Resposta privada da questão A.'),
  ('11111111-1111-1111-1111-111111111153', '{}'::jsonb, 'Resposta privada do cartão manual A.'),
  ('22222222-2222-2222-2222-222222222251', '{}'::jsonb, 'Resposta privada do cartão B.');

insert into public.practice_sessions (id, user_id, topic_id, mode, idempotency_key, signal_snapshot)
values
  (
    '11111111-1111-1111-1111-111111111161',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111131',
    'flashcards_due',
    '11111111-1111-1111-1111-111111111171',
    '{"rescheduleFlashcards": true}'::jsonb
  ),
  (
    '11111111-1111-1111-1111-111111111162',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111131',
    'quick',
    '11111111-1111-1111-1111-111111111172',
    '{"rescheduleFlashcards": false}'::jsonb
  );

insert into public.practice_session_items (session_id, item_id, user_id, topic_id, position, served_reason)
values
  (
    '11111111-1111-1111-1111-111111111161',
    '11111111-1111-1111-1111-111111111151',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111131',
    1,
    'rls_test_due'
  ),
  (
    '11111111-1111-1111-1111-111111111162',
    '11111111-1111-1111-1111-111111111153',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111131',
    1,
    'rls_test_manual'
  );

insert into public.practice_item_feedback (user_id, session_id, item_id, rating, reason)
values (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111161',
  '11111111-1111-1111-1111-111111111151',
  -1,
  'ambiguous'
);

insert into public.practice_item_reports (user_id, item_id, reason)
values (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111151',
  'ambiguous'
);

insert into public.practice_generation_runs (
  id,
  user_id,
  topic_id,
  idempotency_key,
  trigger,
  context_fingerprint,
  model_id,
  prompt_version,
  schema_version
) values
  (
    '11111111-1111-1111-1111-111111111191',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111131',
    '11111111-1111-1111-1111-111111111192',
    'explicit',
    repeat('a', 64),
    'fixture-model',
    'practice-v1',
    'practice-schema-v1'
  ),
  (
    '22222222-2222-2222-2222-222222222291',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222231',
    '22222222-2222-2222-2222-222222222292',
    'explicit',
    repeat('b', 64),
    'fixture-model',
    'practice-v1',
    'practice-schema-v1'
  );

select ok(
  not has_table_privilege('anon', 'public.practice_sessions', 'select,insert,update,delete'),
  'anon has no direct privilege on practice sessions'
);

select ok(
  not has_table_privilege('authenticated', 'public.practice_attempts', 'insert,update,delete'),
  'authenticated cannot write practice attempts directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.practice_item_feedback', 'insert,update,delete'),
  'authenticated cannot write feedback directly'
);

select ok(
  not has_table_privilege('authenticated', 'private.practice_item_answers', 'select,insert,update,delete'),
  'authenticated has no direct access to private answers'
);

select ok(
  not has_table_privilege('authenticated', 'public.practice_generation_runs', 'insert,update,delete'),
  'authenticated cannot create or alter generation ledger rows directly'
);

select ok(
  not has_function_privilege('authenticated', 'public.create_practice_session_internal(uuid,uuid,public.practice_session_mode,uuid,jsonb,jsonb)', 'execute'),
  'authenticated cannot call session creation RPC directly'
);

select ok(
  not has_function_privilege('authenticated', 'public.get_practice_item_answer_internal(uuid,uuid,uuid,boolean)', 'execute'),
  'authenticated cannot call answer RPC directly'
);

select ok(
  not has_function_privilege('authenticated', 'public.submit_practice_attempt_internal(uuid,uuid,uuid,uuid,jsonb,integer,text)', 'execute'),
  'authenticated cannot call attempt RPC directly'
);

select ok(
  not has_function_privilege('authenticated', 'private.reserve_practice_generation(uuid,uuid,uuid,public.practice_generation_trigger,text,jsonb,text,text,text)', 'execute'),
  'authenticated cannot reserve an AI generation directly'
);

select ok(
  not has_function_privilege('authenticated', 'private.complete_practice_generation(uuid,uuid,jsonb,jsonb,integer,integer,integer,numeric,smallint,jsonb)', 'execute'),
  'authenticated cannot persist an AI-generated package directly'
);

select ok(
  not has_function_privilege('authenticated', 'private.fail_practice_generation(uuid,uuid,public.practice_generation_status,text,text,smallint,jsonb)', 'execute'),
  'authenticated cannot alter a generation outcome directly'
);

select ok(
  not has_function_privilege('authenticated', 'public.reserve_practice_generation_internal(uuid,uuid,uuid,public.practice_generation_trigger,text,jsonb,text,text,text)', 'execute'),
  'authenticated cannot access the public generation reservation pass-through'
);

select ok(
  not has_function_privilege('authenticated', 'public.complete_practice_generation_internal(uuid,uuid,jsonb,jsonb,integer,integer,integer,numeric,smallint,jsonb)', 'execute'),
  'authenticated cannot access the public generation completion pass-through'
);

select ok(
  not has_function_privilege('authenticated', 'public.fail_practice_generation_internal(uuid,uuid,public.practice_generation_status,text,text,smallint,jsonb)', 'execute'),
  'authenticated cannot access the public generation failure pass-through'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select results_eq(
  $$select id from public.practice_packages order by id$$,
  array['11111111-1111-1111-1111-111111111141'::uuid],
  'student A reads only their practice package'
);

select results_eq(
  $$select id from public.practice_items order by id$$,
  array[
    '11111111-1111-1111-1111-111111111151'::uuid,
    '11111111-1111-1111-1111-111111111152'::uuid,
    '11111111-1111-1111-1111-111111111153'::uuid
  ],
  'student A reads only safe items from their package'
);

select results_eq(
  $$select id from public.practice_sessions order by id$$,
  array[
    '11111111-1111-1111-1111-111111111161'::uuid,
    '11111111-1111-1111-1111-111111111162'::uuid
  ],
  'student A reads only their sessions'
);

select results_eq(
  $$select item_id from public.practice_item_feedback order by item_id$$,
  array['11111111-1111-1111-1111-111111111151'::uuid],
  'student A reads only their feedback'
);

select results_eq(
  $$select item_id from public.practice_item_reports order by item_id$$,
  array['11111111-1111-1111-1111-111111111151'::uuid],
  'student A reads only their report'
);

select results_eq(
  $$select id from public.practice_generation_runs order by id$$,
  array['11111111-1111-1111-1111-111111111191'::uuid],
  'student A reads only their generation ledger'
);

select throws_ok(
  $$select * from private.practice_item_answers$$,
  '42501',
  null,
  'student A cannot read private answers'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

select is_empty(
  $$select id from public.practice_packages where id = '11111111-1111-1111-1111-111111111141'$$,
  'student B cannot read student A package'
);

select is_empty(
  $$select id from public.practice_sessions where id = '11111111-1111-1111-1111-111111111161'$$,
  'student B cannot read student A session'
);

select is_empty(
  $$select item_id from public.practice_item_feedback where user_id = '11111111-1111-1111-1111-111111111111'$$,
  'student B cannot read student A feedback'
);

select is_empty(
  $$select id from public.practice_generation_runs where id = '11111111-1111-1111-1111-111111111191'$$,
  'student B cannot read student A generation ledger'
);

reset role;
set local role service_role;

select is(
  (
    select should_generate
    from private.reserve_practice_generation(
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111132',
      '11111111-1111-1111-1111-111111111193',
      'explicit',
      repeat('c', 64),
      '{"topic":"Tópico novo do aluno A"}'::jsonb,
      'fixture-model',
      'practice-v1',
      'practice-schema-v1'
    )
  ),
  true,
  'the first generation reservation owns the provider call'
);

select is(
  (
    select should_generate
    from public.reserve_practice_generation_internal(
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111132',
      '11111111-1111-1111-1111-111111111193',
      'explicit',
      repeat('c', 64),
      '{"topic":"Tópico novo do aluno A"}'::jsonb,
      'fixture-model',
      'practice-v1',
      'practice-schema-v1'
    )
  ),
  false,
  'service role can reach the private reservation through the public pass-through'
);

select is(
  (
    select should_generate
    from private.reserve_practice_generation(
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111132',
      '11111111-1111-1111-1111-111111111193',
      'explicit',
      repeat('c', 64),
      '{"topic":"Tópico novo do aluno A"}'::jsonb,
      'fixture-model',
      'practice-v1',
      'practice-schema-v1'
    )
  ),
  false,
  'the same idempotency key reuses the generation reservation'
);

select is(
  (
    select should_generate
    from private.reserve_practice_generation(
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111132',
      '11111111-1111-1111-1111-111111111194',
      'explicit',
      repeat('d', 64),
      '{"topic":"Tópico novo do aluno A"}'::jsonb,
      'fixture-model',
      'practice-v1',
      'practice-schema-v1'
    )
  ),
  false,
  'a parallel request for the same topic does not open a second provider call'
);

select is(
  (
    select count(*)
    from public.practice_generation_runs
    where user_id = '11111111-1111-1111-1111-111111111111'
      and topic_id = '11111111-1111-1111-1111-111111111132'
  ),
  1::bigint,
  'only one active generation row exists for the topic'
);

select is(
  (
    select (public.submit_practice_attempt_internal(
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111161',
      '11111111-1111-1111-1111-111111111151',
      '11111111-1111-1111-1111-111111111181',
      '{"kind":"flashcard_recall","rating":"effortful"}'::jsonb,
      1200
    )->>'result')
  ),
  'effortful',
  'first flashcard attempt is evaluated by the private RPC'
);

select is(
  (
    select (public.submit_practice_attempt_internal(
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111161',
      '11111111-1111-1111-1111-111111111151',
      '11111111-1111-1111-1111-111111111181',
      '{"kind":"flashcard_recall","rating":"effortful"}'::jsonb,
      1200
    )->>'result')
  ),
  'effortful',
  'retry with the same client attempt id returns the prior result'
);

select is(
  (
    select count(*)
    from public.practice_attempts
    where user_id = '11111111-1111-1111-1111-111111111111'
      and client_attempt_id = '11111111-1111-1111-1111-111111111181'
  ),
  1::bigint,
  'retry did not insert a duplicate attempt'
);

select is(
  (
    select count(*)
    from public.flashcard_schedules
    where user_id = '11111111-1111-1111-1111-111111111111'
      and item_id = '11111111-1111-1111-1111-111111111151'
  ),
  1::bigint,
  'flashcard attempt creates one personal schedule'
);

select is(
  (
    select (public.submit_practice_attempt_internal(
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111162',
      '11111111-1111-1111-1111-111111111153',
      '11111111-1111-1111-1111-111111111182',
      '{"kind":"flashcard_recall","rating":"recalled"}'::jsonb,
      900
    )->>'result')
  ),
  'recalled',
  'manual flashcard attempt is recorded without changing the review schedule'
);

select is(
  (
    select count(*)
    from public.flashcard_schedules
    where user_id = '11111111-1111-1111-1111-111111111111'
      and item_id = '11111111-1111-1111-1111-111111111153'
  ),
  0::bigint,
  'manual flashcard attempt does not create a personal schedule'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select results_eq(
  $$select item_id from public.flashcard_schedules order by item_id$$,
  array['11111111-1111-1111-1111-111111111151'::uuid],
  'student A reads only their personal flashcard schedule'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

select is_empty(
  $$select item_id from public.flashcard_schedules where item_id = '11111111-1111-1111-1111-111111111151'$$,
  'student B cannot read student A flashcard schedule'
);

reset role;

select * from finish();
rollback;
