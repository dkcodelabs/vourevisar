create table if not exists public.cycle_study_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_cycle_id uuid references public.user_cycles(id) on delete set null,
  cycle_number integer not null default 1 check (cycle_number >= 1),
  event_type text not null check (
    event_type in (
      'topic_started',
      'topic_continued',
      'subject_marked_studied',
      'subject_returned_to_queue',
      'cycle_reordered'
    )
  ),
  subject_id uuid references public.subjects(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  edital_id uuid,
  subject_position integer check (subject_position is null or subject_position >= 1),
  cycle_order_snapshot text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_cycle_study_events_user_created
  on public.cycle_study_events(user_id, created_at desc);

create index if not exists idx_cycle_study_events_cycle_created
  on public.cycle_study_events(user_cycle_id, created_at desc);

create index if not exists idx_cycle_study_events_subject_created
  on public.cycle_study_events(subject_id, created_at desc);

create index if not exists idx_cycle_study_events_topic_created
  on public.cycle_study_events(topic_id, created_at desc);

alter table public.cycle_study_events enable row level security;

create policy "Users can view own cycle study events"
  on public.cycle_study_events
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own cycle study events"
  on public.cycle_study_events
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own cycle study events"
  on public.cycle_study_events
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own cycle study events"
  on public.cycle_study_events
  for delete
  using (auth.uid() = user_id);

comment on table public.cycle_study_events is
  'Eventos reais do uso da fila do ciclo: topico iniciado, continuado, materia marcada, materia devolvida e reordenacao.';
comment on column public.cycle_study_events.event_type is
  'Tipo do evento de ciclo/fila.';
comment on column public.cycle_study_events.subject_position is
  'Posicao da materia na fila no momento do evento, com base em user_cycles.ciclo_atual.';
comment on column public.cycle_study_events.cycle_order_snapshot is
  'Snapshot da ordem da fila no momento do evento.';
comment on column public.cycle_study_events.metadata is
  'Contexto adicional do evento, sem substituir dados canonicos de topics/topic_review_history.';
