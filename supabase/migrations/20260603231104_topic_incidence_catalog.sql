create table if not exists public.topic_incidence_catalog (
  id uuid primary key default gen_random_uuid(),
  context_hash text not null unique,
  topic_key text not null,
  topic_name text not null,
  subject_key text not null,
  subject_name text not null,
  exam_board_key text,
  exam_board_name text,
  career_key text,
  career_name text,
  organization_key text,
  organization_name text,
  total_volume integer not null default 0 check (total_volume >= 0),
  importance_score smallint check (importance_score between 1 and 5),
  source text not null default 'ai' check (source in ('ai', 'manual', 'admin')),
  confidence_status text not null default 'auto' check (confidence_status in ('auto', 'approved', 'needs_review', 'rejected')),
  search_context text,
  winner_query text,
  audit_log jsonb not null default '{}'::jsonb,
  analysis_metadata jsonb not null default '{}'::jsonb,
  sample_count integer not null default 1 check (sample_count >= 1),
  last_analyzed_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists topic_incidence_catalog_topic_subject_idx
  on public.topic_incidence_catalog (topic_key, subject_key);

create index if not exists topic_incidence_catalog_context_idx
  on public.topic_incidence_catalog (subject_key, exam_board_key, career_key, organization_key);

alter table public.topics
  add column if not exists incidence_catalog_id uuid references public.topic_incidence_catalog(id) on delete set null,
  add column if not exists incidence_source text check (incidence_source in ('ai', 'catalog', 'manual')),
  add column if not exists incidence_applied_at timestamptz,
  add column if not exists incidence_context jsonb not null default '{}'::jsonb;

alter table public.topic_incidence_catalog enable row level security;

drop policy if exists "Authenticated users can read topic incidence catalog" on public.topic_incidence_catalog;
create policy "Authenticated users can read topic incidence catalog"
  on public.topic_incidence_catalog
  for select
  to authenticated
  using (confidence_status in ('auto', 'approved'));

drop policy if exists "Authenticated users can insert own topic incidence catalog rows" on public.topic_incidence_catalog;
create policy "Authenticated users can insert own topic incidence catalog rows"
  on public.topic_incidence_catalog
  for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "Authenticated users can update own topic incidence catalog rows" on public.topic_incidence_catalog;
create policy "Authenticated users can update own topic incidence catalog rows"
  on public.topic_incidence_catalog
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

grant select, insert, update on public.topic_incidence_catalog to authenticated;

comment on table public.topic_incidence_catalog is
  'Catalogo compartilhado de incidencia/cobranca de topicos normalizados para reaproveitar analises antes de chamar IA.';

comment on column public.topics.incidence_catalog_id is
  'Referencia ao catalogo quando o volume do topico foi preenchido por reaproveitamento.';

comment on column public.topics.incidence_source is
  'Origem do valor atual de incidencia do topico: ai, catalog ou manual.';
