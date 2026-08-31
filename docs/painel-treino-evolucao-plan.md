# Plano vivo: Painel, Treino e Evolução

## Objetivo e regra de execução

Plano corrigido aprovado pelo usuário em 2026-08-28. Executar etapa por etapa,
página por página, sem misturar mudanças visuais com regras de estudo ou dados.
Nenhuma etapa é concluída apenas por compilar: registrar evidências e limitações.

Antes de cada recorte, responder:

1. Qual problema do aluno exige esta alteração?
2. O que muda se fizermos? O que permanece ruim se não fizermos?
3. Quais telas, contratos, queries e efeitos dependem desse comportamento?
4. Que informação ou ação pode desaparecer? Qual é seu destino?
5. Como comprovar a ausência de regressão no recorte e desfazer apenas o diff dele?

Preservar alterações locais de outros trabalhos. Não publicar, alterar banco ou
regras de revisão como efeito colateral deste plano. Mudanças sensíveis exigem
checkpoint local antes de editar. Não iniciar a próxima página enquanto a etapa
atual tiver validação obrigatória pendente.

## Planos relacionados

- [Ciclo, Painel e Evolução](study-cycle-strategic-page-plan.md): domínio,
  prioridade, maturidade, escopo ativo e histórico das entregas.
- [Prática adaptativa](superpowers/plans/2026-08-25-flashcards-questoes-pontos-cegos.md):
  fila diária, treino livre, geração explícita e agendas individuais.
- [Painel de decisão original](superpowers/specs/2026-06-18-dashboard-decisao-aluno-design.md):
  justificativas, contexto do concurso e ordem salva do ciclo.

Este plano atualiza a distribuição de informação; não invalida os contratos de
domínio dos planos anteriores. O histórico de entregas anteriores permanece intacto.

## Responsabilidades

| Página | Responsabilidade | Limite |
| --- | --- | --- |
| Painel | Indicar a próxima ação e encaminhar com contexto | Não criar nova agenda nem reordenar o ciclo |
| Ciclo | Organizar sequência e consultar o edital | Respeitar a fila salva e as regras de estudo |
| Revisões | Executar e registrar revisões de tópicos | Não confundir revisão do tópico com tentativa de prática |
| Treino | Praticar questões e flashcards | Reutilizar material pronto; IA só por ação explícita |
| Evolução | Analisar progresso, atividade e dificuldades | Não apresentar classificação como retenção medida |

## Contratos que não podem mudar implicitamente

- Escopo: ciclo ativo e seus tópicos/matérias visíveis, respeitando merges.
- Cobertura: tópicos iniciados / total. Consolidação: programa de revisões
  concluído / total, sem promessa de domínio ou aprovação.
- Aprendendo/Fixando/Dominando: classificação do motor adaptativo atual,
  sem percentual de retenção medido e sem chamar o motor de FSRS.
- Peso do edital, incidência do tópico e dificuldade percebida são sinais
  distintos. O mapa atual usa incidência, não um percentual derivado de GUT.
- Informar denominadores e ausência de avaliação/classificação. Ausência não é zero.
- Tempo total: `study_sessions.session_duration_minutes`. Não somar a duração
  de `topic_review_history`, que pode registrar o mesmo contato.
- O detalhe diário do Painel usa `topic_review_history` e não tem substituto
  completo no gráfico de horas da Evolução. Preservar essa capacidade antes de remover.
- O seletor temporal afeta atividade/tempo e comparações; progresso, pendências
  e maturidade são a situação atual. Histórico de cobertura requer contrato próprio.
- Prática não conclui automaticamente a revisão do tópico. Somente a fila diária
  de flashcards reprograma a agenda individual conforme o contrato vigente.
- Nunca apresentar erro de consulta como ciclo vazio ou prática em dia.
- Navegar não inicia cronômetro nem grava progresso implicitamente.

## Fase 0 — contratos e base de segurança

- [x] Conferir código real, planos relacionados e alterações locais existentes.
- [x] Registrar responsabilidades e diferenças entre gráficos/fontes de dados.
- [x] Levantar a base inicial do recorte: 35 testes do Painel/regras passando;
  `typecheck` global com falhas anteriores em importação, Ciclo, Revisões e Treino.
- [x] Resolver as falhas globais de tipos em recorte próprio antes de declarar o
  repositório inteiro validado. Concluído em 2026-08-29 com `npm run typecheck`,
  lint, testes focados e build passando, sem corrigir arquivos alheios incidentalmente.
- [x] Reconciliar testes que ainda leem SQL em `supabase/migrations/` após o
  arquivamento em `migrations_legacy/`, seguindo o
  [plano da baseline](supabase-migration-baseline-recovery-plan.md). Os testes
  de auditoria agora leem o histórico preservado; nenhuma migration foi copiada
  de volta à pasta executável nem houve alteração no banco. `npm run test:run`
  passou com 197 arquivos e 814 testes em 2026-08-29.

## Fase 1 — Painel

### 1A. Melhor próxima ação — primeiro recorte

Necessidade: o card repete status, mantém explicação extensa sempre aberta e pode
exibir dois botões com o mesmo destino. Não alterar mantém ruído na decisão.

Impacto esperado: leitura mais curta e tópico legível, sem mudar ação recomendada,
prioridade, URLs, agenda, dados ou consultas. Risco: esconder motivo útil, perder
ação secundária distinta ou comprimir nomes/controles. Cobrir esses casos.

Limites: extrair componente de apresentação; a página/hook continuam fornecendo
o modelo e o callback. Não introduzir consulta, mutation, contexto ou dependência.

- [x] Extrair o card de `DashboardDecisionExperience.tsx`, preservando a identidade
  azul, matéria/tópico e motivo principal visível.
- [x] Deixar explicação complementar acessível por disclosure Radix/shadcn;
  omitir explicação vazia/igual ao motivo e reiniciar disclosure ao trocar ação.
- [x] Mostrar ação secundária apenas quando o destino for diferente do principal.
- [x] Preservar destinos existentes e ações de configuração/estado em dia.
- [x] Testar interação, troca de recomendação, destinos iguais/distintos, ausência
  de tópico e preservação dos demais blocos do Painel.
- [x] Validar visualmente o componente isolado em desktop/tablet/mobile,
  claro/escuro, nomes longos, foco visível e abertura/fechamento por clique.
- [x] Confirmar acionamento por Enter/Espaço. Em 2026-08-29, o problema foi
  reproduzido no shell autenticado: o foco chegava ao botão, mas o disclosure
  não alternava. O trigger agora trata apenas essas duas teclas, cancela a ação
  nativa inconsistente e delega ao mesmo clique do Radix. Enter abre e Espaço
  fecha no navegador real, com cobertura focada.
- [x] Validar o card no Painel autenticado e sua navegação sem gravar progresso.
  `Revisar agora` abriu o tópico real em Revisões; nenhuma ação de estudo foi
  iniciada.

### 1B. Navegação contextual

Recorte iniciado em 2026-08-28 após o usuário pedir continuidade. A validação
autenticada de 1A ainda está pendente na ferramenta; não avançar para outra página.
O Ciclo já recebe `focusSubjectId`/`focusTopicId`: reutilizar esse contrato tanto
no card quanto na fila, sem novos efeitos de estudo, queries ou escrita em banco.
Alvo removido do escopo atual deve produzir aviso e não focar outro tópico.
Se não alterarmos, o botão continuará abrindo apenas a página genérica.
Checkpoint dos arquivos deste recorte: `/tmp/vourevisar-painel-step1b/before`.

- [x] Corrigir o espaço vazio mostrado na captura: card de próxima ação com
  altura intrínseca e botão próximo ao motivo, sem esticar até a altura da fila.
- [x] Fazer ações de Ciclo transportarem matéria/tópico pelo contrato já usado
  por `useCycleTopicFocus`; definir rótulo honesto quando a ação apenas abre o tópico.
- [x] Testar resolver de navegação: preservar URLs de Revisões/configuração,
  resolver matéria após merge e recusar tópico removido/ciclo indisponível.
- [x] Testar integração do card com a rota real do Ciclo: expandir/focar tópico
  e voltar ao Painel, sem chamar ações de estudo, revisão ou cronômetro.
- [x] Validar a troca real de ciclo na sessão autenticada. Em 2026-08-30, a
  sessão autenticada substituiu o ciclo PCDF pelo edital IDCAP (6 matérias,
  103 tópicos) em Meus Editais, confirmou o ciclo gerado e refletiu o novo
  escopo em Ciclo de Estudos, Painel e Revisões. Nenhuma sessão de estudo,
  revisão ou cronômetro foi iniciada; console sem erros/avisos.

### 1C. Hierarquia restante e transição dos gráficos

Recorte atual: legibilidade da fila, sem reorganizar dados ou remover gráficos.
O fundo da fila é sempre escuro, mas os rótulos usavam tokens globais de texto
colorido e opacidade no bloco inteiro. Isso prejudica a leitura nos dois temas.
Usar texto claro local à superfície, manter faixas/ícones e os mesmos destinos.
`Ver todas` deve dizer `Ver revisões`, pois não existe página com a fila completa.
Extrair o bloco de apresentação antes de expandi-lo; nenhum novo hook ou query.
Não corrigir mantém rótulos difíceis de ler e um atalho com destino ambíguo.
Riscos: perder contraste nos estados vazios, alterar a prioridade por acidente
ou deixar destinos/alvos para trás na extração. Cobrir todos com testes.
Checkpoint: `/tmp/vourevisar-painel-step1c/before/`.

