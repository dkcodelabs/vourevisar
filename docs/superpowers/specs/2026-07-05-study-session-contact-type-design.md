# Classificacao de sessoes de estudo

## Problema

`study_sessions` registra tempo, materia e topicos, mas novas linhas nao informam se a sessao representa primeiro contato, revisao, continuacao ou uma sessao agregada da materia. Inferir isso depois por horario e joins com historico e fragil.

## Decisao

- Adicionar `contact_type text not null default 'unclassified'` em `study_sessions`.
- Restringir valores por `CHECK`: `first_contact`, `review`, `continuation`, `mixed`, `subject_session` e `unclassified`.
- Preservar linhas historicas como `unclassified`; nao executar backfill especulativo.
- Classificar sessoes de topico a partir do estado anterior do topico: sem contato previo vira `first_contact`; com contato previo vira `review`.
- Sessoes com varios topicos ficam `mixed`; sessoes gerais de materia ficam `subject_session`.
- `topic_review_history` continua sendo a fonte do programa SRS. `cycle_study_events` continua sendo a fonte de comportamento e posicao no ciclo. O novo campo descreve apenas a natureza da linha de sessao.

## Seguranca e compatibilidade

A migration e aditiva e usa default conservador, portanto clientes antigos continuam inserindo linhas validas. O RLS existente de `study_sessions` permanece por `user_id`; nenhuma policy, role ou grant sera ampliada.

## Verificacao

- Teste estrutural da migration e da restricao de valores.
- Teste unitario da classificacao de contato.
- Teste do payload persistido pelo hook central.
- Types regenerados a partir do projeto linked.
- Consulta de schema, RLS e distribuicao de valores depois do deploy.
