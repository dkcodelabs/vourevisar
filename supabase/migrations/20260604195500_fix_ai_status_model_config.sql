alter table public.ai_status
  add column if not exists model_name text;

update public.system_settings
set value = jsonb_set(
  coalesce(value, '{}'::jsonb),
  '{model}',
  '"gemini-2.5-flash"',
  true
)
where key = 'ai_edital_config'
  and coalesce(value->>'model', '') in (
    '',
    'gemini-3.1-flash-lite-preview',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest'
  );

comment on column public.ai_status.model_name is
  'Nome do modelo retornado pelo ai-handler no ultimo check de status.';