- [x] Extrair fila de prioridade preservando contagens, ordem, ações e alvos.
- [x] Nomear o atalho conforme seu destino real: `Ver revisões`.
- [x] Corrigir contraste dos rótulos coloridos da fila sobre fundo escuro,
  especialmente atrasadas e tema claro. Problema observado na composição
  completa durante a validação de 1B; não alterar sem verificar ambos os temas.
- [x] Corrigir o contraste do indicador de atrasos no cabeçalho sem alterar os
  tokens globais compartilhados pelos anéis de dificuldade.
- [x] Continuar extraindo blocos conforme os próximos recortes. Após a retirada
  funcionalmente equivalente dos gráficos no Recorte 2D, a composição ficou
  com 380 linhas e a página com 57, sem concentrar nova lógica de domínio.
- [x] Compactar o progresso no mobile/tablet mantendo percentual, quatro
  contagens e acesso ao Ciclo, sem duplicar componentes por tamanho de tela.
- [x] Priorizar ação principal na primeira tela mobile, com progresso compacto,
  fila concreta sem repetição desnecessária e lembretes secundários.
  Recorte mobile iniciado: reduzir o progresso antes da ação sem mudar ordem
  visual/DOM, criar cópias responsivas ou esconder contagens. Extrair componente
  visual com os dados já calculados; manter percentual de tópicos iniciados,
  não confundir com conclusão. Desktop mantém o resumo lateral. Testar nomes
  longos, 0%/100%, contagens e atalho. Sem alteração, o CTA continua mais abaixo
  que o necessário. Checkpoint: `/tmp/vourevisar-painel-mobile/before/`.
- [x] Preservar sinal curto de ritmo até a prova quando calculável; detalhes e
  fórmulas ficam sob demanda. Sem data/base, usar estado honesto.
  Recorte iniciado: extrair painel de ritmo e mover gráficos/base do cálculo
  para disclosure local, mantendo meta e média recente visíveis. Datas ausentes
  ou vencidas mantêm explicação e configuração visíveis. Nenhuma fórmula ou
  fonte de dados muda; a média existente é extraída para util puro e testada.
  Não alterar mantém dois gráficos altos e explicação repetida no resumo.
  Riscos: esconder configuração, confundir ausência de histórico com ritmo
  baixo e perder o detalhe diário. Testar esses casos e abertura sem navegação.
  Checkpoint: `/tmp/vourevisar-painel-pace/before/`.
- [x] Definir destino do detalhe diário antes de retirar `StudyTrajectoryCard`
  ou `StudyConsistencyCard`: `/estatisticas?date=AAAA-MM-DD` agora abre o dia
  correspondente na Evolução. Os sinais estratégicos continuam pendentes e a
  remoção dos gráficos ainda depende da equivalência restante da Fase 2.
- [x] Ao remover blocos, auditar consumidores dos cálculos/queries e retirar só
  o que não tiver mais uso. O Recorte 2D preservou progresso e ritmo operacional,
  moveu análise para Evolução e reduziu a consulta do Painel à janela necessária.
- [x] Tratar erros parciais locais de atividade e lembretes no modelo do Painel,
  sem inventar zero, vazio ou ausência de histórico; permitir retry por fonte.
  Auditoria iniciada: Revisões já expõe erro global. As queries locais de
  atividade e lembretes lançam erro corretamente, mas o modelo descarta ambos
  e aplica defaults vazios. Corrigir essas duas fontes com aviso/retry local;
  preservar dados anteriores marcando-os como não atualizados. Ritmo não pode
  interpretar atividade indisponível como ausência de histórico. Ciclo e origens
  de edital ainda capturam/logam falhas sem contrato de erro; registrar em recorte
  próprio, pois alterar esses hooks afeta outras páginas. Checkpoint:
  `/tmp/vourevisar-painel-partial-errors/before/`.
- [x] Expor falhas de ciclo e origens de edital por contrato nos hooks
  compartilhados e tratá-las como críticas no Painel. Os retornos anteriores
  foram preservados; `error` e retry são aditivos para não quebrar consumidores.

## Fase 2 — Evolução

- [x] Separar situação atual de atividade no período, inclusive horas por matéria.
  O período já usa `study_sessions`; o recorte diário agora mostra o mesmo total
  e sua distribuição por matéria.
- [x] Centralizar horas na fonte canônica, preservando acesso ao detalhe diário
  sem somar novamente o tempo de revisões. `topic_review_history` aparece apenas
  como lista contextual de contatos e nunca entra no total do cronômetro.
- [x] Avaliar dificuldade/incidência na lista de matérias, com base analisada e
  acesso aos tópicos; não transferir mapas circulares automaticamente.
- [x] Preservar um diagnóstico explicável, sem criar outra fila operacional.
  Dificuldade e cobrança aparecem como contexto por matéria, com suas fontes e
  coberturas explícitas; a recomendação singular existente não foi duplicada.
- [x] Verificar estados sem histórico, dados parciais, período sem base anterior,
  ciclo combinado, tópicos ocultos/mesclados e cache após ações em outras rotas.
- [x] Somente após a equivalência funcional validada, retirar os gráficos do Painel
  e verificar ambas as páginas. Registrar explicitamente decisões de descontinuação.

## Fase 3 — Treino e conexão entre páginas

- [x] Fechar os gates de lançamento do Treino. Fluxo diário/manual, geração,
  qualidade/custo inicial e conclusão foram validados em 2026-08-29; a troca
  real de escopo também foi verificada no uso autenticado. A amostra de adoção
  não bloqueia a venda: será acompanhada com usuários reais após o lançamento.
  Em 2026-08-31 havia 3 usuários, 29 sessões, 14 sessões com tentativa, 6
  conclusões e 1 usuário ativo em dois ou mais dias.
- [x] Preservar recomendação singular, treino livre e biblioteca já implementados.
- [x] Tratar erro de consulta separadamente de “em dia” e manter IA explícita.
- [x] Validar adoção antes de integrar prática à fila existente do Painel; não
  criar outro card concorrente nem igualar pendência de flashcard à revisão de
  tópico. A baseline de produção de 2026-08-29 é insuficiente para integração:
  três usuários, sete sessões iniciadas e nenhuma sessão concluída nas origens
  atuais `daily_recommendation`/`manual`. Decisão: manter o Painel sem entrada de
  prática e reavaliar somente após atingir a amostra registrada no Recorte 3C.
- [x] Verificar atualização após tentativa, revisão e troca de ciclo com TanStack
  Query, sem introduzir nova fonte de estado assíncrono. A atualização após
  tentativa e geração foi confirmada em 2026-08-29. O overview agora invalida
  sua chave por `topicUpdated`, `subjectUpdated`, `cycleUpdated` e `mergeUpdated`;
  remount, revisão e troca de escopo estão cobertos por testes focados.
- [x] Corrigir a falha de carregamento do Treino e tornar explícita a hierarquia
  entre recomendação e treino manual. A Edge Function remota ainda consultava a
  coluna removida `topics.incidence_score`, causando HTTP 500; a versão corrigida
  foi publicada em 2026-08-31. A tela agora mantém um estado de carregamento real,
  retry limitado para falhas transitórias, CTA "Começar treino recomendado" e
  treino livre visualmente secundário com ações explicadas. Validação autenticada
  no navegador confirmou carregamento sem erro de console; falta o teste do aluno
  a partir do ponto 3.
- [x] Garantir que a contagem diária e a abertura da sessão usem a mesma
  elegibilidade. Flashcards marcados como problema não entram mais na contagem
  de vencidos do overview; a Edge Function foi publicada novamente em
  2026-08-31. O verso do flashcard é pré-carregado enquanto a frente está aberta.
  Após uma sessão com dificuldade, "Reforçar falhas" abre o treino manual com
  essa intenção e o tópico da sessão; sessões sem falhas não oferecem um botão
  concorrente. A abertura diária não substitui silenciosamente um cartão vencido
  por outro material: uma fila alterada retorna `no_due_flashcard` para a tela
  buscar o estado atual. Testes completos permanecem verdes.
- [x] Ajustar a leitura da recomendação após teste real: matéria fica acima do
  tópico, títulos longos quebram sem embolar, a descrição usa linguagem de aluno
  e o card mostra itens imediatos e pendentes no dia. O reforço pós sessão herda
  matéria e tópico; fechar o modal sem iniciar não altera a fila, e uma falha
  marcada como "Com esforço" permanece recomendada até nova recuperação.
- [x] Corrigir a falsa permanência da recomendação diária: o fallback de abertura
  trocava um cartão vencido por outro cartão privado e fazia o aluno acreditar
  que sua pendência não havia sido resolvida. A sessão diária agora abre somente
  os cartões da fila exibida. `Com esforço` agenda o cartão para três dias e
  `Não lembrei` para um dia, sem tocar na agenda tradicional de revisões. O
  overview também deixa de contar pacotes e vencimentos de tópicos fora do ciclo
  ativo, que a sessão corretamente não poderia abrir.
