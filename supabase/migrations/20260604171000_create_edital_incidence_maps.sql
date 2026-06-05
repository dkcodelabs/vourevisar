create table if not exists public.edital_incidence_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  edital_id uuid not null references public.user_editais(id) on delete cascade,
  user_cycle_id uuid references public.user_cycles(id) on delete set null,
  status text not null default 'nao_iniciado'
    check (status in ('nao_iniciado', 'em_fila', 'processando', 'concluido_parcial', 'concluido', 'erro')),
  total_topics integer not null default 0 check (total_topics >= 0),
  with_signal_count integer not null default 0 check (with_signal_count >= 0),
  no_signal_count integer not null default 0 check (no_signal_count >= 0),
  catalog_count integer not null default 0 check (catalog_count >= 0),
  ai_count integer not null default 0 check (ai_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  pending_count integer not null default 0 check (pending_count >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  last_processed_at timestamptz,
  last_error text,
  notification_sent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, edital_id)
);

create index if not exists edital_incidence_maps_user_status_idx
  on public.edital_incidence_maps (user_id, status, updated_at desc);

create index if not exists edital_incidence_maps_edital_idx
  on public.edital_incidence_maps (edital_id);

alter table public.edital_incidence_maps enable row level security;

drop policy if exists "Users can read own edital incidence maps" on public.edital_incidence_maps;
create policy "Users can read own edital incidence maps"
  on public.edital_incidence_maps
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create own edital incidence maps" on public.edital_incidence_maps;
create policy "Users can create own edital incidence maps"
  on public.edital_incidence_maps
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own edital incidence maps" on public.edital_incidence_maps;
create policy "Users can update own edital incidence maps"
  on public.edital_incidence_maps
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on public.edital_incidence_maps to authenticated;

comment on table public.edital_incidence_maps is
  'Status e resumo do mapa de cobranca/sinal bruto por edital do aluno. O catalogo global de sinais permanece em topic_incidence_catalog.';

comment on column public.edital_incidence_maps.status is
  'Status do processamento do mapa: nao_iniciado, em_fila, processando, concluido_parcial, concluido ou erro.';
