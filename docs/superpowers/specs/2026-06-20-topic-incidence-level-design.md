# Nivel de cobranca persistido por topico

## Objetivo

Persistir em `topics` a nota normalizada e a faixa de cobranca para que modal, filtros e metricas usem o mesmo dado, sem interpretar volume bruto ou depender de JSON.

## Modelo de dados

- `incidence_score smallint`: nota de 1 a 5.
- `incidence_level text`: `low`, `medium` ou `high`.
- `total_volume` continua representando apenas o sinal bruto da busca.
- `incidence_context` continua guardando percentil, confianca, escopo e auditoria.
- Restricoes do banco impedem notas e niveis invalidos.

## Regra

A normalizacao existente da pagina `/admin/importancia-prova` continua sendo a fonte: o worker compara topicos ativos com sinal dentro da mesma materia. Scores 1-2 viram `low`, 3 vira `medium` e 4-5 viram `high`.

## Fluxo

O worker salva score, nivel e contexto ao concluir a normalizacao da materia, tanto para resultado de IA quanto para catalogo. Uma migracao faz backfill dos topicos ativos ja processados usando a mesma regra de percentil por materia, sem novas buscas externas.

O frontend carrega os novos campos pelo transformer global. O modal do edital exibe apenas `Cobranca baixa`, `Cobranca media` ou `Cobranca alta` quando `incidence_level` for valido; sem nivel, nao mostra indicador.

## Verificacao

- Teste unitario da conversao score/level e do rotulo exibido.
- Teste do backfill por consulta SQL no Supabase.
- Testes, lint e build do frontend.
- Deploy explicito de `process-topic-incidence` apos a alteracao.