- [x] Tornar a recomendação auditável na própria tela: matéria, tópico, motivo,
  quantidade imediata e total pendente do dia agora aparecem juntos. O treino
  recomendado recebe o tópico vencido para a sessão, e o construtor paraleliza
  consultas independentes antes de selecionar os itens, reduzindo a espera para
  lotes curtos. A proteção contra fila alterada devolve o estado correto sem
  trocar o material.
- [x] Separar na linguagem e no reforço os dois contratos: primeiro contato e
  revisões de tópico continuam na página Revisões; a agenda de flashcards é
  privada do Treino. O card diário nomeia sua origem, informa que o cartão sai da
  fila do dia após a resposta e o reforço pós-sessão preserva tópico e formato,
  em vez de abrir um treino genérico.
- [x] Corrigir a conclusão e a recomendação pós-sessão de questões como um único
  recorte: o resumo mostra acertos, erros, percentual e próximo passo; uma sessão
  diária concluída não volta imediatamente como “próxima ação” porque seus próprios
  erros entram na janela de falhas recentes. Flashcards vencidos permanecem
  prioritários, e questões passam a usar qualidade recente (proporção de erros),
  progresso no Ciclo e a conclusão diária auditável por tópico. O reforço continua
  escolha explícita no encerramento. A biblioteca deixa de repetir o tópico
  recomendado e a contagem de questões passou a indicar disponibilidade, não uma
  pendência inventada. Validação autenticada em 2026-08-31 confirmou que o tópico
  concluído sai da próxima ação e o estado fica “em dia”.
- [x] Redefinir o Treino como motor de decisão da prática, e não como catálogo de
  material privado. A próxima ação de prática parte de falha recente e qualidade
  de respostas ou da dificuldade registrada; material disponível não escolhe mais
  o tópico. Revisões atrasadas/previstas retornam como destino explícito de
  Revisões, e, sem treino pendente, a tela leva o aluno ao Ciclo em vez de deixá-lo
  decidir entre ações técnicas. Também foram separados cartões de primeiro contato
  (criados após um tópico estudado e ainda sem resposta) de cartões para revisão
  (já avaliados e com data alcançada); a abertura de sessão recebe essa finalidade
  para não misturar as filas. Geração continua explícita e a ação manual explica
  que cria questões e flashcards privados, não inicia treino. Validação autenticada
  em 2026-08-31 confirmou o estado sem treino, o CTA para `/ciclo-estudos` e
  ausência de erros no navegador.
- [x] Evoluir a priorização com sinal auditável de consistência. A retomada só é
  sugerida quando existem ao menos duas sessões concluídas antes dos últimos sete
  dias e menos de dois dias ativos de prática nessa janela; aluno sem histórico
  suficiente permanece sem cobrança. A escolha continua limitada a tópico já
  estudado, com questões privadas prontas e sem tentativa recente, depois de
  falha/dificuldade e antes do estado em dia. A Edge Function foi publicada e a
  regra recebeu teste puro em 2026-08-31.
- [x] Renomear as ações livres para eliminar a ambiguidade entre usar e criar
  conteúdo. `Praticar material disponível` abre somente questões e flashcards já
  existentes; `Gerar novas questões e flashcards` abre a geração explícita por IA.
  Os mesmos nomes seguem para os modais e respectivas confirmações. Teste focado
  e validação autenticada em 2026-08-31 confirmaram os dois caminhos sem alterar
  agenda, recomendação ou material existente.
- [x] Remover filtros manuais que prometiam uma seleção adaptativa sem contrato
  correspondente. `Reforçar falhas` e `Revisar pendências` eram visualmente
  distintos, mas com questões enviavam a mesma consulta global e podiam repetir
  o pacote mais recente. O treino livre agora pede matéria ou tópico; falhas e
  pendências continuam apenas na recomendação, que possui critérios e fila reais.
  O reforço contextual após uma sessão difícil mantém seu tópico específico.
  Testes e validação autenticada em 2026-08-31 confirmaram o modal sem as opções
  artificiais.
- [x] Dar saída explícita quando o aluno escolhe um tópico sem material. O retorno
  `needs_material` preserva o tópico consultado e oferece `Gerar questões e
  flashcards` somente após a tentativa de abrir o treino; a IA nunca roda como
  fallback automático. Flashcards sem vencimento continuam apenas com a explicação
  de agenda, sem CTA de geração. Teste de integração e fluxo autenticado com
  `LÍNGUA PORTUGUESA → Coerência e coesão` confirmaram a oferta em 2026-08-31.
- [x] Completar a transição entre geração e prática. Uma matéria sem material não
  gera tudo de uma vez: oferece escolher um tópico dessa matéria para gerar. Após
  o lote ficar pronto, o modal mantém o aluno em `Abrindo questões…` ou `Abrindo
  flashcards…` até a sessão aparecer, eliminando o intervalo em que parecia que
  o clique não fez nada. A reserva da geração é registrada antes da IA; fechar o
  acompanhamento não envia cancelamento. Testes focados e
  validação autenticada com `INFORMÁTICA BÁSICA` sem material em 2026-08-31.
- [x] Preservar retorno contextual no gerador. `Voltar para material disponível`
  retorna ao modal anterior sem fechar o fluxo e preserva a matéria pré-selecionada
  quando a geração foi iniciada a partir dela. Teste e validação autenticada em
  2026-08-31 confirmaram o botão no modal de geração.

## Gate da entrega 1A (repetir em cada recorte)

- [x] Revisar diff e confirmar ausência de alterações alheias, secrets e fixtures
  no recorte; alterações locais anteriores foram preservadas.
- [x] Testes focados, lint, build, gate de arquitetura e comparação do typecheck
  com a base inicial. Falha anterior fica separada de regressão nova.
- [x] Suíte global integralmente verde: os testes de auditoria passaram a ler o
  histórico preservado em `migrations_legacy/`; `npm run test:run` passou com
  197 arquivos e 814 testes em 2026-08-29.
- [x] Componente isolado em desktop, tablet e mobile, claro/escuro, sem sobreposição
  e com controles legíveis. Scroll vertical é permitido; não comprimir para “caber”.
- [x] Fluxo autenticado até o destino e retorno quando aplicável. Revisões e
  foco contextual no Ciclo passaram sem iniciar cronômetro ou gravar progresso;
  a troca real de ciclo continua no item específico de 1B.
- [x] Registrar o que mudou, o que não mudou, evidências, riscos e próximo recorte.

## Evidências desta etapa

### Implementado em 2026-08-28 — ainda não concluído ponta a ponta

- Card extraído para `src/components/dashboard-decision/NextBestActionCard.tsx`.
  Permanece puramente visual, sem imports de Supabase, hooks de dados ou persistência.
- Motivo principal permanece visível. Explicação complementar usa disclosure;
  nomes longos quebram linha em vez de truncar o tópico. Status repetido e botão
  com destino idêntico foram removidos. Identidade azul preservada.
- Não foram alterados modelo, prioridade, URLs, queries, agenda, cronômetro,
  histórico, gráficos, Treino ou Evolução. Navegação contextual fica na etapa 1B.
- 46 testes focados em dois arquivos passaram; lint, build, `architecture:check`
  e `git diff --check` passaram. Typecheck final tem os mesmos erros da execução
  anterior à edição, sem nova falha deste recorte.
- Suíte global executada antes do último teste adicional: 165 arquivos passaram,
  27 falharam; 662 testes passaram e 29 falharam. Os 42 erros reportados são
  `ENOENT`: 30 caminhos SQL únicos, todos com arquivo correspondente em
  `supabase/migrations_legacy/`. É uma pendência de reconciliação dos testes
  após a baseline, não motivo para modificar banco neste recorte visual.
- Checagem visual isolada: 375x812, 768x1024 e 1440x900, claro/escuro;
  sem overflow horizontal, nomes longos legíveis, controles com 44 px no mobile,
  explicação por clique e nenhum erro no console. Fixture temporária removida.
  Não é prova da composição completa nem da navegação autenticada.
- A sessão disponível abriu login em `http://localhost:8081/dashboard`.
  Validação autenticada depende de login do usuário. Teclado permanece pendente
  conforme o item específico acima. Não avançar à próxima página ainda.

Logs locais desta execução: `/tmp/vourevisar-painel-step1/` (temporários).

### Recorte 1B em 2026-08-28 — implementado, gate autenticado pendente

- Card principal e linha do Ciclo na fila passam o mesmo alvo ao hook do Painel.
  Resolver puro usa os tópicos visíveis do ciclo atual e envia os IDs pelo estado
  de navegação já consumido pelo Ciclo. Alvo indisponível mostra aviso e não navega.
- Botão agora diz `Abrir tópico no ciclo`, refletindo a ação real. Não altera
  prioridade, fila salva, timer, revisões, histórico, fontes ou queries.
- Card com altura própria: no cenário desktop fechado mediu aproximadamente
  248 px, enquanto a fila vizinha media 349 px. Botão próximo ao motivo, sem
  espaçador flexível; identidade azul e explicação expansível preservadas.
- 67 testes passaram em quatro arquivos: regras do Painel, componentes do Painel,
  integração da página Ciclo e hook de foco do Ciclo. Integração usa dados de teste
  e não comprova autenticação, RLS ou escrita real em banco.
