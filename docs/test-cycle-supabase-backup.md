# Backup temporario: teste de insights do ciclo

Data: 2026-06-09

Usuario: `vourevisar@gmail.com`
User id: `6b605772-c733-489b-ab8f-9342c7852bc6`
User cycle id: `7337f8ae-9ac7-416f-b9b7-b60271ea11fa`

## Estado original antes do cenario TESTE INSIGHTS

```sql
update public.user_cycles
set
  ciclo_atual = array[
    '1da3d2c6-2f85-4488-9400-7329b0f73333',
    '03742302-dd58-45f0-9770-43171f28e30e',
    '57e17bc0-2195-4d7a-95e3-75db5429fd1d',
    '11f7bd99-0fcf-4906-8e2e-8bcf0e395615',
    '7b7dde64-92fc-42e6-964a-4e1dffe50414',
    '9b0b8991-dc06-416a-92f9-f1fa0e6cf8a3'
  ]::text[],
  disciplinas_do_dia = '{}'::text[],
  ciclos_realizados = 0,
  data_inicio_ciclo = '2026-06-09T19:11:44.515532+00:00',
  data_fim_ciclo = null,
  atualizado_em = '2026-06-09T19:11:44.515532+00:00',
  materias_pendentes = '{}'::text[],
  skipped_subjects = '{}'::text[],
  indice_atual = 0,
  materias_estudadas_ciclo = '{}'::text[],
  materias_por_dia = 2,
  materias_estudadas_hoje = '{}'::text[],
  data_ultimo_reset = '2026-06-09',
  streak_dias_consecutivos = 0,
  status = 'active',
  name = null,
  unification_map = null
where id = '7337f8ae-9ac7-416f-b9b7-b60271ea11fa'
  and user_id = '6b605772-c733-489b-ab8f-9342c7852bc6';
```

## Limpeza do cenario de teste

Todos os registros criados para teste usam o prefixo `TESTE INSIGHTS - NAO USAR`.

```sql
delete from public.cycle_study_events
where user_id = '6b605772-c733-489b-ab8f-9342c7852bc6'
  and metadata->>'test_scenario' = 'study-cycle-insights';

delete from public.cycle_rotation_snapshots
where user_id = '6b605772-c733-489b-ab8f-9342c7852bc6'
  and (per_subject::text like '%TESTE INSIGHTS - NAO USAR%' or edital_ids::text like '%TESTE_INSIGHTS%');

delete from public.user_editais
where user_id = '6b605772-c733-489b-ab8f-9342c7852bc6'
  and name like 'TESTE INSIGHTS - NAO USAR%';

delete from public.subjects
where user_id = '6b605772-c733-489b-ab8f-9342c7852bc6'
  and name like 'TESTE INSIGHTS - NAO USAR%';
```
