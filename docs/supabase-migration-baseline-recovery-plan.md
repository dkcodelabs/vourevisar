# Recuperação da baseline de migrations do Supabase

## Problema confirmado

O primeiro arquivo rastreado em `supabase/migrations/` é
`20250531112404_59404957-6137-417b-bf1f-a73d9251f470.sql`. Ele já altera
`public.subjects`, `public.topics`, `public.profiles`, `public.user_settings`
e `public.user_cycles`; as migrations que criaram esses objetos não existem no
Git. Portanto, `supabase start` e qualquer `db reset --local` do repositório
principal não são reproduzíveis.

O histórico remoto está alinhado por timestamps, mas isso não comprova que os
arquivos locais conseguem criar um banco vazio. A correção não é criar uma
tabela mínima antes do primeiro `ALTER TABLE`: há centenas de migrations e
funções que dependem da baseline inteira.

## Resultado desejado

- uma migration de snapshot de schema que inicie um banco local vazio;
- migrations futuras incrementais após o snapshot;
- histórico remoto coerente com os arquivos que ficam em
  `supabase/migrations/`;
- arquivos históricos preservados fora da pasta executável para auditoria;
- nenhum dado de aluno, segredo, bucket, cron ou configuração financeira
  copiado automaticamente para o ambiente local.

## Sequência segura

- [x] Confirmar a lacuna de source e bloquear o uso de `supabase start` no
  repositório principal.
- [x] Validar em ambiente temporário que um dump apenas de schema de
  `public,private` reconstrói as tabelas de prática e permite pgTAP. O dump
  não será versionado diretamente como solução final.
- [x] Inventariar statements de dados, cron, Storage, Vault e alterações em
  `auth` que o snapshot de schema não preserva. Fora de corpos de funções,
  existem nove migrations com DML: `email-assets` e `temporary_editais` devem
  virar configuração idempotente de Storage; `plan_configs` fica fora da
  baseline e terá fixture local não financeira; limpezas/backfills de
  `user_roles`, `user_cycles`, `billing_access_grants` e
  `user_ai_quota_resets` são upgrades históricos e não devem rodar em banco
  novo. Não há schedule de cron ou segredo de Vault a preservar.
- [x] Gerar, em uma cópia temporária, `schema_baseline.sql` do remoto já
  corrigido e aplicar os complementos necessários de `auth`/Storage. Nenhuma
  alteração é feita no projeto remoto nesta fase. A baseline tem migração
  prévia e posterior que revoga privilégios-padrão de
  `anon`/`authenticated`, restaura o trigger de onboarding e recria os buckets
  `email-assets` e `temporary_editais`. Ela iniciou e resetou em ambiente
  vazio; passou 22/22 em pgTAP e `db diff` não mostrou diferença em
  `public,private` contra o remoto.
- [x] Em uma cópia limpa, substituir a pasta executável por essa baseline,
  iniciar com `supabase start`, rodar `supabase db reset --local`, pgTAP,
  lint de banco e os testes de Edge Functions. Comparar o schema resultante
  com o remoto, ignorando somente dados e schemas gerenciados pela plataforma.
  A cópia limpa iniciou e resetou; os testes pgTAP passaram, `db lint --level
  error` não retornou erro, os nove testes Deno de contratos/seleção passaram
  e a comparação de `public,private` não retornou DDL pendente.
- [x] Revisar a troca de histórico com o usuário antes da operação remota. O
  checkpoint lógico de schema ficou em
  `/tmp/vourevisar-migrations-before-cutover.YY6HuZ`; a cadeia legada foi
  preservada em `supabase/migrations_legacy/` e a baseline executável passou
  a ficar em `supabase/migrations/`.
- [x] Executar a troca de histórico em janela controlada. Em 2026-08-27,
  `migration repair` marcou 204 timestamps legados como `reverted` e seis
  migrations de baseline como `applied`, sem executar o SQL dessas seis no
  banco remoto. A migration incremental
  `20260827110005_harden_future_default_privileges.sql` foi aplicada de fato
  para impedir que objetos futuros recebam privilégios amplos por padrão.
  `supabase migration list` e `supabase db push --dry-run` estão alinhados.
- [x] Iniciar o Supabase no repositório principal e validar o reset. Em
  2026-08-27, `supabase start` concluiu, `supabase db reset --local` recriou
  o banco com as sete migrations da baseline e
  `supabase test db --local supabase/tests/practice_rls.test.sql` passou
  22/22. Os avisos de `DROP ... IF EXISTS` e a ausência de `seed.sql` são
  estados idempotentes esperados, não falhas de bootstrap.

## Regras de segurança

- Nunca usar `supabase db reset --linked`: ele pode apagar objetos do projeto
  remoto.
- Nunca usar `supabase db pull` no repositório principal enquanto o histórico
  antigo permanecer aplicado: ele compara com uma cadeia não reproduzível e
  pode produzir uma migration enganosa.
- Não incluir dump de dados de produção em `seed.sql`.
- Não executar `migration repair` sem backup lógico somente de schema e sem a
  validação em cópia limpa concluída.
- O snapshot deve ser gerado depois de toda migration de segurança publicada;
  migrations novas posteriores serão incrementais e normais.

## Critérios de aceite

- [x] `supabase start` no repositório principal conclui sem intervenção
  manual;
- [x] `supabase db reset --local` executa novamente sem divergência;
- [x] `supabase migration list` não mostra timestamps faltantes nem extras;
- [x] `supabase test db --local supabase/tests/practice_rls.test.sql` passa;
- [x] uma migration nova após a baseline apareceu isoladamente no dry-run e
  foi aplicada pelo fluxo normal (`20260827110005`).