- Lint, build, gate de arquitetura e `git diff --check` passaram. Typecheck
  antes/depois tem saída idêntica, com erros globais anteriores. Suíte global não
  foi repetida neste recorte; falhas de migrations continuam registradas acima.
- Composição completa do Painel em fixture temporária, explicitamente marcada
  como dados de teste: 1440x1000, 768x1024 e 375x812, claro/escuro. Sem overflow
  horizontal; botões do card com 44 px no mobile; explicação abre/fecha por clique.
  Clique no card e na fila forneceu o mesmo par de IDs. Fixture removida.
- Nenhuma mudança em banco, publicação, Treino, Evolução ou regras do Ciclo.
  A autenticação da ferramenta continua ausente; teclado nativo também continua
  pendente. Não declarar as fases 1A/1B concluídas ponta a ponta.

Logs e checkpoint locais de 1B: `/tmp/vourevisar-painel-step1b/` (temporários).
Os gates autenticados de 1A/1B permanecem pendentes. O teclado foi adiado pelo
usuário; o próximo recorte de implementação permanece no Painel (1C).

### Recorte 1C — fila legível em 2026-08-28

- `PriorityQueueCard.tsx` isola a apresentação da fila. A composição só importa
  o componente; não foram adicionados hooks, queries, mutations ou dependências.
- Rótulos com 11 px e texto branco a 90%; descrição a 80%. Faixas de cor,
  ícones, ordem e contagens preservados. Removida a opacidade do bloco inteiro
  nos estados sem ação, que já funcionavam como atalhos para a página respectiva.
- `Ver revisões` mantém `/revisoes`. Linhas continuam levando exatamente a URL
  e alvo recebidos. Nomes completos permanecem no DOM e no atributo `title`.
- Foco visível reforçado; hover sem deslocamento do item. Não foram criados
  handlers de teclado. Teste manual de teclado continua a cargo do usuário.
- 70 testes passaram em quatro arquivos; lint, build, `architecture:check` e
  `git diff --check` passaram. Typecheck antes/depois tem saída idêntica, com
  falhas globais preexistentes. Suíte global não foi repetida neste recorte.
- Composição real com dados explicitamente de teste, sem banco/autenticação:
  1440x1000, 768x1024 e 375x812, claro/escuro, com e sem pendências. Fila legível,
  sem overflow horizontal; botão do cabeçalho com 44 px no mobile. Cliques
  confirmaram `/revisoes`, URL de revisão com `topicId` e alvo do Ciclo.
  Fixture temporária removida. Não equivale a validação autenticada.
- Comparação com checkpoint confirmou que, fora da fila extraída, somente os
  imports e seu formatador exclusivo mudaram no componente de composição.
  Gráficos, regras de estudo, banco, Treino e Evolução permanecem intactos.

Evidências locais: `/tmp/vourevisar-painel-step1c/` (temporárias).
O recorte de progresso compacto foi executado na sequência, conforme abaixo.

### Recorte 1C — progresso compacto no mobile em 2026-08-28

- `ProgressSummaryCard.tsx` recebe somente resumo já calculado, quantidade não
  iniciada e callback. Preserva as quatro contagens; o percentual continua sendo
  cobertura de tópicos iniciados, sem sugerir conclusão, domínio ou retenção.
- Uma única instância atende mobile/tablet/desktop. Ordem de leitura e DOM
  preservados: contexto, progresso, próxima ação, fila e lembretes. Não há cópias
  por breakpoint, estado de viewport, novas queries ou eventos de estudo.
- Grade compacta e anel menor abaixo de `xl`; resumo lateral preservado no
  desktop. Atalho `Por matéria` mantém nome acessível `Ver progresso por matéria`
  e destino `/ciclo-estudos`. Esqueleto do progresso acompanha a altura mobile.
- Comparação antes/depois com mesma composição e dados de teste em 375x812:
  progresso de 220 para 128 px; CTA principal subiu 92 px (base de 724 para
  632 px aproximadamente). Cenário com concurso, cargo e tópico longos manteve
  CTA visível, a aproximadamente 733 px, sem truncar o tópico.
- Validação visual em 375x812, 768x1024 e 1440x1000, ambos os temas, mais
  320x740 com nomes longos no tema claro. Sem overflow horizontal. No cenário
  estreito e longo, scroll vertical permanece necessário e permitido.
- Fixture explicitamente identificada como dados de teste, sem autenticação
  ou banco; removida após conferir. A altura reservada ao cabeçalho na fixture
  não substitui validação com o shell autenticado e os dados reais do usuário.
- 73 testes passaram em quatro arquivos; lint, build, `architecture:check` e
  `git diff --check` passaram. Typecheck tem saída igual à base anterior;
  falhas globais conhecidas continuam pendentes. Suíte global não foi repetida.
- Fora da extração, comparação com checkpoint mostrou apenas import, props e
  altura do esqueleto alterados. Configuração do ciclo, gráficos, fila, lembretes,
  histórico, banco, Treino e Evolução não foram modificados neste recorte.

Logs/checkpoint: `/tmp/vourevisar-painel-mobile/` (temporários).
- [x] Confirmar primeira tela no shell autenticado. Em `375x812`, o CTA
  `Revisar agora` ficou integralmente visível entre 654,5 e 698,5 px, sem scroll
  inicial e sem overflow horizontal. O gate de teclado também foi concluído.
Próximo recorte de 1C: revisar apresentação do ritmo até a prova e explicações
sob demanda, sem retirar o detalhe diário nem alterar as fórmulas existentes.

### Recorte 1C — ritmo resumido e explicável em 2026-08-28

- `ExamPacePanel.tsx` recebe somente o contrato `pace`, os dias de atividade já
  filtrados e navegação. Metas e média recente continuam visíveis; gráficos,
  denominadores, arredondamento e acesso ao Ciclo ficam em `Detalhes do ritmo`.
- A média dos últimos sete dias foi extraída para `getDashboardRecentPace` sem
  mudar a regra: usa os últimos sete itens, inclui dias com zero, divide pelo
  tamanho da janela disponível e arredonda para uma casa decimal. Não consulta
  banco, não cria cache e não soma outra fonte de tempo.
- Sem atividade, mostra `Ainda sem histórico recente` e não classifica o aluno
  como abaixo da meta. Sem data, data vencida ou ciclo ausente, mantém explicação
  e ação de configuração visíveis. Dados insuficientes não inventam meta nem CTA.
- Comparação em 375x812 com o mesmo modelo de teste: painel de ritmo fechado de
  cerca de 584 para 299 px. Gráficos permanecem no disclosure com 70 px cada.
- Validação visual com dados, sem histórico e sem data em 375x812; dados em
  768x1024 e 1440x1000, claro/escuro, detalhes fechados/abertos. Sem overflow
  horizontal; mapas vizinhos e Consistência recente preservados. A fixture foi
  identificada como dados de teste sem banco/autenticação e removida.
- 92 testes passaram em cinco arquivos, incluindo fórmulas compartilhadas do
  Ciclo. Lint, build, `architecture:check` e `git diff --check` passaram.
  Typecheck antes/depois tem saída idêntica, com falhas globais anteriores.
- Comparação com checkpoint confirmou que, além de imports/props, o componente
  maior só perdeu o bloco extraído. Nenhuma mudança em prioridade, queries,
  agenda, timer, histórico, banco, Treino, Evolução ou fórmulas canônicas.

Logs/checkpoint: `/tmp/vourevisar-painel-pace/` (temporários).
- [x] Validar o resumo e os detalhes do ritmo no shell autenticado. Em
  2026-08-30, com o ciclo IDCAP sem data de prova e sem histórico, o Painel
  exibiu `--`, explicou a ausência de histórico e, ao abrir os detalhes,
  informou a base real de 103 tópicos e 0 revisões, sem inventar metas ou
  atividade.
Próximo recorte: auditar erros parciais e carregamento do modelo do Painel, para
não apresentar falha de consulta como zero, ciclo vazio ou ausência de histórico.

### Recorte 1C — erros parciais honestos em 2026-08-28

- O modelo agora identifica falhas independentes de atividade e lembretes a
  partir dos estados das queries TanStack já existentes. Revisões mantém seu
  erro global anterior; nenhuma query, mutation, chave de cache ou tabela mudou.
- Falha de lembretes não mostra `Sua lista está livre` nem permite criar,
  concluir ou excluir sobre uma leitura incerta. Se há cache anterior, a lista
  permanece visível, marcada como possivelmente desatualizada e somente leitura.
- Falha de atividade não produz `0h`, `0 dias ativos` ou `Ainda sem histórico`.
  Metas calculadas até a prova continuam visíveis, mas média e gráficos recentes
  ficam indisponíveis. Cache anterior permanece abaixo de um aviso explícito.
- Cada aviso repete somente sua própria query. O botão mantém 44 px, mostra
  estado em andamento e volta ao rótulo normal mesmo quando a tentativa falha.
- Testes focados: 87 passaram em três arquivos, cobrindo mapeamento das fontes,
  ausência de falsos vazios, cache marcado, leitura segura e retry. Lint, build,
  `architecture:check` e `git diff --check` passaram. Typecheck antes/depois é
  byte a byte idêntico; as falhas globais anteriores permanecem fora do recorte.
