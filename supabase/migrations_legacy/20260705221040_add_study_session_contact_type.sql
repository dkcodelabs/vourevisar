-- Classify new sessions without inventing semantics for historical rows.
alter table public.study_sessions
  add column if not exists contact_type text not null default 'unclassified';

alter table public.study_sessions
  drop constraint if exists study_sessions_contact_type_check;

alter table public.study_sessions
  add constraint study_sessions_contact_type_check
  check (
    contact_type in (
      'first_contact',
      'review',
      'continuation',
      'mixed',
      'subject_session',
      'unclassified'
    )
  );

comment on column public.study_sessions.contact_type is
  'Nature of the recorded session. Historical rows remain unclassified unless the writer provided a reliable type.';
