alter table public.public_editais
  add column if not exists exam_board text;

alter table public.user_editais
  add column if not exists exam_board text;

comment on column public.public_editais.exam_board is 'Banca organizadora do edital oficial, when informada ou identificada pela IA.';
comment on column public.user_editais.exam_board is 'Banca organizadora copiada do catálogo ou informada no edital do aluno.';;