- Validação em fixture local identificada como teste, sem autenticação ou banco:
  375x812 escuro sem cache, 768x1024 claro com cache e 1440x900 escuro sem
  cache. Sem overflow horizontal; ações incertas desabilitadas, dados anteriores
  visíveis, disclosure do ritmo sem gráficos falsos, retry funcional e console
  limpo após nova carga. Fixture e rota temporárias foram removidas.
- Nenhuma alteração em RLS, banco, Edge Functions, ciclo, edital, revisão,
  cronômetro, Treino ou Evolução. Os contratos silenciosos de erro dos hooks de
  ciclo e edital ficam registrados acima para um recorte compartilhado próprio.

Logs/checkpoint: `/tmp/vourevisar-painel-partial-errors/` (temporários).
- [x] Validar aviso, retry e recuperação no Painel autenticado com falha real ou
  simulada de rede. Em 2026-08-30, uma chave DEV temporária simulou falhas
  independentes de atividade e lembretes: cada bloco exibiu seu próprio aviso,
  preservou as demais fontes e ofereceu `Tentar novamente`. A atividade foi
  recuperada após retirar a falha; os lembretes também voltaram ao estado normal.
  A chave foi removida imediatamente após a validação; console sem erros.
Próximo recorte do Painel: decidir se o cabeçalho da fila ainda precisa de ajuste
de contraste ou preparar o contrato compartilhado de erro de ciclo/edital antes
de iniciar a página Evolução.

### Recorte 1C — ciclo e edital não viram vazio em 2026-08-28

- `useStudyCycleData` agora separa falha de matérias e falha do ciclo ativo.
  Erro ou timeout encerra o loading com `error`; não autoriza o Painel a concluir
  que o aluno não possui ciclo. Cache anterior não é apagado pela falha.
- `useCycleState` expõe erro da leitura inicial e o limpa somente ao iniciar nova
  leitura. `useEditalOriginsWithMerge` agrega falhas de editais, mesclagens e do
  ciclo do qual depende; também espera mesclagens antes de encerrar o loading.
- Os contratos existentes de todos os hooks foram mantidos. Foram adicionados
  apenas `error` e rotinas explícitas de retry; consumidores atuais continuam
  recebendo os mesmos dados, callbacks e nomes.
- O modelo do Painel combina Revisões, Ciclo e Editais como fontes críticas.
  Qualquer falha leva ao estado de conexão já existente antes da avaliação de
  `missing_cycle`; portanto, coleção vazia só significa ausência depois de uma
  leitura concluída sem erro.
- 99 testes focados passaram em sete arquivos, divididos em duas execuções para
  evitar pressão de memória do runner. Incluem falha e recuperação dos três
  hooks, agregação crítica, precedência do estado de erro e integração do Ciclo.
  Um primeiro mock instável entrou em loop; ele foi corrigido e não foi tratado
  com aumento artificial de memória.
- Lint, build, `architecture:check` e `git diff --check` passaram. Typecheck
  antes/depois é byte a byte idêntico, mantendo apenas falhas globais anteriores.
- Nenhuma mudança em schema, RLS, migrations, Edge Functions, cache keys,
  mutations, regras de merge, agenda, histórico, Treino ou Evolução.

Checkpoint e logs: `/tmp/vourevisar-painel-critical-errors/` (temporários).
- [x] Validar no Painel autenticado uma falha real ou simulada em cada fonte e a
  recuperação após `Tentar novamente`. Em 2026-08-30, foram simuladas falhas
  independentes de Revisões, Ciclo e Editais; cada uma mostrou `Conexão
  interrompida`, detalhe técnico e retry, e o Painel voltou ao estado normal
  após remover a simulação. Nenhuma escrita foi executada; console sem erros.
O contraste restante do cabeçalho foi corrigido no recorte abaixo.

### Recorte 1C — cabeçalho e contraste de atrasos em 2026-08-29

- O cabeçalho foi extraído para `DashboardCommandHero.tsx`. A composição caiu
  de 1.388 para 1.131 linhas; modelo, callbacks, edição do nome, cronômetro visual,
  contagens e destinos permaneceram iguais.
- O ícone de revisões atrasadas agora usa fundo destrutivo opaco e foreground
  próprio. A correção é local ao cabeçalho: não modifica os tokens globais nem
  os anéis de dificuldade que reutilizam `toneStyles`.
- Os botões métricos receberam nomes acessíveis com rótulo e valor. Atrasadas e
  hoje continuam levando a `/revisoes`; tópicos a iniciar mantém `/ciclo-estudos`.
- Contraste calculado entre ícone e fundo: 3,60:1 no tema claro e 9,58:1 no
  escuro. Validação local em 375x812 claro, 768x1024 escuro e 1440x900 nos dois
  temas, com nome/cargo longos, edição do ciclo, sem overflow e console limpo.
- 49 testes focados passaram em dois arquivos, incluindo estilo local, destinos,
  edição do nome e integração de foco do Ciclo. Lint, build,
  `architecture:check` e `git diff --check` passaram; typecheck antes/depois é
  byte a byte idêntico às falhas globais já registradas.
- Fixture e rota temporárias foram removidas. Nenhuma alteração em queries,
  mutation, cache, Supabase, RLS, regras de revisão, Treino ou Evolução.

Checkpoint: `/tmp/vourevisar-painel-header-contrast/` (temporário).
- [x] Validar a atualização do cabeçalho depois de concluir uma revisão. Em
  2026-08-31, uma revisão vencida foi concluída pela conta autenticada e, sem
  recarregar, o cabeçalho mudou de `Hoje 1/Atrasadas 1/Futuras 0` para
  `Hoje 0/Atrasadas 0/Futuras 1`, com `Feitas hoje 1`. Console sem erros.
Próximo recorte: fechar a decisão de destino do detalhe diário e iniciar a Fase 2
pela auditoria da página Evolução, sem remover ainda os gráficos do Painel.

### Recorte 2A — detalhe diário canônico na Evolução em 2026-08-29

- A auditoria confirmou um contrato quebrado: o Painel navegava para
  `/estatisticas?date=...`, mas a página ignorava `date`. A Evolução agora valida
  a data, seleciona automaticamente 7, 14, 30 dias ou todo o ciclo para contê-la
  e permite voltar ao período removendo o parâmetro da URL.
- `study_sessions.session_duration_minutes` continua sendo a única fonte do
  total de tempo. O detalhe distribui essas sessões por matéria. Os registros de
  `topic_review_history` são buscados somente quando há dia selecionado e aparecem
  em um bloco separado como estudo, revisão ou questões.
- O histórico respeita o escopo visível do ciclo ativo, incluindo IDs de tópicos
  mesclados. Nenhuma operação `.in()` é executada com lista vazia. Não houve
  migration, mudança de RLS, Edge Function, mutation, agenda de revisão ou escrita.
- A ação do Painel passou de `Ver tudo` para `Abrir dia na Evolução`, nomeando o
  destino real. Os gráficos permanecem no Painel até a equivalência funcional
  restante e a decisão sobre sinais estratégicos.
- 51 testes focados passaram. O caso crítico prova que um contato histórico de
  100 minutos não altera o total oficial de 40 minutos. Lint, build,
  `architecture:check` e `git diff --check` passaram. O typecheck mantém somente
  as falhas globais anteriores, sem ocorrência nos arquivos deste recorte.
- A suíte integral executou 740 testes: 711 passaram e 29 falharam, além de 13
  suítes sem coleta, todos por migrations legadas ausentes já registradas neste
  plano. Nenhuma falha aponta para os arquivos da Evolução ou deste contrato.
- Validação autenticada com dados reais: Painel → selecionar Hoje → `Abrir dia na
  Evolução` abriu a URL datada e exibiu o detalhe. `Voltar ao período` removeu a
  data e ocultou o recorte. A página foi inspecionada em 375x812 escuro,
  768x1024 escuro e 1440x900 claro, sem overflow horizontal; tema e viewport do
  navegador foram restaurados ao final.

Checkpoint: `/tmp/vourevisar-evolucao-dia/` (temporário).
- [x] Validar o detalhe com um dia que contenha contato do tipo `questions`.
  Em 2026-08-30, uma questão existente de Língua Portuguesa foi respondida na
  conta autenticada; o detalhe em `/estatisticas?date=2026-08-30` exibiu o
  contato como `Questões`, com tópico e matéria, sem somá-lo ao minuto oficial
  do cronômetro. A correção inclui `practice_attempts` objetivos válidos na
  leitura de contatos do dia e preserva `topic_review_history` para estudo e
  revisões.
- [x] Decidir quais sinais de dificuldade/incidência pertencem à Evolução antes
  de retirar mapas do Painel. O Recorte 2B manteve dificuldade percebida e
  cobrança analisada separadas por matéria; o Recorte 2D retirou os mapas apenas
  após fechar a equivalência e preservar os destinos.

Próximo recorte: auditar dificuldade e incidência por matéria na Evolução,
reutilizando a base analisada sem transportar automaticamente os mapas circulares.

### Recorte 2B — dificuldade e cobrança por matéria em 2026-08-29

- A lista de matérias passou a mostrar dois sinais distintos. `Dificuldade`
  representa a marcação feita pelo aluno; `Cobrança` representa somente a base
  de incidência já analisada no edital. Cada sinal informa numerador e total para
  impedir que ausência de dado seja interpretada como resultado favorável.
