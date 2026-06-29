alter table public.user_cycles
  add column if not exists exam_date date;

comment on column public.user_cycles.exam_date is
  'Data da prova que rege o ciclo de estudos ativo. Em ciclos compostos por mesclagem, deve ser escolhida pelo aluno.';

update public.user_cycles uc
set exam_date = ue.exam_date
from public.user_editais ue
where uc.exam_date is null
  and ue.user_id = uc.user_id
  and ue.merged_into_cycle = true
  and ue.exam_date is not null
  and (
    select count(*)
    from public.user_editais active_ue
    where active_ue.user_id = uc.user_id
      and active_ue.merged_into_cycle = true
  ) = 1;
