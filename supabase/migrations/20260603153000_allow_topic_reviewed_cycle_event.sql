do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.cycle_study_events'::regclass
      and conname = 'cycle_study_events_event_type_check'
  ) then
    alter table public.cycle_study_events
      drop constraint cycle_study_events_event_type_check;
  end if;
end $$;

alter table public.cycle_study_events
  add constraint cycle_study_events_event_type_check
  check (
    event_type in (
      'topic_started',
      'topic_reviewed',
      'topic_continued',
      'subject_marked_studied',
      'subject_returned_to_queue',
      'cycle_reordered'
    )
  );

comment on table public.cycle_study_events is
  'Eventos reais do uso da fila do ciclo: topico iniciado, topico revisado, materia marcada, materia devolvida e reordenacao.';