- O cálculo usa apenas tópicos visíveis do ciclo ativo. Em tópicos mesclados,
  preserva a maior dificuldade marcada e a maior faixa de incidência entre as
  origens; assim uma origem de alta cobrança não desaparece por causa da escolha
  do tópico representativo.
- `Ver tópicos` reutiliza o contrato existente de foco por matéria no Ciclo.
  Nenhuma ação de estudo, prioridade ou fila nova foi criada. Os mapas circulares
  permanecem no Painel até a decisão final de equivalência funcional.
- A consulta existente de tópicos recebeu apenas `difficulty_level` e
  `incidence_level`; não houve query adicional, migration, mudança de RLS,
  Edge Function, mutation, agenda ou escrita no banco. O changelog atual do
  Supabase foi auditado e não há quebra aplicável a esse `select` em tabela já
  exposta e usada pelo produto.
- 14 testes focados passaram. Eles cobrem consolidação de sinais após merge,
  bases analisadas separadas e apresentação na página. Lint, build,
  `architecture:check`, `git diff --check` e o recorte do typecheck passaram;
  permanecem somente as falhas globais anteriores.
- Validação autenticada: a consulta real carregou cinco matérias. Três exibiram
  uma marcação de dificuldade e todas mostraram `0/N analisados` em cobrança,
  sem inventar nível baixo. O primeiro `Ver tópicos` abriu Legislação no Ciclo
  com seus tópicos visíveis.
- Validação visual em 375x812 e 768x1024 escuro e 1440x900 claro, sem overflow
  horizontal. O primeiro passe encontrou o contador do cabeçalho comprimido e
  rótulos truncados no mobile; ambos foram corrigidos e revalidados. Tema e
  viewport foram restaurados.

Checkpoint: `/tmp/vourevisar-evolucao-sinais/` (temporário).
- [x] Validar visualmente uma matéria real com incidência parcial ou completa.
  Em 2026-08-30, o lote PCDF/Cebraspe registrou dois tópicos de Língua Portuguesa
  (um por catálogo e um por IA); o Painel carregou o mapa parcial sem apresentar
  volume bruto como questões confirmadas. A fila de prioridade também passou a
  distinguir `tópicos mapeados` de `alerta acionável`, evitando dizer “sem alerta”
  ao lado de uma contagem positiva de cobrança alta.
- [x] Verificar revalidação do cache da Evolução após marcar dificuldade e após
  aplicar incidência em outra rota. O hook invalida a família da consulta nos
  eventos de tópico, matéria, ciclo e merge já emitidos pelas mutations, e força
  nova leitura ao remontar a rota; o contrato foi coberto por teste automatizado.

Próximo recorte: fechar estados parciais/cache da Evolução e comparar a
equivalência funcional dos gráficos antes de qualquer remoção no Painel.

### Recorte 2C — estados parciais e revalidação em 2026-08-29

- A falha opcional de `topic_review_history` no detalhe diário deixou de derrubar
  toda a Evolução. Horas, progresso, memória e matérias continuam disponíveis;
  apenas os contatos do dia mostram aviso próprio e repetição local. Uma resposta
  vazia bem-sucedida continua sendo apresentada como ausência real de contatos.
- A fonte canônica de tempo permanece `study_sessions`. Mesmo durante a falha
  parcial, o total e a distribuição por matéria não usam duração do histórico.
  Falhas nas fontes centrais continuam levando ao erro global já existente.
- A query `cycle-statistics` agora inclui a data selecionada na chave e invalida
  toda a família do usuário quando recebe `topicUpdated`, `subjectUpdated`,
  `cycleUpdated`, `mergeUpdated`, `dailyProgressUpdated` ou
  `external-topic-completed`. Os listeners são removidos ao desmontar; voltar à
  rota também força revalidação com `refetchOnMount: 'always'`.
- Os testes permanentes cobrem ciclo iniciado sem sessões, período sem base
  anterior, dois editais combinados, tópicos inativos/ocultos, sinais preservados
  após merge, falha parcial dos contatos e invalidação seguida de cleanup. Foram
  25 testes passando em cinco arquivos.
- Validação visual isolada em 375x812 escuro, 768x1024 escuro e 1440x900 claro:
  sem overflow horizontal, tempo de 1h10 preservado, aviso e retry locais. A rota
  e a fixture temporárias foram removidas após o gate.
- Lint, build, `architecture:check` e `git diff --check` passaram. O typecheck
  manteve as mesmas falhas globais anteriores e nenhuma delas aponta para os
  arquivos deste recorte. Não houve alteração em schema, RLS, migration, Edge
  Function, mutation ou regra de revisão.

Checkpoint e logs: `/tmp/vourevisar-evolucao-cache-partial/` (temporários).

Próximo recorte: comparar item por item os gráficos ainda presentes no Painel
com a Evolução e registrar o que será mantido, movido ou descontinuado antes de
remover qualquer bloco.

### Recorte 2D — equivalência e retirada dos gráficos do Painel em 2026-08-29

- A divisão funcional foi fechada antes da remoção. O Painel permanece orientado
  à decisão imediata; a Evolução concentra histórico, comparação de períodos,
  detalhe diário, dificuldade, cobrança, memória e análise por matéria.
- Foram descontinuados no Painel: `Consistência recente` com gráfico e detalhe do
  dia, os mapas circulares de dificuldade e cobrança e os dois minigráficos de
  tópicos/revisões dentro de `Detalhes do ritmo`. Seus destinos canônicos são,
  respectivamente, o gráfico/detalhe diário e a lista de matérias da Evolução.
- Foram preservados no Painel: o resumo compacto de progresso, porque contextualiza
  a próxima ação, e `Seu ritmo até a prova`, porque metas necessárias e média dos
  últimos sete dias são sinais operacionais que a Evolução não substitui. O bloco
  ganhou `Abrir Evolução completa` como destino explícito.
- O retry de atividade deixou de depender do bloco removido. Falha da janela
  recente aparece dentro de `Seu ritmo até a prova`; metas calculadas permanecem
  visíveis e somente a média é marcada como indisponível.
- A consulta do Painel foi reduzida à janela fixa de sete dias e aos campos
  `topic_id`, `review_stage` e `reviewed_at`, suficientes para as médias de tópicos
  e revisões. Detalhes, duração, dificuldade e joins de matéria/tópico deixaram de
  ser carregados nessa rota. A chave passou a `dashboard-recent-pace` para não
  misturar o novo contrato enxuto com o cache anterior; voltar ao Painel força
  reconciliação para incluir ações concluídas em outras rotas.
- A composição principal caiu de 1.133 para 380 linhas neste recorte. O chunk do
  Dashboard caiu de 82,79 kB para 59,27 kB antes de gzip. Nenhuma regra de fila,
  prioridade, progresso, revisão, merge, cronômetro ou recomendação foi alterada.
- 100 testes passaram em oito arquivos, cobrindo Painel, ritmo, retry, destino da
  Evolução e os contratos analíticos. Lint, build, `architecture:check` e
  `git diff --check` passaram. O typecheck manteve as mesmas falhas globais
  anteriores, sem ocorrência nos arquivos deste recorte.
- Validação autenticada em 375x812 e 768x1024 escuro e 1440x900 claro: sem overflow
  horizontal, blocos descontinuados ausentes, ritmo e progresso preservados. O
  CTA abriu `/estatisticas`, onde o gráfico de tempo e a análise por matérias
  permaneceram disponíveis. Tema e viewport foram restaurados.
- Não houve alteração em schema, RLS, migration, Edge Function, escrita no banco
  ou fonte canônica de tempo.

Checkpoint e logs: `/tmp/vourevisar-painel-evolucao-equivalence/` (temporários).

Próximo recorte: iniciar a Fase 3 pelos gates autenticados ainda pendentes do
Treino, sem criar uma segunda recomendação operacional no Painel.

### Recorte 3A — contratos autenticados do Treino em 2026-08-29

- A fila diária de flashcards foi exercitada com um usuário autenticado. Uma
  tentativa `Lembrei` reduziu a contagem de 9 para 8; o mesmo cartão foi servido
  em treino livre, recebeu nova tentativa e a fila permaneceu em 8. Isso valida
  o contrato de reagendamento exclusivo da origem diária pelo read model real.
- A revelação manteve o verso fora da frente inicial, buscou a resposta salva
  somente após o clique e passou a informar `Busca o verso já salvo. Não usa
  IA.`. Nenhuma geração ocorreu ao abrir, revelar ou responder o cartão.
- Uma geração real e confirmada criou um lote privado para `LÍNGUA PORTUGUESA:
  1 Compreensão e interpretação de textos de gêneros variados.`. O estado
  `Preparando material`, a saída `Decidir depois`, o polling e o estado
  `Material pronto para praticar` foram confirmados; o lote entrou na biblioteca
  com seis questões e quatro flashcards.
- O teste expôs um efeito ligado ao domínio: flashcards recém-gerados recebem
  agenda inicial para agora e entram na fila. A cópia anterior prometia que a
  criação não mudaria a recomendação; ela foi corrigida para diferenciar treino
  livre, que não reagenda, de criação de lote, que adiciona cartões à fila. O
  título deixou de chamar cartões novos de `vencidos`.
