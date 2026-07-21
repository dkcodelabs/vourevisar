create table if not exists public.email_confirmation_attempts (
  attempt_id uuid primary key,
  status text not null default 'pending' check (status in ('pending', 'confirmed')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists email_confirmation_attempts_created_at_idx
  on public.email_confirmation_attempts (created_at);

alter table public.email_confirmation_attempts enable row level security;

revoke all on table public.email_confirmation_attempts from anon, authenticated;
