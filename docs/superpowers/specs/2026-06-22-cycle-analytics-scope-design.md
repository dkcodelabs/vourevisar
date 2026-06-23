# Design: Escopo Real das Metricas do Ciclo, Painel e Revisoes

## Problema

As telas de Ciclo, Painel e Revisoes ainda aceitam misturar historico global do usuario com o edital atualmente carregado no ciclo. Isso produz tres erros de produto:

1. atividade antiga aparece como se pertencesse ao ciclo atual;
2. topicos sem dificuldade marcada entram como `medio`;
3. componentes diferentes calculam o mesmo conceito com filtros diferentes e geram numeros conflitantes.

Esse comportamento e inaceitavel porque fabrica progresso e induz decisao errada do aluno.

## Objetivo

Toda metrica contextual ao ciclo deve refletir apenas o recorte ativo do ciclo naquele momento. Se nao houver dado real dentro desse recorte, a interface deve mostrar estado vazio honesto.

## Principios

- Nenhuma tela contextual ao ciclo pode usar historico global por padrao.
- `topics.difficulty_level` ausente ou invalido nao pode virar `medio` automaticamente.
- O recorte canonico do ciclo deve partir do que esta ativo em `user_cycles.ciclo_atual` e dos topicos ativos ligados a essas materias.
- `cycle_id` sozinho nao e fonte suficiente de verdade, porque o mesmo ciclo pode receber outro edital carregado depois.
- Dados legados sem `cycle_id`/`edital_id` continuam existindo no banco, mas nao entram nas metricas do ciclo atual sem correspondencia explicita com topicos ativos.

## Abordagens consideradas

### 1. Filtrar apenas por `cycle_id`

Implementacao pequena, mas errada para este produto. O fluxo atual reaproveita a mesma linha de `user_cycles` quando o usuario substitui o edital do ciclo, entao o mesmo `cycle_id` pode conter historico de contextos diferentes.

### 2. Filtrar por `edital_id`

Melhora em relacao ao `cycle_id`, mas ainda nao resolve tudo. Historicos antigos podem ter `edital_id` nulo, topicos mesclados podem sobreviver a trocas e algumas consultas de painel/revisoes operam por topico, nao por edital puro.

### 3. Recomendado: recorte canonico por topicos ativos do ciclo

Usar os IDs dos topicos ativos pertencentes as materias presentes em `user_cycles.ciclo_atual` como filtro principal das metricas do ciclo. `cycle_id` e `edital_id` entram como contexto auxiliar quando disponiveis, mas o filtro determinante e o conjunto de topicos ativos do ciclo atual.

Essa abordagem preserva historico antigo no banco, bloqueia vazamento para telas contextuais e continua compativel com dados legados sem apagar nada.

## Desenho aprovado para implementacao

### 1. Fonte unica de escopo

Criar uma camada compartilhada de escopo analitico do ciclo, responsavel por expor:

- `activeCycleId`
- `activeSubjectIds`
- `activeTopicIds`
- `activeEditalIds`
- `hasScopedData`

Essa camada nao calcula metricas; ela apenas define o recorte confiavel para outras consultas.

### 2. Regras de consulta

Consultas contextuais do Painel, Ciclo e Revisoes devem obedecer:

- historico de revisao: filtrar por `topic_id in activeTopicIds`;
- sessoes/estatisticas de estudo do ciclo: nunca usar agregado global sem recorte das materias/topicos ativos;
- cache TanStack Query: incluir identificadores do escopo ativo na query key;
- sem `activeTopicIds`: retornar estado vazio honesto e nao reaproveitar resumo antigo de outro ciclo.

### 3. Regra de dificuldade

`difficulty_level` ausente, nulo, vazio ou invalido deve mapear para `null`, nunca para `medio`.

Consequencia visual:

- `Mapa de dificuldade` mostra apenas topicos efetivamente classificados;
- se nenhum topico foi classificado, a distribuicao fica vazia e a interface explica que ainda nao ha marcacoes suficientes.

### 4. Superficies afetadas na primeira rodada

- Painel: `Sua trajetoria` e `Consistencia recente`
- Revisoes: `Tendencia de estudos` e `Engajamento semanal`
- Ciclo/Painel: calculos que usam historico de revisao ou sessoes para ritmo contextual

### 5. Estados vazios obrigatorios

- ciclo sem topicos ativos;
- ciclo com topicos ativos mas sem historico no recorte;
- topicos sem dificuldade marcada;
- historico legado existente fora do recorte atual.

Em todos esses casos a UI deve permanecer informativa, sem porcentagens falsas e sem listas antigas.

## Impacto em arquitetura

- Evitar duplicar filtros dentro de paginas/componentes.
- Centralizar a definicao de escopo reduz divergencia entre Painel, Ciclo e Revisoes.
- O filtro por topicos ativos protege contra troca de edital no mesmo ciclo sem exigir limpeza destrutiva do historico.

## Estrategia de testes

- teste unitario para garantir que dificuldade ausente nao entra como `medio`;
- teste unitario para o helper de escopo analitico do ciclo;
- testes focados nas consultas/modelos do Painel e Revisoes para garantir que apenas `activeTopicIds` entram nos agregados;
- verificacao final com build e, se a sessao autenticada estiver disponivel, QA visual das telas afetadas.

## Fora de escopo desta rodada

- apagar ou migrar historico legado;
- redefinir semantica de historico global do usuario;
- reescrever a pagina inteira de Revisoes ou Subjects;
- alterar RLS ou criar nova migration sem necessidade comprovada.