- Erro do overview agora tem estado próprio com retry e bloqueia fila,
  biblioteca e treino livre, em vez de cair falsamente em `Sua prática está em
  dia`. O estado foi coberto por teste focado.
- Validação autenticada em 375x812 e 1440x900: sem overflow horizontal; estados
  preparando/pronto, biblioteca, fila e aviso sem IA legíveis; nenhum erro de
  aplicação apareceu no console. O estado pronto ocupou 806 px no desktop e o
  documento permaneceu dentro de 1.440 px.
- 13 testes focados passaram em quatro arquivos; lint, build,
  `architecture:check` e `git diff --check` também passaram. O typecheck global
  continua bloqueado por erros anteriores fora de `src/features/practice`; após
  tipar a fixture do recorte, não restou erro de prática. O recorte não alterou
  schema, RLS, migration, Edge Function, agenda de revisão de tópico, ciclo ou
  edital. Houve somente as escritas funcionais esperadas: duas tentativas
  privadas e um lote privado confirmado.

Checkpoint: `/tmp/vourevisar-practice-auth-gates/` (temporário).

Próximo recorte: validar troca de escopo sem reaproveitar material histórico e
atualização após revisão/troca de ciclo antes de integrar qualquer sinal de
prática à fila do Painel.

### Recorte 3B — atualização após revisão e troca de escopo em 2026-08-29

- `usePracticeOverview` passou a invalidar somente o prefixo
  `['practice-overview', userId]` quando recebe os eventos de domínio que alteram
  sua base: `topicUpdated`, `subjectUpdated`, `cycleUpdated` e `mergeUpdated`.
  O estado assíncrono continua exclusivamente no TanStack Query.
- O retorno à rota continua usando `refetchOnMount: 'always'`, agora coberto por
  teste de desmontagem/remontagem com cache compartilhado. Isso impede que um
  overview anterior reapareça como atual depois de concluir uma revisão ou
  carregar outro ciclo em outra página.
- O contrato puro de escopo recebeu o cenário explícito edital A → edital B. O
  teste confirma que a matéria A desaparece e somente a matéria B permanece;
  os casos sem edital e sem edital carregado continuam cobertos.
- A página autenticada permaneceu funcional com 12 flashcards e os três tópicos
  privados do edital atual. Não houve troca real do ciclo do usuário: esse gate
  continua manual porque substituir ou descarregar o edital apenas para QA seria
  uma mutação destrutiva e desnecessária.
- 17 testes frontend de prática passaram em seis arquivos e nove testes Deno do
  read model/escopo/seleção passaram. Lint, build, `architecture:check` e
  `git diff --check` ficaram verdes. O typecheck global mantém apenas as falhas
  anteriores fora deste recorte; nenhum erro aponta para o hook ou seu teste.

Checkpoint: `/tmp/vourevisar-practice-scope-refresh/` (temporário).

Próximo recorte: medir adoção e definir se algum sinal de prática merece entrar
na fila já existente do Painel, sem criar uma segunda recomendação concorrente.

### Recorte 3C — baseline de adoção, qualidade e custo em 2026-08-29

- A medição foi feita diretamente nos ledgers canônicos do Supabase, de forma
  agregada e sem consultar identificadores, nomes, e-mails, prompts ou respostas.
  Não foi criada tabela paralela nem tracking de clique.
- Desde 2026-08-28: três usuários criaram 18 sessões; sete chegaram a registrar
  tentativa (38,9%), três sessões antigas sem origem registrada foram concluídas
  (16,7% do total; 42,9% das iniciadas) e somente um usuário apareceu em dois ou
  mais dias. Nas origens atuais, `daily_recommendation` teve seis sessões, duas
  iniciadas e nenhuma concluída; `manual` teve três, uma iniciada e nenhuma
  concluída. Ainda não existe sessão `post_study` observada.
- Decisão de produto: não integrar prática ao Painel agora. O volume não prova
  adoção e uma nova entrada apenas competiria com a recomendação operacional já
  existente. Reavaliar quando houver pelo menos 20 usuários iniciantes, 50
  sessões com tentativa, 30 conclusões, 10 usuários em dois ou mais dias e 20
  avaliações de qualidade. Esses números são um gate operacional mínimo, não
  significância estatística.
- Cinco gerações de dois usuários produziram 50 itens, sem falha, rejeição ou
  reporte, mas houve apenas uma avaliação positiva. A amostra editorial é
  insuficiente para limite comercial, cache global ou moderação compartilhada.
- O ledger armazenava 30.738 tokens, porém classificava apenas 15.049 como saída
  e persistia custo nulo. A diferença de 13.857 tokens era raciocínio faturável.
  A Edge Function agora contabiliza saída visível + raciocínio, aceita preços por
  ambiente e usa a tabela Standard conhecida do modelo apenas quando o modelo é
  `gemini-2.5-flash`; modelo desconhecido continua com custo nulo, nunca zero falso.
- A migration `20260829213608_backfill_practice_generation_cost.sql` foi aplicada
  no projeto `vouRevisar`. Os cinco lotes ficaram com 28.906 tokens faturáveis de
  saída e custo estimado total de US$ 0,072814, média de US$ 0,014563 por lote.
  A função `generate-practice-package` versão 13 está ativa com JWT obrigatório.
- `supabase/snippets/practice_adoption_report.sql` deixa a consulta agregada e
  repetível. A fonte de preço foi conferida na tabela oficial do Gemini em
  2026-08-29; os overrides `PRACTICE_INPUT_USD_PER_MILLION` e
  `PRACTICE_OUTPUT_USD_PER_MILLION` evitam fixar futuras mudanças no código.

Checkpoint: `/tmp/vourevisar-practice-adoption/` (temporário).

Próximo recorte: melhorar a taxa de início/conclusão dentro do próprio Treino e
coletar feedback editorial antes de reconsiderar qualquer integração no Painel.

### Recorte 3D — início, conclusão e feedback do treino em 2026-08-29

- O cabeçalho da sessão passou a mostrar progresso acessível por itens
  respondidos. Revelar o verso não conta como resposta; o avanço continua
  dependendo da autoavaliação persistida.
- A avaliação editorial deixou de depender de ícones sem texto. Os controles
  agora expõem `Útil` e `Problema`, preservam o motivo estruturado e adaptam a
  linguagem entre questão e flashcard.
- Flashcards agora pedem avaliação opcional do último cartão na conclusão. A
  avaliação continua ligada ao item real e não bloqueia o encerramento; não foi
  criada nota artificial para a sessão inteira.
- `Fazer outro treino` encerra a sessão atual antes de abrir o construtor. A
  ação principal de saída passou de `Fechar` para `Concluir e voltar`, deixando
  explícito o destino sem alterar quando o backend marca a sessão concluída.
- `/pratica/:sessionId` não renderiza mais a demonstração fixa e desconectada.
  Links antigos redirecionam para `/treino`; uma rota direta só deve voltar
  quando puder hidratar e autorizar a sessão real pelo identificador. A página,
  a moldura, o flashcard e as fixtures exclusivos do protótipo foram removidos
  depois de confirmar que não tinham consumidores restantes.
- O fluxo autenticado foi percorrido em desktop e em `375x812`: três questões
  manuais foram concluídas sem atualizar agendas; quatro flashcards da fila
  diária foram concluídos com atualização das quatro agendas; a última resposta
  recebeu uma avaliação positiva após inspeção do conteúdo. O ledger confirmou
  `rescheduleFlashcards=false`/zero agendas alteradas na sessão manual e
  `rescheduleFlashcards=true`/quatro agendas alteradas na sessão diária. A
  consulta agregada posterior confirmou uma avaliação positiva persistida,
  sem ler identificadores ou conteúdo privado.
- Não houve overflow horizontal na home, na execução nem na conclusão mobile.
  O fallback `/pratica/:sessionId` chegou a `/treino` e `Fazer outro treino`
  encerrou o diálogo anterior antes de abrir o construtor.
- 19 testes frontend de prática, lint, build, `architecture:check` e
  `git diff --check` passaram. O typecheck global continua falhando apenas nos
  débitos anteriores de Revisões, ciclo estratégico e importação de edital;
  nenhum erro aponta para este recorte.

Próximo recorte: repetir a medição somente quando a amostra mínima do Recorte 3C
for atingida; antes disso, não adicionar entrada concorrente no Painel.

### Recorte 1D — teclado e destinos autenticados em 2026-08-29

- O shell real confirmou que `Como foi definida` recebia foco, mas não alternava
  por Enter/Espaço. O trigger passou a normalizar apenas essas teclas para o
  mesmo clique do Radix; Enter abre e Espaço fecha sem navegar.
- `Revisar agora` abriu `/revisoes` com o `topicId` real. A prioridade do Ciclo
  abriu Língua Portuguesa com o tópico recomendado visível na viewport. Nenhuma
  ação de iniciar estudo, cronômetro ou revisão foi acionada.
- Em `375x812`, o CTA principal ficou totalmente visível na primeira tela,
  entre 654,5 e 698,5 px, sem scroll inicial nem overflow horizontal.
- 49 testes focados passaram em três arquivos. Lint, build,
  `architecture:check` e `git diff --check` passaram. O typecheck ainda falha
  nos débitos globais já registrados, sem erro em `NextBestActionCard`.

