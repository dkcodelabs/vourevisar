-- Backfill de telemetria para Gemini 2.5 Flash usando a tabela Standard paga
-- publicada pelo Google e conferida em 2026-08-29:
-- US$ 0,30 / 1M tokens de entrada e US$ 2,50 / 1M tokens de saída.
-- `total_tokens - input_tokens` inclui saída visível e tokens de raciocínio.
update public.practice_generation_runs
set
  output_tokens = greatest(
    coalesce(output_tokens, 0),
    coalesce(total_tokens, 0) - coalesce(input_tokens, 0)
  ),
  estimated_cost = round((
    coalesce(input_tokens, 0)::numeric * 0.30 +
    greatest(
      coalesce(output_tokens, 0),
      coalesce(total_tokens, 0) - coalesce(input_tokens, 0)
    )::numeric * 2.50
  ) / 1000000, 6),
  updated_at = now()
where model_id in ('gemini-2.5-flash', 'models/gemini-2.5-flash')
  and status = 'succeeded'
  and total_tokens is not null
  and input_tokens is not null
  and (
    estimated_cost is null
    or output_tokens is null
    or output_tokens < total_tokens - input_tokens
  );