Próximo recorte executável: corrigir o typecheck global em trabalho próprio;
depois reconciliar os testes que ainda apontam para migrations legadas.

### Recorte 1E — contrato único de revisões em 2026-08-29

- [x] Corrigir a divergência real entre o resumo (`3 hoje pendentes`) e a fila
  (`2 tópicos`). A causa era concreta: o cálculo de `pendingReviews` somava a
  agenda futura, enquanto o foco diário filtrava apenas atrasadas e hoje.
- [x] Centralizar a classificação temporal em `reviewSchedule`: cada tópico
  iniciado e não concluído é exatamente um de `atrasada`, `hoje`, `futura` ou
  `sem agenda`; programas concluídos e tópicos não iniciados ficam fora de toda
  fila pendente. Datas são comparadas pelo início do dia local.
- [x] Usar o mesmo contrato no hook da lista, no mapeamento de status da página
  e nas métricas de ritmo. `Pendentes` agora significa somente a ação que exige
  atenção hoje (atrasadas + hoje); futuras seguem contabilizadas separadamente
  como agenda programada.
- [x] Expor `Futuras` na barra de Revisões e aceitar `/revisoes?tab=futuras`,
  destino que já era emitido pelo Ciclo mas não tinha aba acessível. A aba não
  inicia timer, não conclui revisão e não altera a agenda.
- [x] Tornar os rótulos analíticos explícitos: `Agendadas` inclui a fila futura;
  `Feitas hoje` vem do histórico de contatos do dia; `Programas concluídos` não
  é mais apresentado como revisão feita.
- [x] Validar no shell autenticado, sem executar ação de estudo: `2 hoje`,
  `0 atrasadas`, `1 futura` e uma única linha na aba futura. O console de uma
  nova carga ficou sem erros. Testes focados (22), lint, build,
  `architecture:check` e `git diff --check` passaram.
- [x] Observar a transição após concluir uma revisão real. Em 2026-08-31, o
  bundle atual foi validado na sessão autenticada: a fila saiu de `Hoje 1` com
  `Atrasadas 1` para estado vazio, a próxima agenda apareceu em `Futuras 1` e o
  card analítico refletiu `Feitas hoje 1`; a atualização ocorreu sem reload e
  sem erros de console.
- [x] Corrigir o cartão analítico de Revisões: `Tópicos iniciados` agora usa
  `startedTopicsCount`, em vez de exibir tópicos concluídos com o rótulo errado.
  A prop redundante foi removida; 784 testes globais, lint, build e diff check
  passaram em 2026-08-30.

### Recorte 1F — recuperar o typecheck global em 2026-08-29

- [x] Reconciliar os contratos de tipos do Ciclo estratégico: métricas calculadas
  de tópicos iniciados voltaram ao retorno do hook, `totalSubjects` foi declarado
  no contrato visual e as fixtures passaram a incluir o resumo completo. Os
  testes focados do painel e do fechamento do primeiro contato passaram.
- [x] Corrigir o contrato do fluxo de importação de edital. A recuperação
  Cesgranrio agora adapta âncoras ao formato de `AiSubject`, pesos usam o objeto
  `weight` já consumido pela revisão, o rascunho sem fonte usa o fallback
  explícito e o formulário manual recebe seu contrato atual. Não houve mudança
  de prompt, Edge Function, schema, RLS ou persistência. `typecheck`, lint,
  testes focados, build e `git diff --check` passaram.

### Recorte 1G — retirada da incidência em provas em 2026-08-30

- [x] Retirar `Importância em Prova` da navegação e remover as rotas
  `/admin/importancia-prova` e `/estatisticas/tendencia`.
- [x] Retirar `Mapa de cobrança` da fila do Painel e qualquer recomendação
  baseada em volume de busca.
- [x] Retirar badges, sinais e textos de cobrança do Ciclo, Revisões e Evolução.
- [x] Retirar incidência do agendamento, dos alertas, da sugestão de fila, dos
  insights do Mentor e do desempate de recomendações do Treino.
- [x] Cancelar POC e processamento automático. Não exigir operação manual de
  provas, editais, matérias ou tópicos para o SaaS entregar o fluxo principal.
- [x] Limpar o backend e o schema legados em migrations isoladas após auditoria
  de dependências. As migrations `20260830130908_remove_incidence_legacy`,
  `20260831003649_drop_unused_incidence_admin_rpc` e
  `20260831003840_drop_unused_topic_audit_columns` removeram tabelas, colunas,
  RPC e dados de auditoria sem dependentes; os tipos Supabase foram regenerados.
  O `ai-handler` perdeu o caminho de busca Google e o segredo exclusivo da
  incidência, e foi publicado novamente. Resíduos em especificações e baselines
  históricas permanecem somente como histórico, sem caminho executável.

### Acompanhamento pós-venda

- [ ] Acompanhar a adoção real do Treino após o lançamento: recorrência semanal,
  conclusão, recomendação aceita, falhas e custo de geração. Essa amostra não
  bloqueia venda nem altera agenda de revisões automaticamente.
- [ ] Ativar no upgrade de plano do Supabase a proteção contra senhas vazadas
  (HaveIBeenPwned) e confirmar no Security Advisor.

### Backlog técnico pós-limpeza

- [x] Revisar os avisos de segurança do Supabase sobre funções
  `SECURITY DEFINER` e tabelas com RLS sem política, preservando os contratos
  administrativos. O caso destrutivo foi fechado pela migration
  `20260831111156_restrict_admin_purge_rpc_grant`. Em 2026-08-31, a migration
  `20260831181056_revoke_direct_user_security_definer_rpcs` transferiu
  `get_my_auth_methods`, `get_stripe_billing_overview`,
  `get_subscription_info` e `get_user_ai_limits` para a Edge Function
  autenticada `user-rpc`, com validação de dono e sem execução REST direta.
  A verificação remota confirmou `authenticated_can_execute = false` e
  `service_role_can_execute = true` nos quatro casos; o advisor não reporta mais
  funções `SECURITY DEFINER` executáveis por `authenticated`.
  As 15 tabelas financeiras/privadas sem policy foram auditadas: RLS permanece
  habilitado e `anon`/`authenticated` não têm grants; somente `service_role`
  acessa essas tabelas através de Edge Functions/RPCs protegidas. Não foi criada
  policy permissiva apenas para silenciar o advisor. Testes focados (47), lint,
  build e `git diff --check` passaram.
- [x] Retirar a proteção contra senhas vazadas do gate de lançamento atual.
  A configuração de Auth depende do plano pago do Supabase e será ativada no
  upgrade; não há migration segura para substituí-la.
- [x] Revisar os avisos de performance do Supabase (chaves estrangeiras sem
  índice, índices duplicados e policies RLS) em migrations próprias, sem
  misturar com mudanças de produto. Em 2026-08-31:
  `20260831112312_remove_duplicate_indexes` removeu sete índices comprovadamente
  idênticos, mantendo um índice equivalente em cada conjunto. Ainda faltam as
  chaves estrangeiras sem índice e a revisão de políticas permissivas múltiplas.
  O fluxo principal foi coberto por `20260831112515_add_core_study_fk_indexes`,
  com 21 índices aditivos para Ciclo, Revisões e Treino. As migrations
  `20260831113036_add_billing_admin_fk_indexes` e
  `20260831113108_add_ai_usage_user_index` cobriram os módulos financeiros,
  administrativos e de consumo de IA; a verificação remota confirmou os índices.
  A tabela histórica `incident_action_log` também foi removida pela migration
  `20260831132656_remove_incident_action_log_legacy`; os tipos foram regenerados
  e não há mais referência executável ao fluxo de incidentes. Em 2026-08-31, a
  migration `20260831182130_add_remaining_fk_indexes` cobriu as três últimas
  FKs indicadas (`admin_alert_events.acknowledged_by`,
  `flashcard_schedules.item_id` e `subject_merges.cycle_id`); a auditoria remota
  já não reporta `unindexed_foreign_keys`. A migration
  `20260831182253_optimize_core_study_rls_initplans` também otimizou as quatro
  policies do Ciclo (`study_cycles_v2`, `cycle_rotations`,
  `cycle_subject_states` e `cycle_study_logs`) sem mudar escopo, roles ou regra
  de dono; os avisos `auth_rls_initplan` caíram de 62 para 58. A migration
  `20260831184057_optimize_user_owned_rls_policies` tratou regras simples de
  propriedade em atividade, ciclo, extrações, sugestões, pendências e
  notificações, removendo duas policies literalmente duplicadas; o total caiu
  para 44 avisos `auth_rls_initplan` e 121 de policies permissivas múltiplas.
  As migrations `20260831185325_optimize_remaining_student_rls_initplans` e
  `20260831185445_optimize_admin_rls_initplans` preservaram comandos, roles e
  predicados e zeraram os avisos `auth_rls_initplan`; a auditoria final também
  não reporta `unindexed_foreign_keys` nem `unused_index`. Os 121 avisos de
  policies permissivas múltiplas foram classificados como combinações
  intencionais de dono, administrador, moderador e membro em tabelas de
  comunidade, organização e perfil; não há duplicata literal restante. Eles
  não são acesso aberto e não devem ser removidos para silenciar o advisor.
