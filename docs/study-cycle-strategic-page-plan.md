# Plano: Pagina Ciclo de Estudos como Mapa Estrategico do Edital

Este plano e a referencia de implementacao da pagina Ciclo de Estudos. A pagina deve responder:

> O que estudar agora para avancar melhor no edital?

## Regra de uso deste plano

- Este arquivo e a fonte viva de pendencias da pagina de ciclo, inteligencia estrategica, incidencia/cobranca de topicos e evolucoes diretamente ligadas a esse fluxo.
- Antes de continuar esta frente, olhar este plano primeiro.
- Toda pendencia descoberta deve entrar aqui como item `[ ]`, incluindo bug, melhoria, validacao visual, decisao de produto, divida tecnica, migration, Edge Function, Cron, teste ou ajuste futuro.
- Item concluido e verificado deve ser marcado como `[x]`.
- Item parcialmente feito continua `[ ]` com o que ainda falta escrito no proprio item.
- Se surgir algo importante fora deste escopo, registrar em uma secao de backlog ou criar novo plano em `docs/` e apontar daqui.
- A conversa nao deve ser a unica memoria do que falta implementar.

## Decisao de produto atualizada

- A fila do ciclo deve continuar respeitando a ordem escolhida/salva pelo aluno em `ciclo_atual`.
- O sistema nao deve reordenar automaticamente as materias por peso, incidencia ou IA.
- Peso do edital, incidencia recente e prioridade estrategica entram como sinais, badges, insights e alertas.
- O aluno deve decidir se muda a ordem manualmente ou se segue uma sugestao/alerta do sistema.
- A pagina nao deve virar dashboard pesado nem tela de revisao.

## Principios da tela

- Foco em avanco no edital e primeiro contato.
- Revisao, FSRS, memoria, esquecimento e retencao pertencem a pagina de revisoes.
- Visual premium, limpo, silencioso e estrategico.
- Sensacao desejada: clareza mental, controle e organizacao inteligente.
- Interface bonita que atrapalha estudo e regressao de produto.
- Sistema vivo: a tela deve cruzar dados reais de edital, peso, incidencia, ciclo, progresso, historico e data da prova para revelar riscos que o aluno normalmente nao percebe.
- Nenhum alerta deve ser inventado. Se o dado nao existe, mostrar estado honesto ou acao para gerar/preencher o dado.

## Status geral

- [x] A coluna esquerda/fila do ciclo ja existe.
- [x] A ordem atual vem de `user_cycles.ciclo_atual`.
- [x] A rota ativa `/ciclo-estudos` renderiza `src/pages/Subjects.tsx`.
- [x] O sistema ja possui campos de peso por materia.
- [x] O sistema ja possui base inicial de incidencia por topico via `topics.total_volume`.
- [x] A tela apresenta peso e incidencia como sinais estrategicos iniciais.
- [x] A superficie principal da fila foi limpa para reduzir informacoes de revisao.
- [x] O painel estrategico direito existe na pagina real.
- [x] O topo estrategico existe na pagina real.
- [x] O painel direito foi ajustado para nao inventar insights quando ainda nao ha dados calculaveis.
- [x] O painel direito separa Ciclo X e Mapa de cobranca.
- [x] O card redundante de proximo avanco foi removido do painel.
- [x] O card superior de ciclo foi removido para liberar espaco da pagina.
- [x] Metricas tecnicas sem acao clara, como `Peso conhecido` e `Incidencia analisada`, foram retiradas da lateral.
- [x] A lateral passou a usar cards visuais com icones, cor e estados uteis em vez de linhas simples.
- [x] Peso pendente passa a mostrar percentual derivado quando o total de pontos/questoes permite calcular.
- [x] Foi criada persistencia de snapshots por ciclo fechado para comparacoes futuras.
- [x] Insights nao repetem metricas do card do ciclo; execucao fica no card de ciclo, estrategia fica em cobranca/peso.
- [x] Continuar topico ja iniciado nao conta como topico novo no ciclo.
- [x] Criar camada de alertas estrategicos reais a partir de dados confiaveis.
- [x] Salvar historico de uso/ordem real de estudo no ciclo para sugerir reorganizacao sem alterar a fila automaticamente.
- [x] Criar metrica unificada de ritmo ate a prova para exibir na pagina Ciclo, na pagina Revisoes e no Painel: abaixo do titulo do painel/area estrategica, mostrar quantos dias faltam para a prova, quantos dias restam para iniciar os topicos novos ate a prova e quantos topicos novos por dia seriam necessarios. O calculo deve usar dados reais disponiveis: topicos ativos ainda nao iniciados, data da prova, historico real de inicio/primeiro contato, tempo medio real para iniciar um novo topico quando existir e ritmo recente do aluno. Se nao houver dados suficientes, mostrar estado honesto e nao inventar previsao.
  - [x] Primeira camada implementada no Painel: dias restantes, topicos nao iniciados, revisoes atrasadas/de hoje/futuras ate a prova e ritmo diario necessario, sempre derivados de dados reais e com explicacao do calculo.
  - [x] Evoluir a metrica com tempo medio real de primeiro contato e ritmo recente quando essas bases estiverem consistentes, sem transformar a estimativa em promessa. Concluido em 2026-07-07: `studyCycleMetrics` calcula ritmo recente dos ultimos 7 dias a partir de `topics.first_studied_at`, exige pelo menos 2 primeiros contatos para projetar fechamento e retorna `historico insuficiente` quando a base e fraca. A pagina Revisoes passa duracoes reais de `study_sessions` filtradas por `cycle_id` e `contact_type = first_contact`; duracoes ausentes, zeradas ou negativas nao entram na media. Ciclo/Painel continuam sem inventar duracao quando essa fonte nao estiver carregada.
  - [x] Reutilizar a mesma fonte de calculo nas paginas Ciclo, Revisoes e Painel para impedir numeros divergentes entre telas. Concluido em 2026-07-07: `studyCycleMetrics` passou a expor `buildStudyCyclePaceMetrics` e `pace` como contrato canonico; o Painel delega `buildDashboardPace` para essa fonte, a Ciclo usa `user_cycles.exam_date` quando existir e a pagina Revisoes mostra a mesma leitura de dias/topicos/revisoes sem previsao inventada.
  - [x] Corrigir o escopo canonico das metricas contextuais para impedir vazamento de historico global quando o usuario troca/carrega edital no ciclo: Painel (`Sua trajetoria`, `Consistencia recente`), Revisoes (`Tendencia de estudos`, `Engajamento semanal`) e qualquer resumo de ritmo/contexto devem filtrar apenas topicos ativos/visiveis do `user_cycles.ciclo_atual`. Implementacao aplicada em Dashboard, Revisoes, `useCycleStatsData`, `useRealStatistics` e pagina Ciclo; topicos sem `difficulty_level` nao entram mais automaticamente como `medio`; tempo total de Estatisticas deixou de inflar dado real com estimativa por dificuldade. Spec em `docs/superpowers/specs/2026-06-22-cycle-analytics-scope-design.md`.

## Painel de decisao do aluno

- [x] Redesenhar `/dashboard` como painel de decisao, priorizando: atrasos, proxima acao, fila curta, ritmo ate a prova e evolucao.
- [x] Usar a fila real de revisoes e a ordem salva do ciclo, sem reordenar materias automaticamente.
- [x] Mostrar concurso carregado no ciclo, data/dias para a prova e estados honestos quando ciclo ou data estiverem ausentes.
- [x] Refinar o primeiro card do Painel: nome do concurso como titulo, cargo abaixo, sem rotulo `Concurso ativo` e sem botao redundante de detalhes; mostrador orbital usa arco apenas como moldura visual e nunca como porcentagem inventada. Quando o nome salvo ja termina com o mesmo cargo, remover apenas essa repeticao visual, preservando os dados originais. Em mobile e tablet, mostrador e tres indicadores formam uma faixa compacta de quatro colunas com tipografia proporcional; no desktop, permanecem em uma composicao horizontal ampla. Validado em sessao autenticada em 390x844, 768x900 e 1280x720, dark/light, sem overflow horizontal; indicador de revisoes atrasadas manteve navegacao para `/revisoes`.
  - [x] Reaproveitar a linguagem visual de `Meus Editais` no cabecalho, com icones de concurso e cargo, capitalizar rotulos operacionais e restringir o conteudo interno do mostrador pequeno para nao ultrapassar o circulo.
  - [x] Validacao visual autenticada realizada em 2026-07-02 no Painel: desktop e mobile sem overflow horizontal; tema claro confirmado no desktop.
- [x] Criar `Melhor proxima acao` com justificativa baseada no estado real da revisao/ciclo e acesso direto ao fluxo correspondente.
  - [x] Refinar a composicao para reduzir altura e peso visual: recomendacao, base cientifica e acoes permanecem visiveis; justificativas ficam em coluna compacta no desktop e disclosure no mobile.
  - [x] Recriar a composicao no modelo premium aprovado pelo usuario: fundo azul profundo com degradê, imagem/icone cerebral como apoio visual, trilha de justificativas, CTA principal e acesso ao topico. O nome do topico foi reduzido e limitado por hierarquia para nao dominar o card.
- [x] Criar fila unica por prioridade para revisoes atrasadas, revisoes de hoje e proximo topico do ciclo.
  - [x] Refinar `Hoje, em ordem` como lista operacional continua, sem cards altos por item, mantendo prioridade, topico, materia, prazo e acao na mesma linha.
  - [x] Substituir `Hoje, em ordem` por `Fila de prioridade`, no modelo aprovado: faixas por Atrasadas, Para hoje, Ciclo de estudos e Cobranca alta, com contagens reais e item representativo clicavel para cada classe.
- [x] Criar lembretes operacionais com inclusao inline, data e conclusao por checkbox.
  - [x] Recriar `Ultimos lembretes` no modelo limpo aprovado: lista leve, checkbox circular, trilho colorido por item, `Ver todos` e campo compacto para adicionar lembrete com data.
  - [x] Refinar `Ultimos lembretes` para a densidade da referencia: checkbox circular com contraste reforcado em light/dark, linhas compactas, formulario em uma unica linha e data selecionada por popover compacto. Validado em sessao autenticada em 2026-07-02: desktop claro e mobile dark sem overflow, formulario em uma linha e estado vazio legivel.
  - [x] Adicionar ao estado vazio de `Ultimos lembretes` a ilustracao aprovada de bloco de notas com lapis, compacta, transparente e legivel em light/dark; integrada sem alterar formulario ou historico, com fallback por icone, teste focado e validacao em light/dark e mobile.
  - [x] Destacar a data de hoje no calendario de novo lembrete e substituir a seta da linha por `X` com confirmacao de exclusao definitiva; delete no Supabase usa `id` + `user_id` e a policy `ALL` autenticada do banco preserva ownership. A validacao ponta a ponta criou e removeu um lembrete temporario, confirmou zero registros restantes e tambem corrigiu o deslocamento de fuso para preservar a data civil escolhida.
  - [x] Corrigir regressao visual da lista expandida de lembretes: overflow horizontal eliminado ao alinhar coluna e acao em 20 px e bloquear overflow no eixo X; `X` reduzido para traco fino de 12 px, sem caixa de hover, mantendo foco acessivel. Validacao real confirmou `scrollWidth` igual a `clientWidth` (268 px), sem erros no console.
  - [x] Persistir historico confiavel dos lembretes: `created_at` para criacao e nova coluna `completed_at` controlada por trigger ao concluir/reabrir. Migration `20260622002946_add_general_reminders_completed_at.sql` aplicada ao banco conectado; lembretes antigos concluidos sem historico exibem estado honesto.
  - [x] Expandir `Ver todos` dentro do proprio card, exibindo pendentes e concluidos com data de criacao e conclusao, mantendo rolagem interna para nao alongar indefinidamente o Painel. Validado em sessao autenticada em 2026-07-02 com lista expandida e botao `Recolher`, sem overflow horizontal.
- [x] Criar trajetoria com periodos de 7, 14 e 30 dias, detalhe clicavel por dia, progresso do edital e distribuicao real de dificuldade.
  - [x] Reaproximar a trajetoria do conceito visual aprovado: grafico de barras com dia/data, legenda e tooltip detalhado; progresso em anel com legenda; dificuldade em aneis; painel unico com divisorias e sem cards aninhados.
  - [x] Refinar `Ritmo ate a prova` com anel contextual, topicos/revisoes e ritmos diarios reais, sem exibir porcentagem de ritmo inventada.
  - [x] Recriar `Ritmo inteligente` conforme o modelo aprovado: duas metricas lado a lado para topicos novos e revisoes, ritmo necessario, media real dos ultimos sete dias, status honesto e minigraficos. Validado em sessao autenticada em 2026-07-02: estado de data vencida aparece honesto, CTA `Atualizar data da prova` fica coerente e mobile nao sobrepoe conteudo.
  - [x] Corrigir a faixa explicativa de `Ritmo inteligente`: com calculo valido, o CTA enganoso `Revisar data da prova` foi removido e a faixa ficou apenas informativa; sem data mostra `Definir data da prova`, com data vencida mostra `Atualizar data da prova` e sem ciclo mostra `Abrir Ciclo de Estudos`, todos com destinos coerentes. Regra coberta por teste e estado real de 121 dias validado no navegador sem CTA.
  - [x] Tornar o ritmo necessario compreensivel quando for menor que uma unidade por dia: o calculo preserva precisao e troca `0,0/0,1 por dia` por cadencia natural (`1 a cada N dias`), mantendo taxa diaria quando igual ou maior que 1. No estado real validado, mostra `1 a cada 40 dias` para topicos e `1 a cada 12 dias` para revisoes, sem erros no console.
  - [x] Reorganizar a hierarquia final do Painel: concurso e progresso do edital no topo; Melhor proxima acao, Fila de prioridade e Ultimos lembretes na segunda linha; Sua trajetoria com Ritmo inteligente, Mapa de dificuldade e Mapa de cobranca; Consistencia recente em card separado com 7/14/30 dias. Validado em sessao autenticada em 2026-07-02 no desktop claro/dark e mobile dark, sem overflow horizontal.
  - [x] Validar se a tipografia compacta de Melhor proxima acao e Fila de prioridade preserva leitura em nomes longos nos breakpoints desktop, tablet e mobile. Validacao autenticada em 2026-07-02 confirmou leitura em desktop e mobile com o ciclo `pces - OIP + PMES - SOLDADO + bombeiro es - combatente`.
  - [x] Complementar `Consistencia recente` com detalhe real do dia dentro do mesmo card: grafico a esquerda, estudados e revisados a direita, selecao por barra ou calendario e estado vazio honesto. Validado em sessao autenticada em 2026-07-02: grafico, legenda, resumo agregado e lista de topicos aparecem sem corte em mobile.
  - [x] Refinar a selecao de data em `Consistencia recente`: clique repetido desmarca, calendario oferece `Hoje` e `Limpar`, hoje recebe destaque proprio, troca de 7/14/30 dias retorna ao periodo atual e nomes longos usam coluna/ponto de corte uniforme. Lista interna mantem rolagem para muitos topicos e CTA `Ver tudo` abre o detalhe completo do dia. Validado em sessao autenticada em 2026-07-02 com `Ver tudo`/`Recolher` e sem overflow.
  - [x] Definir hoje como data-base permanente de `Consistencia recente`: a tela abre em hoje mesmo sem atividade; outra data so aparece apos selecao explicita; limpar, repetir o clique ou trocar 7/14/30 dias retorna para hoje.
  - [x] Corrigir a regra de mercado de `Consistencia recente`: 7/14/30 dias mostram resumo agregado do periodo; clique em barra/calendario abre um dia; limpar ou repetir clique volta ao resumo; `Hoje` abre explicitamente o dia atual. Remover contorno borrado da barra selecionada e tornar tooltip apenas informativo, afastado e sem capturar clique. Validado visualmente em 2026-07-02.
  - [x] Refinar a interacao de `Consistencia recente`: selecao usa violeta exclusivo, sem confundir com as faixas de desempenho; toda a coluna do dia deve ser clicavel inclusive em `0h`; eixo recebe respiro entre barra, dia e data; `Ver tudo` expande a lista agregada dentro do card com rolagem interna e permite `Recolher`. Validado em sessao autenticada em 2026-07-02, painel sem crescimento indevido e sem overflow horizontal.
- [x] Adicionar ao Painel um `Mapa de cobranca` com dados persistidos de `topics.incidence_level`, distribuicao baixa/media/alta apenas entre topicos analisados, cobertura honesta do edital e cruzamento acionavel de alta cobranca com revisao atrasada, topico nao iniciado e topico em revisao. Implementacao concluida antes de `Sua trajetoria`: violeta representa apenas incidencia, vermelho atraso, ambar primeiro contato pendente, azul acompanhamento e CTA primario; as linhas zeradas sao omitidas, prioridades levam para Revisoes/Ciclo e a tipografia permanece compacta com simplificacao dos CTAs em telas menores. Validado em sessao autenticada em 2026-07-02 com estado honesto `Nenhum topico classificado ainda`, sem inventar dado e sem overflow em mobile.
- [x] Validar visualmente o Painel em desktop, tablet e mobile, dark e light, sem overflow horizontal e sem erros relevantes no console.
  - [x] Revalidar visualmente a ultima rodada autenticada do Painel apos o usuario abrir a tela logado: validado em 2026-07-02 no navegador do app com dashboard desktop/mobile, tema claro desktop, sem overflow horizontal e sem erros relevantes de console.
- [ ] Definir a apresentacao quando o ciclo tiver mais de um edital ativo; a primeira versao usa o primeiro edital retornado pelo ciclo como contexto principal.
- [ ] Definir semanticamente a metrica `ciclos anteriores` antes de exibir em `Meus Editais > Carregar Edital`: decidir se representa cargas anteriores do edital no ciclo, rodadas completas de primeiro contato, blocos de revisao ou outro evento persistido. Nao mostrar essa contagem enquanto nao houver fonte confiavel e nome de produto claro.
- [ ] Levar os cards antigos que o usuario deseja preservar para `/reveal-cards` antes de remover definitivamente componentes legados do repositorio.

## Estrutura geral da pagina

### Layout

- [x] Topo horizontal premium.
- [x] Coluna esquerda com fila do ciclo existente.
- [x] Coluna direita com resumo e insights do edital.
- [x] Resumo de ritmo do ciclo sem card semanal separado; semana/retomados removidos por nao agregarem leitura clara neste momento.
- [x] Ajustar linguagem do resumo diario/semanal para evitar termos vagos como `mais movimento`, previsoes absurdas e metricas sem acao clara.
- [x] Usar a mesma fonte da pagina de revisoes para o contador de revisoes pendentes, evitando divergencia entre ciclo e revisoes.
- [x] Mover a previsao calculada para dentro do card do ciclo e explicitar que ela se refere a marcar materias da fila, nao a concluir todo o edital.
- [x] Remover a leitura de revisoes pendentes da lateral do ciclo por gerar duvida entre revisoes de hoje e atrasadas; essa leitura fica na pagina de revisoes.
- [x] Apresentar a previsao do ciclo como mensagem leve com icone, nao como uma caixa extra.
- [x] Otimizar o card de ciclo com materias marcadas e topicos novos lado a lado.
- [x] Renomear `Topicos novos` para `Topicos iniciados` e restringir comparacao com ciclo anterior aos topicos, sem comparar quantidade de materias marcada.
- [x] Trocar comparacao com sinais `+/-` por texto claro: `a mais`, `a menos` ou `mesmo volume`, evitando parecer marcador ou erro visual.
- [x] Corrigir carregamento de estatisticas de revisao em lotes para evitar erro 400 do Supabase quando o ciclo/usuario tem centenas de topicos.
- [x] Tornar marcar/voltar materia no ciclo robusto para materias unificadas, removendo IDs equivalentes antigos e salvando o ID visivel da fila.
- [x] Tornar a leitura visual de materia fechada robusta para IDs equivalentes de unificacao, evitando contador subir enquanto a linha continua como `Em andamento`.
- [x] Corrigir regressao semantica do botao `Novo Ciclo` quando todas as materias ja tiveram primeiro contato: a Ciclo nao oferece novo ciclo nesse estado, porque nao ha topico novo para iniciar. A tela passa a mostrar `Primeiro contato finalizado`, resumo de materias/topicos iniciados, revisoes atrasadas/hoje/futuras/sem agenda, tempo registrado por materia via `topic_review_history.study_duration_minutes` e CTA principal para Revisoes conforme a urgencia. O fluxo nao limpa `user_cycles`, topicos, merges, revisoes nem historico, preservando editais mesclados/removidos/recarregados. Testes focados e build passaram.
- [x] Corrigir escopo do tempo registrado na pagina Ciclo: a consulta de `topic_review_history.study_duration_minutes` agora recebe somente IDs de topicos ativos/visiveis do ciclo renderizado, evitando que historico preservado de edital removido seja tratado como metrica ativa. Progresso consolidado por merge continua aparecendo apenas quando foi sincronizado no topico sobrevivente.
- [x] Preservar estado recuperavel do ciclo ao remover o ultimo edital: a RPC `atomic_archive_edital_from_cycle` nao deleta mais `user_cycles`; ela esvazia `ciclo_atual`, mantem `materias_estudadas_ciclo` e preserva o mesmo `user_cycle_id` para eventos/insights, permitindo que materias marcadas manualmente como concluidas voltem ao recarregar o edital. A limpeza global tambem deixou de apagar ciclos sem edital ativo quando houver estado manual, rotacoes concluidas ou mapa de unificacao recuperavel.
- [x] Corrigir descarte de mesclagem recuperada no carregamento do ciclo: ao clicar em `Descartar`, o modal nao fecha mais; o rascunho pendente e removido e o fluxo reabre a preparacao como um clique novo em `Carregar ciclo`, ignorando o estado recuperado stale.
- [x] Preservar `is_active` no carregamento dos topicos para impedir que topicos inativos entrem em cobertura, sinais, insights e contagens do ciclo.
- [x] Responsividade real da pagina de ciclo validada em desktop, tablet e mobile sem overflow horizontal.
- [x] Corrigir responsividade da pagina de ciclo em tablet/mobile (~768px e abaixo): grid quebra o painel estrategico abaixo antes de espremer a fila; painel aparece no mobile e o atalho flutuante usa o titulo real do painel.
- [x] Validar visualmente a rodada de layout da pagina de ciclo: padding global padronizado, busca inline por icone, `Modo edital` ao lado de `Detalhes`, painel estrategico abaixo em larguras intermediarias e barra discreta de atalho para o painel quando houver alerta/sugestao.
- [x] Validar ajuste fino do cabecalho da pagina de ciclo: no mobile, titulo em cima e acoes compactas alinhadas; no modo edital, mostrar titulo `Modo edital`; remover badge textual `Em andamento no ciclo`; manter apenas o titulo/atalho flutuante `Painel estrategico do edital` sem repetir o titulo dentro do painel.
- [x] Validar modo `Organizar` da fila: mobile e desktop sem alca lateral por padrao; arraste fica bloqueado fora do modo; ao ativar, alcas aparecem com estado premium para reordenar, materias recolhem automaticamente e sugestao de fila fecha o modo organizar antes de aplicar nova ordem.
- [x] Padronizar tooltips premium na pagina de ciclo: cabecalho, linhas de materias, topicos, modo edital e painel estrategico usam Radix Tooltip nas acoes principais; validacao confirmou tooltip premium no cabecalho e removeu `title` nativo dos controles internos do ciclo.
- [x] Migrar o shell global do app para o bloco oficial shadcn de sidebar inset, preservando rotas, permissoes, header, notificacoes, tema, timer, menu do usuario e comportamento mobile. Bloco `sidebar-08` instalado inicialmente, mas o alvo correto passou a ser `sidebar-07` por causa do trilho de icones recolhido; base compativel com Tailwind v3 aplicada, build aprovado e validacao funcional feita em desktop, mobile e tablet. No mobile, os links do menu agora fecham o drawer apos navegar.
- [x] Corrigir warning de acessibilidade do menu mobile do shadcn/sidebar adicionando titulo e descricao ocultos ao Sheet do componente base.
- [x] Corrigir o plano exibido no rodape do novo menu: validacao em mobile confirmou que o drawer nao mostra mais `Plano Free` para owner/admin e exibe `Proprietario`.

### Visual

Direcao para a rodada final de layout:

- Minimalista.
- Dark mode elegante.
- Alto espacamento.
- Sem excesso de bordas.
- Sem glow exagerado.
- Hierarquia visual clara.
- Legibilidade forte em nomes longos de materias/topicos.
- [x] Definir paleta global 60-30-10 para a primeira rodada visual do ciclo: base neutra premium, superficies neutras, azul como identidade/acao, verde apenas para concluido e tangerine apenas para atencao.
- [x] Padronizar card comum da fila com token neutro global, sem borda azul no hover; card concluido permanece como variante semantica verde.
- [x] Formalizar a tabela de tokens visuais por papel antes de expandir para outras telas: titulo de pagina, titulo de coluna, titulo dentro de card, texto principal, texto secundario, texto de botao, input, modal, dropdown, borda, sombra, blur, radius e estados hover/focus/disabled.
- [x] Auditar inputs, modais e dropdowns da pagina de ciclo em dark/light para remover cores antigas ou estranhas que ainda venham de componentes isolados na rodada inicial: Dialog, AlertDialog, Input, Textarea, Select, Dropdown, Popover, Tooltip, Card, Combobox e ConfirmModal apontam para tokens globais.
- [x] Formalizar escala tipografica responsiva por papel na Ciclo: titulo de pagina, titulo de secao, titulo de card, label, metadado, botao, input e corpo; garantir uso consistente de `rem`, `clamp()` quando fizer sentido, line-height adequado e quebras sem sobreposicao em mobile/tablet/desktop. A regra de produto e nao esconder informacao essencial por falta de espaco; quando o texto nao couber, a estrutura deve quebrar para coluna/linha seguinte antes de estourar a caixa. Classes globais criadas para page title/subtitle, section title, card title, meta, eyebrow, caption, body small, control, action xs e badge; Ciclo recebeu a primeira aplicacao nos pontos criticos. Apos validacao visual do usuario, a escala foi reduzida para recuperar a sensacao anterior: textos menores, minimalistas e menos grosseiros, com menos `font-black` em labels, mensagens e numeros. Validado em 390px, 768px e 1440px sem overflow horizontal real e sem sobreposicao. Expansao para outras paginas fica no item de promover padroes globais.
- [x] Auditar breakpoints da pagina de ciclo contra a referencia mobile-first: mobile base, tablet, laptop e desktop; validar grids flexiveis, wrapping, largura minima de cards/controles, inputs e botoes sem cortes. Padrao esperado: cards e grupos de metricas passam para uma coluna antes de comprimir texto; nada deve ficar sobreposto, oculto indevidamente ou saindo da box, como observado em cards de outras paginas quando a largura reduz. Barra interna da Ciclo, busca, titulos de materia, linhas de topico e painel estrategico foram validados em 390px, 768px e 1440px; toolbar ficou em uma linha quando ha espaco e sem overflow horizontal.
- [x] Validar visualmente a nova paleta da pagina de ciclo em dark e light antes de expandir para outras paginas. Reavaliar bordas dos cards: evitar roxo estranho; recuperar a sensacao do azul premium anterior onde fizer sentido, com borda discreta e coerente com a identidade, sem virar glow forte. Borda dos cards comuns do ciclo voltou para azul discreto de identidade; usuario aprovou dark, light e bordas dos cards. A hierarquia visual foi separada por papel nos dois modos: na `Fila do Ciclo`, card de materia usa superficie principal/elevada e linhas de topico usam superficie recuada/silenciosa; no `Edital Verticalizado`, `Mapa do edital` usa superficie estrategica propria com degradê premium compacto, cabecalho de materia usa superficie elevada e linhas de topico usam superficie recuada/silenciosa. Apos iteracoes visuais, o azul foi removido do repouso do card de materia porque competia com o verde de concluido. O padrao atual e neutro premium: materia comum usa a mesma paleta do topico, apenas um degrau mais densa/elevada, com borda neutra; topico fica mais limpo e recuado; verde fica reservado para concluido. No light, a superficie da materia recebeu um cinza frio discreto para nao ficar identica ao fundo dos topicos; no dark, a materia ficou levemente mais clara que a linha, sem voltar para glow ou borda colorida.
- [x] Refatorar a pagina `src/pages/Subjects.tsx` depois da aprovacao visual da Ciclo: o arquivo acumulou cerca de 4.600 linhas e concentra UI, leitura de dados, modais, painel estrategico, fila, modo edital, handlers e varios render helpers. Primeira extração aplicada em 2026-07-02: `CycleWorkspaceHeader` e `CycleEmptyState` saíram da página, com teste focado e build aprovados. Segunda extração aplicada em 2026-07-02: `StrategicEditalPanel` saiu da página com contrato de props tipado, teste focado, build e `git diff --check` aprovados. Terceira extração aplicada em 2026-07-02: `CycleFirstContactFinishedPanel` saiu da página preservando a decisão de navegação na página, com teste focado, build e `git diff --check` aprovados. Quarta extração aplicada em 2026-07-03: `CycleSubjectCard` saiu da página como casca da matéria, mantendo `CycleTopicRow` como próximo recorte isolado; teste focado, build e `git diff --check` aprovados. Quinta extração aplicada em 2026-07-03: `CycleTopicRow` saiu da página com CTAs de iniciar, ir para revisão, notas, IA, incidência e status visual; teste focado, build e `git diff --check` aprovados. Sexta extração aplicada em 2026-07-03: `VerticalEditalView` saiu da página preservando `renderVerticalEditalSummary` como slot, com teste focado, build e `git diff --check` aprovados. Setima extração aplicada em 2026-07-03: `useStudyCycleStrategicData` concentrou estatísticas visuais, painel estratégico, maturidade, alertas, métricas, insights, transição e sugestão de fila; teste focado, build e `git diff --check` aprovados. Oitava extração aplicada em 2026-07-03: `useCycleStudyEventRecorder` isolou contexto/snapshot/posição e persistência de eventos do ciclo; teste focado, build e `git diff --check` aprovados. Nona extração aplicada em 2026-07-03: `useCycleQueueOrderActions` isolou reordenação por drag and drop e aplicação de sugestão estratégica, preservando mutação otimista, rollback, cache local, evento do ciclo e persistência no Supabase; teste focado, build e `git diff --check` aprovados. Decima extração aplicada em 2026-07-03: `VerticalEditalSummary` isolou o cabeçalho/resumo do modo edital com métricas reais, ritmo, progresso e CTA de revisões; teste focado, build e `git diff --check` aprovados. Decima primeira extração aplicada em 2026-07-03: `useSubjectWeightEditor` e `SubjectWeightControl` tiraram da página o estado, parse, persistência Supabase, cache local e UI de edição inline do peso da matéria; teste focado, build e `git diff --check` aprovados. Decima segunda extração aplicada em 2026-07-03: `useCycleSubjectCompletionActions` isolou marcar matéria como estudada, voltar matéria para fila, confirmação da última pendência, mutação otimista, rollback, cache local, evento do ciclo e persistência em `user_cycles`; teste focado, build e `git diff --check` aprovados. Decima terceira etapa aplicada em 2026-07-03: removido código morto de edição/desativação/restauração de tópico que não tinha gatilho na UI atual da Ciclo; teste focado, build e `git diff --check` aprovados. Decima quarta etapa aplicada em 2026-07-03: removido código morto de criação inline de tópico (`newTopicTexts`/`handleSaveNewTopic`) que também não tinha gatilho na UI atual da Ciclo; teste focado, build e `git diff --check` aprovados. Decima quinta extração aplicada em 2026-07-03: `useStudyCyclePageData` isolou carregamento inicial, cache de matérias/ciclo, retry, refresh integrado com origens e listeners externos da página; teste focado, build e `git diff --check` aprovados. Decima sexta extração aplicada em 2026-07-08: `useTopicStudySessionFlow` tirou da página o abre/pausa/retoma do cronômetro compartilhado entre Ciclo e Revisões, preservando o modal de dificuldade como ponto único de fechamento da sessão; testes focados, lint e `git diff --check` aprovados. Decima setima extração aplicada em 2026-07-08: `useCycleTopicFocus` e `focusCycleSubject` concentraram o foco por navegação/atalho estratégico, removendo duplicação de expandir, destacar e rolar até matéria/tópico; testes focados, lint e `git diff --check` aprovados. Extracao complementar aplicada em 2026-07-08: `useCycleStrategicAlertActions` tirou da página a orquestração dos CTAs do painel estratégico, preservando foco na matéria, redirecionamento para editais, abertura do editor de data e disparo do primeiro contato pelo mesmo fluxo da Ciclo; testes focados, lint e `git diff --check` aprovados. Extracao complementar aplicada em 2026-07-08: `useCycleSearch` tirou da página a busca da fila com filtro por matéria/tópico, expansão automática dos matches ativos e restauração das matérias expandidas ao limpar a busca; testes focados, lint e `git diff --check` aprovados. Extracao complementar aplicada em 2026-07-08: `useCycleViewMode` tirou da página a troca entre modo ciclo/editais e a lógica de expandir/recolher por visualização, preservando a abertura automática das matérias no modo edital e o toggle expandir/recolher por contexto; testes focados, lint e `git diff --check` aprovados. Extracao complementar aplicada em 2026-07-08: removido código morto de CRUD manual de matéria na Ciclo (`getOrCreateUserEdital`, criação inline, edição inline e ocultação local) que não tinha mais gatilho na UI atual; testes focados, lint e `git diff --check` aprovados. Extracao complementar aplicada em 2026-07-08: removidos `TopicsModal`, `CreateTopicModal` e `ContentUploadModal` da página Ciclo junto com estados/efeitos órfãos, porque não havia mais nenhum gatilho de abertura na UI atual; testes focados, lint e `git diff --check` aprovados. Extracao complementar aplicada em 2026-07-08: `useCycleVerticalViewData` tirou da página a derivação do modo edital, incluindo filtro vertical de tópicos, seleção do edital-resumo e rótulos por matéria no panorama vertical; testes focados, lint e `git diff --check` aprovados. Extracao complementar aplicada em 2026-07-09: `cycleSearchQuery` consolidou a semântica da busca e a toolbar/estado inativo (`CycleSearchControl`, `CycleViewModeButton`, `CycleReorderButton`, `CycleInactiveState`) saíram da página, reduzindo helpers de apresentação locais; testes focados, lint e `git diff --check` aprovados. Extracao complementar aplicada em 2026-07-09: `CycleWorkspaceHeaderSection`, `CycleVerticalWorkspaceSection`, `CycleSubjectWeightRenderer` e `CycleTooltip` tiraram de `Subjects.tsx` a montagem do cabeçalho da workspace, o resumo/visão vertical do edital, a casca da edição de peso e o helper local de tooltip; testes focados, lint e `git diff --check` aprovados. Extracao complementar aplicada em 2026-07-09: `CycleQueueList` e `StrategicPanelSection` tiraram da página o miolo renderizado da fila do ciclo e a casca de navegação da lateral estratégica, preservando DnD, CTAs, dock mobile e callbacks de foco/estudo/revisão; testes focados, lint e `git diff --check` aprovados. Extracao complementar aplicada em 2026-07-09: `SubjectsModalLayer` tirou da página a camada de modais de notas, conclusão do ciclo, data da prova, reset, remoção de edital, exclusão permanente, importação, avaliação de dificuldade, reversão de mesclagem e edição de matérias do edital, preservando os callbacks de domínio na página; testes focados, lint, build e `git diff --check` aprovados. Extracao complementar aplicada em 2026-07-09: `useSubjectsCycleRuntime` tirou da página a busca de estatísticas de revisão, minutos estudados, snapshots/eventos do ciclo e o callback de registro confirmado da sessão, preservando o refresh dos eventos via `useCycleStudyEventRecorder`; testes focados, lint, build e `git diff --check` aprovados. Extracao complementar aplicada em 2026-07-09: `useCycleExpansionState`, `useStrategicDockVisibility`, `useSubjectsNavigationState`, `useSubjectMergeReversion` e `useSubjectsDifficultyHandlers` tiraram da página a persistência de expansão do ciclo, medição do dock estratégico, estado de navegação/importação/busca, reversão de mesclagem e fechamento do modal de dificuldade; removidos estados mortos `mergedSubjectsMap` e `toastShown`; suíte focada, lint, build e `git diff --check` aprovados. Extracao complementar aplicada em 2026-07-09: `useCycleSubjectListState`, `useCycleQueueDisplayState`, `useSubjectsEditalModalState`, `useCycleReorderControls` e `cycleTopicPresentation` tiraram da página a derivação principal de matérias/status, ordenação/paginação da fila, estado/conversão do modal de matérias do edital, controles de reordenação e utilitários puros de apresentação de tópicos; removido helper morto `getCyclePosition`; suíte focada com 24 arquivos/58 testes, lint, build e `git diff --check` aprovados. Fechamento aplicado em 2026-07-10: `StudyCycleWorkspace`, `StudyCycleLoadError`, `useCycleTopicNotesState` e `useCycleUnloadConfirmation` tiraram da rota a composição final da workspace, estado de erro, anotações de tópicos e confirmação de remoção de edital; imports legados foram limpos. A `Subjects.tsx` caiu para cerca de 698 linhas e ficou dentro da regra de página fina para este recorte; suíte focada com 28 arquivos/66 testes, lint, build e `git diff --check` aprovados. A camada visual maior da Ciclo ficou separada e os blocos de fila, peso, visão vertical, header, lateral estratégica, modais, runtime de métricas/eventos, expansão, dock, navegação e handlers críticos saíram da página; ainda falta reduzir a orquestração restante sem misturar com mudança de comportamento.
  - Decima sexta extração aplicada em 2026-07-03: `useCycleEditalUnload` isolou confirmação, loading, chamada ao serviço seguro de arquivamento, invalidação de cache/eventos e refresh após remover edital do ciclo; teste unitário do hook, serviço e integração da página aprovados.
  - Decima setima extração aplicada em 2026-07-03: `usePermanentSubjectDeletion` e `subjectPermanentDeletionService` tiraram da página a exclusão definitiva de matéria, passaram a propagar erros do Supabase e corrigiram o caso em que remover a matéria de um edital apagava indevidamente a mesma matéria compartilhada por outros editais. Testes cobrem remoção de um vínculo, exclusão total e interrupção após erro.
  - [x] Tornar a exclusão definitiva de matéria atômica no banco por RPC transacional depois de reconciliar o histórico local/remoto de migrations. Concluído em 2026-07-03: `atomic_delete_subject` usa `security invoker`, valida `auth.uid()`/ownership, remove vínculos e referências do ciclo, dissolve merges afetados e executa a exclusão em uma única transação; frontend usa somente a RPC. Prova remota com rollback validou unlink compartilhado, bloqueio `42501` e exclusão total sem persistir fixtures.
  - Decima oitava extração aplicada em 2026-07-03: `useStudyCycleReset` e `studyCycleResetService` isolaram confirmação, mutação otimista, cache local, persistência, rollback, feedback e evento global do reset do ciclo; testes cobrem sucesso e falha de persistência sem falso fechamento do modal.
  - Decima nona extração aplicada em 2026-07-03: `useEditalImport` e `editalImportService` substituíram o callback inline de importação da Ciclo. O fluxo agora cria primeiro o edital, vincula `edital_id` em matérias/tópicos, preserva pesos, origem e metadados, atualiza `subject_ids`/`active_subject_ids`, relança falhas para o modal não fechar com falso sucesso e tenta remover o edital incompleto em caso de erro intermediário.
  - [x] Migrar `handleImportDone` de `src/pages/Editais.tsx` para `editalImportService`, preservando a abertura automática do modal de matérias em criação manual e eliminando a segunda implementação do mesmo fluxo. Concluído em 2026-07-03: `Editais.tsx` mantém apenas orquestração de loading, refresh, eventos, modal e feedback; criação de edital, matérias, tópicos, metadados, vínculos e limpeza compensatória usam o serviço compartilhado.
- [ ] Promover padroes locais da Ciclo para componentes/tokens globais quando a tela for aprovada: header de coluna com toolbar, metric cards, badges semanticas, linha de topico/lista, botoes compactos de acao e estado vazio. Evitar duplicar classes longas como `text-[...]`, `shadow-[...]` e composicoes de card em outras paginas.
- [x] Ajustar tooltip global para ter radius proprio mais premium, sem herdar `rounded-control` dos botoes/inputs, preservando legibilidade e contraste em dark/light. Codigo aplicado, build/lint aprovados e usuario validou visualmente o novo formato.
- [x] Formalizar padrao semantico dos botoes de navegacao/decisao: Voltar, Cancelar, Avancar/Proximo, Confirmar e acoes destrutivas, incluindo variante, hover, peso visual e uso em modais/confirm dialogs. Variantes globais iniciais criadas em `Button` (`confirm`, `success`, `warning`, `destructive`, `cancel`, `quiet`); botoes usam `rounded-xl` consistente e borda de 1px; todos os hovers clareiam levemente dentro da cor semantica da propria acao e mudam apenas fundo/borda/texto, sem blur, glow, escala ou sombra externa; `Voltar/Cancelar` seguem classe semantica secundaria neutra com borda/superficie visivel no dark, sem preenchimento azul; `Confirmar/Finalizar` usam classe semantica primaria somente quando habilitados; botoes primarios desabilitados usam `:disabled` em CSS para virar superficie neutra, texto apagado e sem sombra; acoes destrutivas terciarias usam texto vermelho com area de hover. Usuario validou o padrao visual de botoes/modais na Ciclo.
- [x] Formalizar padrao do cabecalho global de pagina: remover breadcrumb `Menu /`, mostrar somente nome da pagina com subtitulo curto logo abaixo, usando hierarquia compacta e responsiva para desktop/tablet/mobile. Aplicado inicialmente no `AppLayout` com descricao da pagina Ciclo; acoes reorganizadas para `iniciar/timer`, `anotacoes`, `notificacoes`; tema claro/escuro movido para o rodape da sidebar; titulo do mobile deixou de depender de truncamento agressivo e checagem em 390px confirmou titulo visivel sem overflow. Usuario validou cabecalho global e sidebar para a etapa da Ciclo.
- [x] Definir regra responsiva para subtitulo do cabecalho global: em desktop/tablet amplo, exibir subtitulo curto; em mobile, preferir subtitulo de uma linha com ellipsis apenas se ainda comunicar algo util; se ficar cortado demais ou competir com acoes do topo, ocultar o subtitulo e preservar nome da pagina + acoes principais. Evitar subtitulo truncado que pareca texto quebrado. Implementado no `AppLayout`: em mobile o subtitulo fica oculto para nao aparecer cortado; em telas maiores ele aparece com limite de linhas controlado. Validado em 390px sem overflow horizontal.
- [x] Formalizar padrao da navegacao lateral: remover rotulos textuais de secao quando a separacao visual por linha for suficiente; separar paginas de estudo, conta/ajuda e administracao por `SidebarSeparator`; `Conta` aponta para `/conta`, `Ajuda` abre a aba de feedback do painel lateral, notificacoes ficam apenas no sino da barra superior e o dropdown do usuario fica enxuto com `Conta` e `Sair`. Aplicado inicialmente na sidebar global; separadores passaram a usar degradê com pontas finas, tema foi movido para o rodape, estados ativo/hover ficaram mais discretos. Usuario validou sidebar para a etapa da Ciclo.
- [x] Corrigir responsividade da pagina `Meus Editais` quando o padrao da Ciclo for expandido. Concluido em 2026-07-04: atalhos de criacao usam grid auto-fit com largura minima honesta, cards de edital quebram para uma coluna antes de espremer conteudo, metricas tem fallback para uma coluna em telas muito estreitas e botoes principais do card distribuem largura de forma simetrica. Validado em sessao autenticada no navegador do app em 1280x900, 768x900 com menu lateral aberto e 390x844, sem overflow horizontal, sem elementos saindo da viewport e sem erros/warnings de console.
- [x] Evoluir a pagina `/conta` para concentrar perfil, assinatura e preferencias: a aba `Assinatura` deve mostrar, em modo leitura inicialmente, plano atual, status, ciclo mensal/anual, valor, metodo de pagamento, inicio, vencimento/proxima cobranca e historico recente de faturas/pagamentos quando houver dados. Usar `user_subscriptions` como base local (`asaas_customer_id`, `asaas_subscription_id`, `billing_type`, datas e status) e criar uma Edge Function propria para o aluno, por exemplo `asaas-account`, que valide o usuario autenticado e consulte apenas a propria assinatura no Asaas. Nao reutilizar `asaas-admin` para aluno comum e nunca chamar Asaas direto do frontend. Acoes como cancelar, trocar plano, alterar pagamento e emitir segunda via ficam para etapa posterior, depois da leitura estar confiavel. Concluido em 2026-07-08: `/conta` ganhou aba `Assinatura`, hook com TanStack Query, service tipado e Edge Function `asaas-account` com JWT obrigatorio, leitura por `user.id`, fallback local quando Asaas nao estiver disponivel e pagamentos recentes em modo read-only. Testes focados, `deno check`, lint e build aprovados. Ainda falta deployar a Edge Function no Supabase antes de validar em producao.
- [x] Reavaliar hover dos cards de materia e das linhas de topico: card de materia deve ter hover neutro de superficie/borda; topico deve usar hover muito sutil apenas se ajudar leitura de lista, sem puxar a cor semantica/linha do status. Hover de materia foi neutralizado para nao clarear acima da superficie do card; linhas de topico usam superficie mais baixa e hover discreto; usuario aprovou cards e linhas.
- [x] Separar o estado de expandir/recolher por visualizacao: no modo Ciclo, manter exatamente as materias abertas/recolhidas como o aluno deixou, inclusive ao alternar para o Edital Verticalizado, mudar de pagina e voltar; no Edital Verticalizado, abrir todas as materias ao entrar para preservar o panorama geral, mas permitir que o botao `Expandir/Recolher` controle apenas essa visualizacao. O controle deixou de compartilhar um unico `expandedSubjectIds` entre os modos; o estado do modo Ciclo agora é persistido por usuario no navegador e o estado do Edital Verticalizado é temporario do modo.
- [x] Ajustar layout das linhas de topico em mobile/tablet estreito: `Iniciar`, `Continuar`, `Revisoes` e equivalentes nao devem forcar quebra/altura extra na linha do topico. Em larguras pequenas, mostrar apenas icone com `aria-label` e tooltip quando disponivel; em desktop/larguras confortaveis, manter icone + texto. A altura da linha deve ser governada principalmente pelo tamanho do nome do topico e pela quebra natural do texto, nao pela largura do botao. O badge/metadado de prioridade/cobranca do topico, como `Cobranca alta`, precisa de posicao responsiva propria: em desktop pode ficar na mesma linha do nome quando couber; em mobile deve ir para uma segunda linha compacta abaixo do nome ou virar icone/sinal discreto com tooltip, sem empurrar o CTA nem competir com o texto principal. Preservar area de toque minima e estado visual claro. Implementado na Ciclo: CTAs ficam icon-only em 390px, mantem `aria-label`, badge de cobranca fica fora da disputa direta com o CTA e a checagem no navegador confirmou ausencia de texto visivel longo nos botoes mobile.
- [x] Ajustar quebra dos nomes de topico para evitar palavra/numero orfao, como `1` sozinho na linha de baixo quando houver alternativa melhor de quebra. Aplicado `text-wrap: pretty` e `overflow-wrap: break-word` nos titulos de topico da Fila do Ciclo e do Edital Verticalizado.
- [x] Ajustar a barra fixa/atalho do `Painel estrategico do edital` no mobile: ela deve ocupar a mesma largura e alinhamento horizontal do bloco original da pagina, respeitando o padding do conteudo e a sidebar/inset quando existir. A barra deve desaparecer exatamente quando, durante a rolagem, o titulo original do painel entrar na mesma area visual da barra fixa (ou passar por tras dela), evitando duplicidade de dois titulos iguais na tela. Implementar com `IntersectionObserver`/sentinela ou medicao de retangulos do titulo original e da barra fixa, em vez de threshold manual fragil por scroll. Considerar safe-area inferior do navegador mobile e nao cobrir conteudo essencial. Implementacao corrigida para inicializar depois do carregamento e acompanhar rolagem do documento, janela e viewport movel. Dock e titulo original agora usam exatamente o mesmo conteudo e caixa; o `Ver` foi removido para nao alterar a largura. O dock permanece montado e faz transicao curta de opacidade/deslocamento quando o topo do titulo original se alinha ao topo dele, criando uma troca natural tipo ima em vez de desaparecer antes. Validado em 375x667: ambos medem 238x31px na mesma coordenada horizontal; dock visivel com o titulo 12px abaixo e oculto ao alinhamento. Usuario validou como suficiente para fechar a etapa visual da Ciclo.
- [ ] Substituir o padrao atual de toast/snackbar de acoes, incluindo a mensagem verde como `Ordem do ciclo atualizada!`, por um componente mais premium. Definir antes de implementar: posicao desktop/mobile, duracao, cores semanticas, icone, acao de desfazer quando fizer sentido, empilhamento, acessibilidade e diferenca entre sucesso, erro, alerta e informacao. Usuario pretende procurar um componente pronto para servir de referencia.

## Topo da pagina

O topo deve transmitir progresso estrategico, clareza e continuidade.

### Manter

- [x] Nome do ciclo.
- [x] Edital atual ou editais ativos no ciclo.

### Adicionar

- [x] Cobertura do edital.
  - Exemplo: `61% do edital iniciado`.
  - Barra horizontal discreta e premium.
- [x] Resumo estrategico.
  - Materias adicionadas.
  - Topicos iniciados.
  - Previsao para iniciar todo o edital.
- [x] Texto estrategico discreto.
  - Texto atual: `A fila respeita sua ordem atual e destaca pesos e incidencia para apoiar sua decisao.`

### Remover/evitar

- [x] Excesso de cards tecnicos.
- [x] Visual administrativo.
- [x] Blocos gigantes de recomendacao IA.
- [x] Repetir uma unica "melhor materia agora" como se fosse comando obrigatorio.

## Coluna esquerda: fila estrategica do ciclo

Esta coluna e o foco principal da pagina.

### Decisao

- [x] A fila ja existe.
- [x] A fila deve preservar a ordem escolhida pelo aluno.
- [x] A fila deve parecer mais viva, estrategica e premium.
- [x] O sistema deve sugerir/alertar, mas nao reorganizar sozinho.

### Cards das materias

Cada materia deve possuir:

- [x] Nome da materia.
- [x] Quantidade/progresso de topicos resumido na linha da materia.
- [x] Indicador percentual de exploracao foi descartado por redundar com `iniciados/total`.
- [x] Peso no edital como metadado discreto na linha da materia, na mesma fonte das demais informacoes. Ajustado apos validacao: a linha de peso usa a mesma classe tipografica dos demais metadados e o editor inline ficou mais compacto, com labels explicitos `Questoes` e `Pontos`, evitando campos sem nome e controles grandes no mobile.
  - Exemplos:
    - `Peso alto`
    - `Peso medio`
    - `Peso baixo`
- [x] Quando nao houver peso, mostrar icone discreto clicavel em vez de badge textual chamativa.
- [x] Tooltip ou texto curto quando o peso for desconhecido.
  - Exemplo: `Peso nao identificado no edital. Voce pode preencher depois.`
- [x] Simplificar o resumo de topicos da materia para mostrar apenas um estado principal por vez, evitando informacoes juntas como `3 topicos` + `1/3 iniciados`. Prioridade de exibicao: se todos os topicos estiverem realmente concluidos, mostrar `3/3 topicos concluidos`; se a materia estiver fechada no ciclo por acao real/manual, mostrar `3/10 topicos neste ciclo` quando esse dado for o mais util; se todos os topicos ja foram iniciados por historico, mostrar `3/3 topicos iniciados`, nao `Concluida no ciclo`; caso normal, mostrar `1/3 topicos iniciados` ou `0/3 topicos iniciados`. Nao mostrar progresso geral, progresso do ciclo e conclusao real ao mesmo tempo; detalhes extras ficam em tooltip/painel. Implementado na Ciclo; removido tambem o chip redundante `Concluida no ciclo` da linha de metadados quando o resumo ja mostra o estado principal.
- [x] Melhorar o indicador de materia unificada/mesclada na linha da materia: o icone solto foi trocado por chip discreto `Materia unificada` no desktop e icone com aria-label claro no mobile. Tooltip explica que a materia junta topicos equivalentes de outros editais e que o clique permite revisar/desfazer a mesclagem. A acao continua abrindo o modal de desfazer mesclagem sem expandir/recolher a materia. Cobertura: `CycleSubjectCard.test.tsx`; lint, build e `git diff --check` aprovados.
- [x] Corrigir nome do ciclo apos remover edital de um ciclo composto: o frontend sincroniza o nome restante depois da RPC de arquivamento para evitar manter edital removido no titulo, por exemplo remover Bombeiro de `PCES + PMES + Bombeiro` deixa apenas os editais ativos. Cobertura: `cycleUnloadService.test.ts`.
- [ ] Consolidar a sincronizacao do nome do ciclo dentro da RPC `atomic_archive_edital_from_cycle` em uma etapa segura de banco, sem reescrever a funcao grande no meio de bugfix. O frontend ja tem fallback, mas a fonte definitiva deveria ser transacional no backend.

### Estados visuais das materias

- [x] Materia em andamento com destaque suave quando tem topicos iniciados no ciclo.
- [x] Materia concluida com cabecalho verde discreto e icone check.
- [x] Materia concluida automaticamente recolhida.
- [x] Materia concluida permanecendo na mesma fila.
- [x] Remover area separada `Concluidas no ciclo`.
- [x] Definir regra futura: quando todos os topicos ativos da materia estiverem iniciados, a materia fica `Concluida no ciclo`, sempre no final da fila, sem gravar isso como clique manual do aluno.
- [x] Diferenciar visualmente materia `Concluida no ciclo` por marcacao manual ou todos os topicos iniciados de materia `Concluida no edital` por todos os topicos ativos realmente concluidos/revisoes finalizadas. O verde de concluido foi reforcado para nao parecer apagado/desabilitado: token `success` ficou mais vivo, borda e fundo de materia concluida ganharam contraste maior em light/dark, mantendo o estado positivo sem glow forte.

## Topicos

Cada topico deve possuir:

- [x] Nome do topico.
- [x] Estado visual:
  - Nao iniciado.
  - Iniciado.
  - Em revisao.
  - Concluido.
- [x] Indicador de incidencia recente quando houver dado.
- [x] O indicador deve usar `topics.total_volume` quando disponivel.
- [x] Quando nao houver volume/incidencia, nao inventar dado nem exibir frase de ausencia.
- [x] Corrigir padrao da barrinha/status do topico: na fila normal da Ciclo nao existe conceito visual de `topico na lixeira`; se um topico foi excluido/oculto, ele nao deve aparecer nesta lista. A barrinha deve representar apenas estados reais do fluxo de estudo: nao iniciado, iniciado/primeiro contato, em revisao e concluido. Definir cores e tooltip/aria-label para cada estado, evitando vermelho/inativo no fluxo normal. Implementado na Ciclo: lista renderiza apenas topicos ativos, removeu `NA LIXEIRA`/`inativo` do fluxo normal, barrinha recebeu tooltip/aria-label e os estados passaram a ser `Nao iniciado`, `Iniciado`, `Em revisao` e `Concluido`. Area de hover da barrinha foi ampliada para 16px por 28px com cursor de ajuda, para o tooltip ficar descobrivel mesmo quando a linha visual e fina. Corrigida tambem a inconsistencia em que o CTA usava historico/contatos para exibir `Continuar`, mas a barrinha ainda podia ficar cinza como `Nao iniciado`; agora ambos usam a mesma leitura de `hasStarted`. Ajustado depois de validacao visual: estados que levam ao mesmo CTA `Continuar` nao devem usar dois azuis diferentes; `Iniciado` e `Em revisao` compartilham o mesmo azul de acao/barrinha, deixando a diferenca para tooltip/aria-label.

## Botoes dos topicos

Substituir icones confusos por CTAs claros.

- [x] Topico nao iniciado: `Iniciar estudo`.
- [x] Topico iniciado: `Continuar estudo`.
- [x] Topico em revisao: `Revisoes`.
- [x] Topico concluido: `Concluido`.
- [x] Priorizar clareza acima de minimalismo extremo.
- [x] Garantir que os botoes nao quebrem no mobile: validacao em 390px confirmou controles compactos sem overflow horizontal.
- [x] Ao iniciar um topico pelo ciclo, alinhar o fluxo com a experiencia de iniciar uma revisao: deve abrir/seguir um modo de estudo com contador, controle de tempo e estados equivalentes ao fluxo de revisao, em vez de apenas marcar o primeiro contato de forma seca. Concluido em 2026-07-08 apos definicao do produto: `Iniciar estudo` na Ciclo e no modo vertical passa a usar o mesmo contrato de sessao das Revisoes via `active_study_timers`, com bloqueio de outra sessao ativa, retomada de sessao pausada e abertura do `DifficultyRatingModal` apenas ao parar/avaliar. O primeiro contato e `study_sessions.contact_type = first_contact` continuam sendo registrados so na confirmacao final; nao ha mais marcacao seca ao primeiro clique. Cobertura: `useTopicStudySessionFlow.test.tsx` e `Subjects.integration.test.tsx`.
- [x] Corrigir fechamento da sessao de primeiro contato ao confirmar dificuldade na Ciclo: confirmar agora marca a atualizacao como local, registra primeiro contato/evento, encerra o timer compartilhado, fecha o modal e libera iniciar outro topico. O modal da Ciclo tambem recebeu `Retomar` e `Descartar Sessao`, com comportamento equivalente ao de Revisoes. Ajuste complementar em 2026-07-10: o descarte passou a usar mensagem de sessao clara em Ciclo e Revisoes, em vez de `Descartada.`, e o foco pelo cronometro tambem reaplica destaque visual no topico ativo da pagina Revisoes. Cobertura: `useSubjectsDifficultyHandlers.test.tsx`, `RevisoesList.test.ts`, `SubjectsModalLayer.test.tsx` e `Subjects.integration.test.tsx`.
- [x] Criar regra transversal de bloqueio para operacoes incompatíveis com contador ativo ou pausado: nao permitir finalizar ciclo, concluir materia, resetar ciclo, remover edital do ciclo, trocar/substituir ciclo ou executar operacoes destrutivas/estruturais enquanto existir `activeTimer`. Concluido em 2026-07-10: criado guard compartilhado com toast premium; aplicado na Ciclo para concluir/retornar materia, finalizar ciclo, resetar ciclo, remover edital, excluir materia, reordenar fila e aplicar sugestao estrategica; aplicado em Meus Editais para carregar/substituir/mesclar/remover/excluir edital; aplicado no modal Ver Materias para criar/excluir/restaurar topicos, criar/excluir materia e ativar/ocultar materia. A UI orienta o aluno a finalizar, retomar ou descartar a sessao antes de prosseguir. Ajuste complementar: quando o bloqueio acontece na Ciclo mas a sessao ativa e uma revisao, o foco volta para `/revisoes` em vez de abrir o topico dentro da Ciclo; primeiro contato continua focando a Ciclo. `StudyCycleContent` apareceu como componente legado sem importacao ativa em `src` e nao foi alterado.
- [x] Corrigir sobra do estado apos marcar a ultima materia do ciclo quando ainda existem topicos sem primeiro contato: a regra de produto e que o ciclo termina quando todas as materias da rodada foram marcadas, sem exigir iniciar todos os topicos em um unico ciclo. O painel passa a mostrar `Ciclo encerrado`, resumo do que foi feito na rodada e CTA `Novo ciclo`; a acao limpa apenas `materias_estudadas_ciclo`, incrementa `ciclos_realizados`, atualiza `data_inicio_ciclo` e preserva topicos, revisoes, historico e editais mesclados. O foco do cronometro continua preservando a materia expandida e aplicando destaque visual no topico alvo.

## Coluna direita: resumo estrategico do edital

A coluna direita nao deve ser dashboard tecnico. Ela deve funcionar como painel estrategico do edital.

### Secao 1: Resumo do ciclo

- [x] Materias em andamento.
- [x] Materias concluidas.
- [x] Topicos estudados/iniciados.
- [x] Percentual do edital iniciado.
- [x] Materias com peso conhecido.
- [x] Ciclo atual.
- [x] Painel direito organizado como placar estrategico visual, nao como tabela de linhas.

### Secao 2: Insights estrategicos

Mostrar insights curtos e uteis:

- [x] Materia mais trabalhada fica apenas no card do ciclo, nao em Insights.
- [x] Maior peso pendente, somente se houver peso conhecido.
- [x] Topico com maior sinal de cobranca analisado, somente se houver sinal bruto analisado.
- [x] Materia com maior sinal de cobranca, somente se houver sinal bruto analisado.
- [x] Topico com maior sinal de cobranca, somente entre topicos analisados.
- [ ] Reavaliar exibicao de `menos cobrado` apenas quando o mapa de cobranca do edital estiver suficientemente completo; com analise parcial, esse dado pode enganar.
- [x] Materia com mais topicos nao iniciados, somente se houver pendencia real.
- [x] Estado vazio honesto quando nao houver insights calculaveis.
- [x] Nao exibir alerta para peso/incidencia ausente enquanto a IA ainda vai gerar esses dados.
- [x] Remover alerta grande de `Peso incompleto` da lateral quando ele apenas replica a badge `Sem peso` da linha da materia.
- [x] Integrar padroes observados ao card unico de Insights, evitando blocos redundantes na lateral.
- [x] Lapidar linguagem dos alertas/insights para termos compreensiveis ao aluno, sem expor jargoes como `evento` ou `sinal`.
- [x] Remover duplicidade entre sugestao de fila e insight equivalente quando ambos apontam para a mesma materia.
- [x] Restringir aplicacao da sugestao de fila ao `user_cycles.id` carregado, evitando atualizar outro ciclo ativo por acidente.
- [x] Explicar no estado vazio dos Insights que ciclos antigos podem nao ter eventos salvos e que o sistema precisa de uso recente/sinal confiavel para inferir padrao.
- [x] Remover bloco separado de `Sinais de cobranca` da lateral; sinais confiaveis entram no card unico de Insights.
- [x] Remover `Comparacao futura` da area de atencao estrategica, pois ausencia de snapshot nao e alerta acionavel.

Nao mostrar nesta secao:

- Retencao.
- FSRS.
- Esquecimento.
- Estabilidade de memoria.
- Atrasos detalhados de revisao.

### Secao 3: Forecast leve

- [x] Previsao simples para iniciar todos os topicos.
- [x] Texto sugerido: `Mantendo o ritmo atual, todos os topicos serao iniciados em aproximadamente X dias.`
- [x] Visual elegante e discreto.
- [x] Se nao houver dados suficientes, nao mostrar previsao calculada.

## Peso das materias

### Estado atual

- [x] O banco possui:
  - `subjects.exam_weight_points`
  - `subjects.exam_weight_questions`
  - `subjects.exam_weight_percentage`
  - `subjects.exam_weight_raw`
- [x] A importacao de edital ja tenta extrair pesos de forma conservadora.
- [x] Existe edicao manual de peso na tela de edital.
- [x] A pagina do ciclo consome esses campos no tipo `StudyCycleSubject`.
- [x] A pagina do ciclo mostra peso visualmente.

### Regra de produto

- [x] Nunca inventar peso.
- [x] Peso ausente nao bloqueia a pagina.
- [x] Peso ausente aparece como estado neutro, sem alerta.
- [x] Peso ausente pode ser preenchido diretamente na pagina de ciclo clicando em `Sem peso`.
- [x] No atalho inline do ciclo, o aluno preenche apenas questoes e pontos; percentual fica como dado extraido do edital ou calculado pelo sistema quando houver total conhecido.
- [x] Redesenhar a edicao inline de peso/metadado na propria linha da materia: ao clicar no peso existente ou no estado sem peso, ocultar temporariamente o conteudo da linha de metadados da materia e mostrar campos compactos `Questoes` e `Pontos` com acoes de confirmar/cancelar no mesmo espaco. Os inputs devem parecer parte do card, nao formulario bruto, com labels/placeholder claros e area de toque adequada. Apos salvar, mostrar uma confirmacao inline preenchendo a largura da linha da materia, com cor semantica discreta e botao para fechar antecipadamente; fechar automaticamente apos poucos segundos e restaurar a linha normal. Nao depender do toast/snackbar para essa confirmacao, pois o padrao de toast sera redesenhado depois. Implementado na Ciclo: os campos aparecem no lugar da linha de metadados da materia, usam rotulos visiveis `Questoes` e `Pontos`, placeholders numericos discretos, botoes compactos com tooltip e confirmacao inline `Peso atualizado` com fechamento manual/automatico. Enquanto a edicao esta aberta, a acao lateral de concluir materia fica oculta para nao competir visualmente nem parecer parte do formulario.
- [ ] Se houver peso por bloco, nao distribuir automaticamente entre disciplinas. Fica para a revisao futura da extracao/importacao de edital.
- [x] Permitir que o aluno ajuste manualmente em local apropriado.
- [x] Na pagina de ciclo, usar peso apenas como sinal/alerta, nao para reordenar automaticamente.

## Incidencia dos topicos

### Estado atual

- [x] Existe base inicial via `topics.total_volume`.
- [x] O sistema de GUT/Google/IA ainda esta em evolucao.
- [x] O tipo `StudyCycleTopic` carrega `total_volume`.
- [x] A UI do ciclo mostra incidencia/cobranca apenas quando o sinal pode ser exibido com seguranca.

### Regra de produto

- [x] Incidencia deve ser sinal visual, nao regra obrigatoria de ordem.
- [x] Mostrar baixa/media/alta apenas quando o topico possuir `incidence_level` persistido; nao inferir faixa diretamente do volume bruto na UI.
- [x] Manter o score numerico fora da interface do aluno enquanto o motor estiver em validacao; usar apenas a faixa qualitativa persistida.
- [x] Reavaliacao concluida em 2026-06-20: baixa/media/alta podem ser exibidas para topicos processados e classificados, mantendo a nota detalhada apenas no banco/auditoria.
- [x] Quando nao existir dado, nao mostrar badge de incidencia na linha do topico.
- [x] Quando existir classificacao persistida, mostrar a faixa qualitativa; manter volume bruto restrito ao painel operacional/auditoria.
- [x] Corrigir a regressao no modal de materias do edital: removida a contagem de `questoes` baseada em `topics.total_volume`; o modal agora usa `topics.incidence_level` e exibe apenas cobranca baixa/media/alta quando o nivel existir.
- [x] Nao exigir finalizar 100% a IA de incidencia antes de melhorar a pagina.
- [x] Preparar a pagina para receber dados melhores depois sem refatoracao grande.

## Alertas estrategicos

Os alertas devem apoiar decisao, nao comandar o aluno.

- [x] Criar um motor local de alertas estrategicos com severidade, motivo, dado usado e acao sugerida.
- [x] Avisar quando uma materia com peso conhecido estiver pouco iniciada.
- [x] Avisar quando existir materia importante ainda sem nenhum topico iniciado.
- [x] Avisar quando houver topicos com maior volume/incidencia ainda nao iniciados.
- [ ] Avisar quando houver topicos com maior volume/incidencia iniciados, mas ainda nao revisados, se houver dado de revisao confiavel.
- [x] Avisar quando a data da prova estiver proxima e ainda existirem topicos relevantes abertos.
- [x] Avisar quando o aluno estiver concentrando estudo em poucas materias e deixando outras relevantes paradas.
- [x] Avisar quando uma materia sem peso impedir calculo melhor, apenas se houver acao direta para preencher o peso.
- [ ] Avisar sobre incidencia ausente apenas se houver caminho claro para rodar/gerar analise da IA.
- [x] Oferecer acao clara sem alterar a fila automaticamente.
- [x] Evitar alertas grandes, repetitivos ou culpabilizantes.
- [x] Nao transformar ausencia de peso/incidencia em problema quando a IA ainda nao gerou dado e o aluno nao pode agir.

### Alertas calculaveis agora

Estes podem ser implementados com os dados ja disponiveis na pagina:

- [x] Materia com peso conhecido e nenhum topico iniciado.
- [x] Materia com maior peso pendente ainda fora do avanco do ciclo.
- [x] Topicos com maior `total_volume` ainda nao iniciados.
- [x] Materia mais cobrada com baixa quantidade de topicos iniciados.
- [x] Data da prova proxima usando `user_editais.exam_date`, quando existir.
- [x] Ciclo sem historico salvo ainda: explicar que comparacoes aparecem depois do primeiro giro fechado.

### Alertas que dependem de dado novo ou regra futura

- [ ] Topico importante nao revisado: depende de definir regra de revisao relevante para a pagina de ciclo sem misturar FSRS.
- [x] Concentracao excessiva em uma materia: depende de historico de eventos de estudo por materia/topico, nao apenas snapshot final.
- [x] Sugestao de reorganizar fila: depende de historico de uso da ordem do ciclo e prioridade calculada.
- [x] Fechar automaticamente materia com todos os topicos iniciados no ciclo, sem confundir com materia realmente concluida no edital.

## Historico de uso da fila e ordem real de estudo

A ordem salva em `user_cycles.ciclo_atual` mostra a ordem escolhida pelo aluno. Ela nao mostra como ele realmente estudou.

### Objetivo

- [x] Registrar eventos reais de estudo no ciclo: topico novo iniciado, topico ja aberto revisado/retomado, materia marcada como estudada, materia devolvida para fila, ordem alterada manualmente.
- [x] Guardar posicao da materia no ciclo no momento do evento.
- [x] Guardar ciclo atual, edital, materia, topico, tipo de evento e data/hora.
- [x] Usar esse historico para detectar padroes:
  - [x] materia importante sempre empurrada para o fim;
  - [x] aluno estudando fora da prioridade escolhida;
  - [x] materias de alto peso ignoradas em ciclos seguidos;
  - [x] muitas revisoes/retornos a topicos ja abertos e poucos topicos novos;
  - fila manual muito desalinhada com peso/incidencia.

### Regra de produto

- [x] O sistema pode sugerir reorganizacao da fila, mas nao deve aplicar automaticamente.
- [x] Sugestao deve explicar o motivo: peso, incidencia, data da prova, atraso de cobertura ou historico de negligencia.
- [x] A acao deve ser reversivel e manual: `Aplicar sugestao`, `Ver motivo`, `Ignorar por enquanto`.

### Persistencia sugerida

- [x] Criar tabela futura `cycle_study_events`.
- [x] Campos sugeridos:
  - `id`
  - `user_id`
  - `user_cycle_id`
  - `cycle_number`
  - `event_type`
  - `subject_id`
  - `topic_id`
  - `edital_id`
  - `subject_position`
  - `cycle_order_snapshot`
  - `created_at`
- [x] Nao usar apenas `last_reviewed_at` para medir avanco do ciclo, pois continuar/revisar topico antigo nao e topico novo.

## Metas, ritmo e previsao de fechamento

Esta camada transforma o ciclo em orientacao diaria concreta: quantos topicos iniciar, quantas revisoes fazer e qual risco existe ate a prova.

### Dados ja existentes que devem ser reaproveitados

- [x] `topics.first_studied_at`: identifica quando o topico foi iniciado pela primeira vez.
- [x] `topics.review_count`: quantidade atual de contatos/revisoes do topico.
- [x] `topics.next_review`: agenda atual de revisao.
- [x] `topics.completed` / `review_stage = Concluído`: identifica topico concluido.
- [x] `topic_review_history.reviewed_at`: historico real de revisoes feitas.
- [x] `topic_review_history.difficulty_numeric`: dificuldade registrada na revisao.
- [x] `topic_review_history.study_duration_minutes`: tempo de estudo quando disponivel.
- [x] `study_sessions`: sessoes por dia, materia, topicos estudados, horario e duracao.
- [x] `user_study_analytics`: agregados comportamentais dos ultimos periodos.
- [x] `user_editais.exam_date`: data da prova quando informada.
- [x] `cycle_rotation_snapshots`: resumo ao fechar ciclos.

### Dados que nao devem ser duplicados

- [ ] Nao criar nova tabela para contar revisoes feitas se `topic_review_history` ja responde.
- [ ] Nao criar nova tabela para sessoes gerais se `study_sessions` ja responde.
- [x] Nao salvar contadores diarios permanentes se eles puderem ser calculados de eventos/historico; o resumo semanal do ciclo calcula a partir de eventos recentes.
- [ ] Evitar campos agregados que podem ficar inconsistentes com `topics` e `topic_review_history`.

### Lacunas reais de dados

- [x] Eventos especificos da fila/ciclo existem para: iniciar topico novo, revisar/retomar topico antigo, marcar materia, devolver materia, reordenar fila.
- [x] O sistema salva `cycle_number` e `subject_position` em cada acao de estudo registrada no ciclo.
- [x] `study_sessions` registra sessoes e agora diferencia a natureza do contato. Concluido em 2026-07-05: migration `20260705221040_add_study_session_contact_type.sql` adicionou `contact_type` com default conservador `unclassified` e `CHECK` para `first_contact`, `review`, `continuation`, `mixed`, `subject_session` e `unclassified`. As 44 sessoes historicas permaneceram sem classificacao inventada. Novos contatos de topico usam o estado anterior (`review_count`/`first_studied_at`) para separar primeiro contato de revisao; sessoes agregadas recebem `mixed` ou `subject_session`; fluxos sem evidencia continuam `unclassified`. `topic_review_history` permanece fonte SRS e `cycle_study_events` permanece fonte de comportamento/ordem do ciclo. Schema remoto, constraint, RLS ativo e policy de ownership foram verificados depois do deploy. Migration complementar `20260705221633_secure_study_session_access_and_indexes.sql` removeu acesso `anon`, manteve `authenticated`/`service_role` com RLS e criou indices para `cycle_id` e `edital_id`; advisor filtrado ficou sem alertas de performance para `study_sessions` e sem exposicao anonima.
- [x] Resolver alerta Supabase advisor `pg_graphql_authenticated_table_exposed` para `public.study_sessions` sem quebrar o frontend. Concluido em 2026-07-07: o codigo foi auditado e nao ha uso de GraphQL no app; os acessos atuais a `study_sessions` ainda passam por `supabase-js`/PostgREST com RLS de ownership. A migration `20260707121121_disable_unused_pg_graphql.sql` remove a extensao `pg_graphql`, eliminando a superficie GraphQL que gerava o alerta sem revogar os grants `authenticated` necessarios ao frontend. Migration aplicada no Supabase remoto em 2026-07-07 via `supabase db push --linked`; `supabase migration list --linked` confirmou `20260707121121` em local/remoto, `pg_extension` retornou zero linhas para `pg_graphql` e o advisor de seguranca filtrado nao retornou `pg_graphql`, `study_sessions` nem `authenticated_table_exposed`. Se GraphQL virar requisito futuro, reativar a extensao deve vir junto de uma fronteira explicita de API, RLS revisada e novo advisor limpo.
- [x] Fechar execucao anonima de funcoes `SECURITY DEFINER`. Concluido em 2026-07-07: o precheck anonimo `check_email_exists` foi removido do cadastro para evitar enumeracao de email; a migration `20260707121748_restrict_security_definer_rpc_execution.sql` revoga `PUBLIC`, `anon` e `authenticated` de todas as funcoes `SECURITY DEFINER` em `public`, concede `service_role` e devolve `authenticated` apenas para a superficie RPC usada pelo app/RLS. Migration aplicada no Supabase remoto; `schema_migrations` confirmou `20260707121748`; `has_function_privilege` confirmou `anon_admin_purge=false`, `anon_check_email_exists=false`, `authenticated_atomic_cycle_load=true` e `authenticated_check_email_exists=false`; advisor caiu de 59 alertas `anon_security_definer_function_executable` para zero.
- [x] Reduzir alertas `authenticated_security_definer_function_executable` sem revogacao cega. Concluido parcialmente em 2026-07-07 com reducao segura de 44 para 16 alertas: migrations `20260707123500_tighten_unused_authenticated_security_definer_grants.sql`, `20260707123905_move_admin_security_definer_rpcs_to_edge.sql`, `20260707124113_add_admin_rpc_dispatcher.sql`, `20260707124258_revoke_authenticated_use_coupon_rpc.sql` e `20260707124414_move_validate_coupon_to_edge.sql` aplicadas no Supabase remoto. Admin/assinaturas/auditoria/erros sistemicos passaram pela Edge Function `admin-rpc`, que valida admin/owner e usa dispatcher privado `admin_rpc_dispatch` para preservar `auth.uid()` das funcoes legadas; cupom passou pela Edge Function `billing-rpc`. Verificado: `auth_admin_purge=false`, `auth_set_user_role=false`, `auth_get_audit_logs=false`, `auth_validate_coupon=false`, `auth_use_coupon=false`, `service_* = true`; advisors ficaram com `anon_security_definer_function_executable=0` e `authenticated_security_definer_function_executable=16`.
- [x] Remover listagem publica do bucket `email-assets`. Concluido em 2026-07-07: migration `20260707125432_remove_email_assets_listing_policy.sql` removeu a policy `Email assets are publicly accessible` de `storage.objects`; URLs publicas do bucket continuam funcionando por configuracao de bucket publico, mas clientes deixam de listar todos os objetos. Verificado no remoto: consulta em `pg_policies` nao retornou policies para `email-assets` e advisor nao retornou `public_bucket_allows_listing`.
- [x] Mover RPCs de usuario para Edge Function antes de revogar execucao direta no REST. Concluido em 2026-07-07: frontend publicado em producao na Vercel (`https://vourevisar.vercel.app`), Edge Function `user-rpc` deployada e migration `20260707125900_move_user_security_definer_rpcs_to_edge.sql` aplicada no Supabase remoto. Verificado: `schema_migrations` contem `20260707125900`; `atomic_cycle_load`, `atomic_archive_edital_from_cycle`, `sync_topic_merge_progress`, `get_subscription_info`, `get_user_ai_limits`, `get_unified_*`, `log_admin_error`, `log_user_event` e `user_rpc_dispatch` estao com `authenticated_execute=false` e `service_execute=true`. Advisor caiu de 16 para 7 alertas `authenticated_security_definer_function_executable`.
- [x] Zerar os 7 alertas restantes `authenticated_security_definer_function_executable` sem revogacao cega. Concluido em 2026-07-07: migration `20260707132120_move_role_rls_helpers_to_private_schema.sql` criou equivalentes em schema `private`, atualizou policies de RLS para `private.has_role*`, `private.is_admin`, `private.is_owner` e `private.is_user_active`, e revogou `PUBLIC`/`anon`/`authenticated` das funcoes publicas. Verificado no remoto: helpers publicos ficaram com `authenticated_execute=false`, helpers privados continuam com `authenticated_execute=true` para uso em RLS, policies apontam para `private.*`, e advisor de seguranca nao retorna mais `authenticated_security_definer_function_executable`.
- [ ] Habilitar `auth_leaked_password_protection` no Supabase Auth. A Management API oficial expõe `password_hibp_enabled`, mas nao ha token local acessivel para aplicar PATCH com seguranca nesta maquina; nao usar `supabase config push` sem prova de paridade do config remoto. Acao operacional: Supabase Dashboard > Authentication > Settings/Password Security > Prevent use of leaked passwords. Disponivel no plano Pro ou superior.
- [x] Confirmar schema atual de `study_sessions`: concluido em 2026-07-05. A migration de criacao `20250608011928_563f1fe1-c11e-46a4-a248-a50ef31e0374.sql`, os tipos gerados e consulta direta ao `information_schema.columns` no banco de producao confirmaram somente `session_duration_minutes` (`integer`, nullable); `duration_minutes` nao existe. `useRealStatistics` deixou de declarar/criar fallback para a coluna fantasma e passou a normalizar todos os agregados pela fonte real com utilitario puro e teste focado.
- [ ] Ainda nao existe uma tabela/agregado diario especifico para meta calculada do ciclo.

### Calculos viaveis agora

- [x] Topicos iniciados hoje: contar `topics.first_studied_at` no dia.
- [x] Revisoes feitas hoje: contar `topic_review_history.reviewed_at` no dia, excluindo primeiro contato se necessario.
- [x] Revisoes atrasadas: contar `topics.next_review < hoje` e nao concluidos.
- [x] Revisoes de hoje: contar `topics.next_review = hoje` e nao concluidos.
- [x] Revisoes futuras: contar `topics.next_review > hoje` e nao concluidos.
- [x] Topicos ainda nao iniciados: contar topicos ativos sem `first_studied_at` e sem contato.
- [x] Topicos concluidos: contar `completed = true` ou `review_stage = Concluído`.
- [x] Topicos importantes nao iniciados: cruzar `total_volume` e/ou peso da materia com topicos sem inicio.
- [x] Tempo ate fechar primeiro contato do edital: `topicos_nao_iniciados / media_topicos_novos_por_dia`.
- [x] Ritmo minimo ate a prova: `topicos_nao_iniciados / dias_ate_prova`.
- [x] Revisoes minimas do dia: quantidade de `next_review <= hoje`.
- [x] Deficit diario: comparar meta calculada com topicos novos/revisoes feitas hoje.

### Indicadores que o aluno deve ver

- [x] `Hoje`: iniciar X topicos novos para manter o ritmo.
- [x] `Hoje`: revisar Y topicos vencidos/de hoje para manter consistencia.
- [x] `Ate a prova`: iniciar em media X topicos por dia para ver tudo antes da prova.
- [ ] `Risco`: topicos importantes ainda fechados.
- [ ] `Risco`: revisoes atrasadas em topicos relevantes.
- [x] `Ritmo`: voce iniciou X topicos/dia no ciclo atual.
- [x] `Cobertura`: faltam X topicos para primeiro contato no edital.
- [x] `Conclusao`: X topicos concluidos e Y ainda em revisao.

### Maturidade dos alertas

- [x] `cold_start`: sem uso suficiente; mostrar contexto neutro, nao cobranca.
- [x] `started`: alguns topicos iniciados; mostrar metas leves e alertas informativos.
- [x] `active`: uso consistente por alguns dias; mostrar risco, ritmo, deficit e prioridade.
- [x] `historical`: ciclos/eventos suficientes; mostrar comparacoes, padroes e sugestao de reorganizacao.
- [x] Tratar aluno em ciclo antigo sem snapshots como `historico parcial`, evitando parecer bug/cold start quando a persistencia detalhada começou depois.
- [x] Bloquear sugestao de reorganizacao e sinais pesados de cobranca/peso enquanto a maturidade ainda e `cold_start` ou `started`.

### Persistencia recomendada

- [x] Criar `cycle_study_events` para eventos de ciclo e fila, nao para substituir historico de revisao.
- [ ] Opcional futuro: criar `cycle_daily_metrics` apenas como cache/agregado se as consultas ficarem pesadas.
- [ ] `cycle_daily_metrics` sugerido:
  - `user_id`
  - `user_cycle_id`
  - `cycle_number`
  - `metric_date`
  - `topics_started_count`
  - `reviews_done_count`
  - `overdue_reviews_count`
  - `due_reviews_count`
  - `future_reviews_count`
  - `topics_completed_count`
  - `important_unstarted_count`
  - `computed_daily_new_topics_goal`
  - `computed_daily_review_goal`
  - `days_until_exam`
  - `created_at`
  - `updated_at`
- [ ] Preferir calcular sob demanda primeiro; criar cache diario somente se performance ou historico de metas exigir.

### Regras de produto

- [ ] Nao mostrar cobranca pesada no primeiro dia.
- [ ] Nao punir o aluno por edital sem peso/incidencia.
- [ ] Separar meta de topicos novos da meta de revisao.
- [x] Nao misturar "fechar primeiro contato" com "concluir revisoes".
- [x] Corrigir helpers de ciclo/metricas/alertas para nao contar `review_stage = 0` como topico iniciado.
- [x] Separar semantica: `Primeiro contato finalizado` significa todos os topicos ativos iniciados; `Concluida no edital` fica reservado para todos os topicos ativos concluidos no sistema de revisao. Evitar chamar materia/edital de `concluido` quando ainda ha revisao atrasada, de hoje, futura ou sem agenda.
- [x] Consolidar insights e sugestao de fila para ignorar materias ja fechadas no ciclo/edital quando nao ha topico ativo sem primeiro contato.
- [x] Toda previsao deve dizer de onde veio: media dos ultimos dias, dias ate prova ou quantidade pendente.

## Sugestoes de reorganizacao da fila

- [x] Calcular prioridade sugerida sem substituir a ordem atual.
- [ ] Sinais permitidos:
  - peso conhecido da materia;
  - volume/incidencia dos topicos;
  - topicos importantes nao iniciados;
  - data da prova;
  - historico de ciclos anteriores;
  - historico real de eventos da fila.
- [x] Mostrar sugestao apenas quando houver diferenca relevante entre ordem atual e prioridade calculada.
- [x] Nunca sugerir reorganizacao com dado incompleto sem explicar a limitacao.
- [x] Permitir ao aluno aplicar manualmente uma sugestao de ordem.
- [x] Nao sugerir reorganizacao geral quando so uma materia tiver peso conhecido e nao houver incidencia comparavel.
- [x] Nao tratar muitas revisoes como problema quando houver backlog atrasado que justifique revisar.
- [x] Avaliar concentracao por proporcao de avanco dentro da materia, nao apenas por quantidade bruta de eventos.

## Coisas que devem sair ou diminuir nesta pagina

- [x] Reduzir mistura com revisao na superficie principal da fila.
- [x] Remover linguagem de memoria, retencao, estabilidade e esquecimento da pagina de ciclo.
- [x] Reduzir destaque de atraso de revisao na lista de topicos.
- [ ] Evitar banner de mentor pesado nesta tela.
- [ ] Levar detalhes de revisao para a pagina Revisoes.

## Dados e tipos necessarios

- [x] Enriquecer `StudyCycleSubject` com peso:
  - `exam_weight_points`
  - `exam_weight_questions`
  - `exam_weight_percentage`
  - `exam_weight_raw`
  - `strategicWeight.label`
  - `strategicWeight.level`
- [x] Enriquecer `StudyCycleTopic` com incidencia:
  - `totalVolume`
  - `lastSearchContext`
  - `strategicIncidence.level`
  - `strategicIncidence.label`
- [ ] Criar helpers de classificacao:
  - peso alto/medio/baixo/ausente;
  - incidencia alta/media/baixa/nao analisada;
  - cobertura do edital;
  - forecast leve.
- [x] Criar helpers conservadores iniciais:
  - peso informado/sem peso;
  - incidencia analisada/nao analisada;
  - cobertura do edital.
- [x] Manter regra de fallback quando dados estiverem ausentes.

## Ordem sugerida de implementacao

### Fase 1: Dados estrategicos sem mudar layout

- [x] Enriquecer tipos do ciclo com peso e incidencia.
- [x] Ajustar `useStudyCycleData` para carregar e mapear os campos.
- [x] Criar helpers conservadores de peso/incidencia/cobertura.
- [x] Adicionar testes dos helpers.

### Fase 2: Cards e topicos

- [x] Adicionar badge de peso nos cards das materias.
- [x] Remover exploracao percentual do header da materia por redundancia.
- [x] Adicionar incidencia nos topicos.
- [x] Trocar icones por CTAs claros.
- [x] Aplicar os sinais estrategicos na pagina real `src/pages/Subjects.tsx`.
- [x] Recolher materia concluida mantendo na fila.
- [x] Remover area separada de concluidas no ciclo.

### Fase 3: Topo e painel direito

- [x] Criar topo estrategico.
- [x] Criar painel direito com resumo do ciclo.
- [x] Criar insights estrategicos concretos e condicionais.
- [x] Criar forecast leve apenas quando houver ritmo suficiente.
- [x] Salvar resumo do ciclo antes de iniciar o proximo ciclo.
- [ ] Garantir responsividade do layout em mobile/tablet/desktop.

### Fase 3.5: Sistema vivo de alertas

- [x] Criar helper `studyCycleAlerts` separado da UI.
- [x] Criar tipo de alerta com `id`, `severity`, `title`, `message`, `evidence`, `actionLabel` e `actionType`.
- [x] Gerar alertas somente com dados reais disponiveis.
- [x] Implementar primeiro lote:
  - materia com peso conhecido e nenhum topico iniciado;
  - materia com peso conhecido e poucos topicos iniciados;
  - topicos com maior volume ainda nao iniciados;
  - data da prova proxima com topicos relevantes abertos;
  - ciclo sem historico suficiente para comparacao.
- [x] Renderizar alertas no painel direito sem poluir a fila.
- [x] Adicionar testes dos calculos de alerta.
- [x] Garantir que alertas nao aparecem quando o dado base esta ausente.

### Fase 3.5.1: Metas e ritmo do ciclo

- [x] Criar helper `studyCycleMetrics` separado da UI.
- [x] Calcular topicos novos hoje, revisoes feitas hoje, revisoes atrasadas/de hoje/futuras.
- [x] Calcular topicos pendentes, concluidos e importantes ainda nao iniciados.
- [x] Calcular meta diaria de topicos novos ate a prova quando houver data.
- [x] Calcular meta diaria de revisoes pelo backlog vencido/de hoje.
- [x] Calcular previsao de fechamento do primeiro contato pelo ritmo atual.
- [x] Renderizar card `Plano de hoje` no painel direito.
- [x] Adicionar testes dos calculos de meta e ritmo.

### Fase 3.6: Historico real da ordem de estudo

- [x] Criar migracao para `cycle_study_events`.
- [x] Registrar evento ao iniciar topico novo.
- [x] Registrar evento ao revisar/retornar a topico ja iniciado.
- [x] Corrigir nomenclatura: substituir `topic_continued` por `topic_reviewed` nos novos registros, mantendo compatibilidade com eventos antigos.
- [x] Registrar evento ao marcar materia como estudada.
- [x] Registrar evento ao devolver materia para fila.
- [x] Registrar evento ao reordenar materias no ciclo.
- [x] Usar eventos para detectar concentracao ou negligencia de materias importantes.
- [x] Preparar sugestao manual de reorganizacao da fila com base no historico.

### Fase 3.7: Incidencia/cobranca automatizada dos topicos

- [x] Revisar o fluxo atual que gera o valor de cobranca do topico.
- [x] Criar um catalogo compartilhado de incidencia por topico normalizado, banca, cargo/orgao e edital quando aplicavel.
- [x] No processamento automatico atual, tentar preencher `topics.total_volume` a partir do catalogo antes de chamar IA.
- [x] Rodar IA apenas quando nao houver match confiavel no catalogo para o topico processado.
- [ ] Avaliar rodar a analise automaticamente quando o aluno inicia o estudo, desde que:
  - o edital ja esteja carregado;
  - os topicos estejam salvos;
  - nao exista valor confiavel no catalogo;
  - haja controle de custo, fila e rate limit.
- [x] Salvar resultado da IA no catalogo para reaproveitar com outros alunos/editais semelhantes.
- [x] Normalizar nomes de topicos para evitar duplicidade por acento, caixa, pontuacao ou pequenas variacoes.
- [x] Registrar fonte/contexto da incidencia: IA, catalogo, busca manual futura, data da analise, query vencedora e audit log.
- [ ] Nao bloquear o estudo esperando IA; preencher depois e atualizar o painel quando chegar.

### Fase 3.8: Painel operacional de incidencia

Pagina atual de referencia: `/admin/importancia-prova`.

- [ ] Separar a pagina atual em tres areas claras:
  - teste manual de uma materia/topico;
  - processamento autonomo/fila;
  - tabela operacional de topicos.
- [x] Trocar o conceito de "simulador" por painel real de processamento.
- [x] Mostrar contadores reais:
  - total de topicos ativos;
  - topicos com `total_volume > 0`;
  - topicos sem valor de incidencia;
  - topicos preenchidos via catalogo;
  - topicos analisados por IA;
  - topicos pulados/rejeitados;
  - topicos com erro;
  - topicos aguardando processamento;
  - requisicoes/custo usados na janela atual.
- [x] Permitir filtro por status: pendente, catalogo, IA, rejeitado, erro, volume zero.
- [x] Mostrar origem do dado por topico: catalogo, IA, manual ou vazio.
- [x] Mostrar contexto usado: materia, banca, carreira/orgao quando existir, query vencedora e data da analise.
- [x] Separar `volume zero` de `pulado/rejeitado`, para nao tratar busca sem resultado como topico invalido.
- [x] Rejeitar/pular apenas topico invalido, placeholder, codigo solto ou sem sentido; topico valido sem resultado fica como `no_volume`.
- [x] Diferenciar visualmente topico pendente de topico analisado com sinal 0, evitando mostrar `Sinal 0` para o que ainda nem foi processado.
- [x] Mostrar o sinal bruto atribuido ao topico na tabela operacional (`Sinal X`, `Sinal 0` ou `Nao analisado`).
- [x] Nao salvar falha de IA/Google como `Sinal 0`; erro tecnico deve ficar como `error` para nova tentativa.
- [x] Corrigir chamada do worker para o `ai-handler` usando JWT valido do usuario na execucao manual, evitando `UNAUTHORIZED_INVALID_JWT_FORMAT`.
- [x] Ao salvar erro tecnico, limpar `incidence_source`/contexto de sucesso para nao contar erro como analise IA valida.
- [x] Ajustar resultado do lote para exibir erro como erro, nao como `Sem volume`.
- [x] Ajustar contador `Via IA` para nao contar topicos com status `error` como analise valida.
- [x] Tornar a busca mais resiliente: erro tecnico em uma query nao deve derrubar o topico inteiro se outras queries conseguirem retornar dados.
- [x] Marcar topico como erro apenas quando todas as buscas tecnicas falharem.
- [x] Corrigir configuracao do Google Custom Search: erro anterior indicava `Requests to this API customsearch method google.customsearch.v1.CustomSearchService.List are blocked`.
  - O teste manual voltou a processar topicos com valor via IA depois do ajuste da API key/Search Engine ID.
  - Manter monitoramento de erros 403 porque restricao/cota pode voltar a bloquear o metodo.
- [ ] Redesenhar o calculo de cobranca para ser contextual, nao generico:
  - Chave primaria recomendada: topico normalizado + materia normalizada + banca normalizada.
  - Contexto adicional opcional: cargo, orgao, carreira, ano e edital.
  - [x] A Edge Function carrega banca/orgao/cargo/ano no `processing_context`.
  - [x] A Edge Function injeta banca/orgao/cargo/ano no prompt do Gemini que gera termos de busca.
  - [x] A Edge Function injeta banca e, quando houver, orgao/cargo nas queries do Google antes do fallback generico.
  - Estado atual: a busca usa janela padrao de 2 anos (`anosPreferencia = 2`), via filtro `after:<ano atual - 2>`, para priorizar sinal mais recente.
  - [ ] Se a janela de 2 anos gerar muitos falsos `Sem resultado util`, criar fallback controlado: tentar 2 anos primeiro e ampliar para 5 anos apenas quando nao houver sinal.
  - [x] Primeiro reaproveitar catalogo por banca/topico/materia quando existir match confiavel.
  - [ ] Depois reaproveitar por banca/materia similar quando nao houver match exato de topico.
  - [x] Por ultimo rodar busca/IA quando nao houver match confiavel no catalogo.
  - [x] Evitar recalcular para cada aluno quando ja existir valor confiavel para mesma banca/topico.
  - Preferir processamento em lote por `banca + materia` quando houver varios topicos pendentes do mesmo contexto.
  - [x] Permitir que edital sem banca use fallback global.
  - [ ] Marcar confianca menor quando o dado vier de fallback generico sem banca.
  - [x] Guardar fonte/contexto usado no topico e no catalogo: banca, orgao, cargo, edital, ano, query vencedora e janela de anos.
  - [ ] Evoluir nivel de confianca para nao misturar estimativa fraca com dado forte.
  - Quando o mapa de cobranca ficar pronto em background, atualizar a UI e/ou notificar o aluno sem bloquear o estudo.
- [ ] Definir politica de fila para processamento de incidencia:
  - [x] Nao processar topicos aleatorios do sistema.
  - [x] Priorizar usuarios pagos ativos (`user_subscriptions.status = active` e plano diferente de `free_trial`) quando a chamada vier do worker.
    - A fila tambem ignora assinatura com `subscription_ends_at` vencido, mesmo se o status ainda estiver `active`.
  - [x] Dentro dos usuarios pagos, priorizar quem ja concluiu pelo menos um ciclo de estudo.
    - Regra objetiva sugerida: existe snapshot/historico de ciclo fechado para o usuario.
    - Motivo: indica maior chance de uso real e reduz desperdicio de cota com usuario que ainda nao comecou.
    - Implementado na Edge Function: usuarios com `cycle_rotation_snapshots` entram antes; se nao houver snapshot, cai para ordem da assinatura.
  - [ ] Depois dos usuarios com ciclo concluido, priorizar quem criou/importou edital/ciclo primeiro ou quem iniciou estudo primeiro.
  - [x] Processar por contexto coerente (`usuario + edital + materia`) para entregar mapas completos, nao topicos soltos.
  - [x] Trial/free pode ver estado teaser/minimalista da funcionalidade, mas nao deve consumir processamento pesado automaticamente.
  - [x] Trial/free pode reaproveitar catalogo ja existente sem custo novo, mas nao deve disparar IA/busca em massa.
  - [x] Garantir explicitamente que processamento pesado automatico rode apenas para assinante pago e conta admin/owner.
  - [ ] Nao iniciar busca pesada apenas ao abrir a pagina, criar conta ou visualizar o ciclo.
  - [ ] Ao criar/importar edital e iniciar ciclo, apenas marcar elegibilidade do mapa de cobranca; o processamento pesado deve ser por acao aceita pelo aluno pago ou por fila automatica controlada.
  - [ ] Criar opcao visivel para assinante: `Gerar mapa de cobranca deste edital`, com explicacao curta de que roda em segundo plano.
  - [ ] Para trial/free, mostrar teaser minimalista e permitir apenas reaproveitar catalogo ja existente, sem botao que gaste IA/Google.
  - [ ] Evitar rodar automaticamente no primeiro topico iniciado; usar esse evento apenas como sinal de prioridade da fila, salvo decisao futura contraria.
  - [ ] O objetivo do processamento e completar o mapa inteiro do edital/ciclo pago, nao deixar apenas alguns topicos com nota.
    - Processar por ordem consistente ate fechar cobertura total.
    - Enquanto nao fechar, mostrar cobertura real e nao inventar nota nos topicos pendentes.
  - [ ] Criar limite manual/admin para excecoes: processar um usuario, edital ou banca especifica quando necessario.
  - [x] Criar trava de orcamento diario no backend para impedir novas buscas Google quando o limite diario for atingido.
    - Catalogo continua podendo ser reaproveitado sem custo.
    - Admin/owner pode continuar testando topico especifico manualmente para auditoria.
    - Limite padrao: 100 chamadas/dia, configuravel por `INCIDENCE_DAILY_GOOGLE_LIMIT`.
  - [ ] Criar provider plugavel de busca externa para o mapa de cobranca.
    - Provider inicial: Google Custom Search.
    - Provider alternativo para teste: Serper.dev.
    - A Edge Function deve gravar `search_provider` no audit log e no catalogo.
    - O painel admin deve permitir escolher o provider antes de rodar processamento automatico/manual em lote.
    - Regra operacional: admin pode rodar Google ate acabar a cota diaria, trocar para Serper e continuar avancando sem mudar a logica do mapa.
    - Tavily fica como opcao futura para validar evidencias/snippets, nao como primeira substituicao da contagem bruta.
  - [ ] Conectar chamada automatica/Cron com autenticacao segura para `ai-handler`, pois hoje a IA depende de JWT do usuario na chamada manual.
- [ ] Criar controle de status do mapa de cobranca por edital/ciclo:
  - [x] Criar tabela `edital_incidence_maps` para guardar status e resumo do mapa por edital.
  - [x] Atualizar a Edge Function para recalcular resumo do mapa apos cada lote processado.
  - Estados sugeridos: `nao_iniciado`, `em_fila`, `processando`, `concluido_parcial`, `concluido`, `erro`.
  - `concluido` significa que todos os topicos elegiveis foram analisados ou reaproveitados do catalogo, nao que todos receberam sinal maior que zero.
  - `concluido_parcial` significa que o processamento terminou, mas alguns topicos ficaram sem sinal, com erro tecnico ou sem contexto suficiente.
  - Mostrar resumo final: total de topicos, com sinal, sem sinal encontrado, reaproveitados do catalogo, processados por IA, pulados/rejeitados e com erro.
  - [x] Mostrar esse status/resumo no painel admin/operacional, nao em uma tela separada para o aluno.
  - [ ] Para o aluno, mostrar apenas o sinal no contexto natural: linha do topico no edital e pagina de ciclo.
  - [ ] Mostrar ao aluno uma porcentagem discreta de cobertura do mapa do edital/ciclo quando fizer sentido, por exemplo `13/191 topicos analisados`, sem expor painel operacional admin.
  - [ ] Permitir retentar apenas topicos com erro ou sem sinal quando fizer sentido, sem reprocessar tudo.
  - [ ] Permitir abrir a lista de topicos com erro/sem sinal e tentar obter o sinal manualmente por topico.
  - [ ] Tratar erros e `Sinal 0` de forma incremental/manual:
    - admin filtra erro/sem sinal;
    - processa topico especifico;
    - ajusta estrategia/termos/provider quando o caso revelar falso zero ou busca ruim.
- [ ] Ao concluir o mapa de cobranca, enviar notificacao para a area de notificacoes do aluno:
  - [x] Edge Function passa a criar notificacao em `user_notifications` quando o mapa fica sem pendencias.
  - Exemplo concluido: `Mapa de cobranca do edital X pronto: 82 topicos analisados, 64 com sinal.`
  - Exemplo parcial: `Mapa de cobranca do edital X finalizado parcialmente: 64 com sinal, 12 sem sinal encontrado, 3 com erro para retentar.`
  - A notificacao deve levar para o edital/ciclo filtrado nos sinais de cobranca.
- [ ] Preservar sinais de cobranca mesmo quando o aluno excluir edital/materia/topico local:
  - Estado verificado no codigo: exclusao permanente de edital/materia apaga `topics` locais do aluno.
  - Estado verificado no banco: `topic_incidence_catalog` e independente dos topicos locais; `topics.incidence_catalog_id` usa `on delete set null`.
  - Regra de produto: excluir edital remove a copia/local do aluno, mas nao apaga o catalogo global de sinais.
  - Quando outro edital/aluno recriar topico equivalente com mesma materia/banca, o sistema deve reaproveitar `topic_incidence_catalog`.
  - Antes de criar limpeza futura de catalogo, exigir regra de retencao e nunca apagar catalogo apenas porque um aluno removeu edital.
- [ ] Criar modelo de pontuacao de incidencia mais estavel que contagem bruta de resultados:
  - Usar volume bruto apenas como sinal.
  - Nao tratar `totalResults` do Google como quantidade confirmada de questoes/provas; isso e apenas volume bruto de resultados encontrados.
  - [x] Ajustar UI para comunicar o dado como `sinal bruto`/`volume bruto encontrado`, nao como questoes confirmadas.
  - [x] Registrar no audit log da Edge Function que o dado atual e `raw_search_signal`, sem contagem confirmada de questoes.
  - [x] Separar no banco o sinal bruto e o score final inicial: `topics.total_volume` guarda o sinal bruto e `topics.incidence_context` guarda score/percentil/confianca.
  - [x] Remover `Score X/5` da UI operacional visivel; manter os dados no banco/audit log enquanto a regra esta em validacao.
  - Para medir cobranca real da banca, validar resultados encontrados e extrair evidencias de questoes/provas quando possivel.
  - [x] Converter para score normalizado em faixa 1-5 dentro da materia/edital.
  - [x] Comparar topicos da mesma materia/edital entre si, nao numeros absolutos entre materias diferentes.
  - [x] Salvar `raw_volume`, `normalized_score`, `rank_percentile`, `score_confidence` e contexto da analise em `topics.incidence_context`.
  - [x] Criar backfill para recalcular score dos topicos ja analisados antes da versao `2026-06-04-normalized-incidence-score`. Migracao `persist_topic_incidence_level` aplicada em 2026-06-20: 16/16 topicos ativos com volume receberam `incidence_score` e `incidence_level`.
  - [x] Reduzir custo por topico no worker: limitar a ate 3 termos, ate 3 buscas Google por topico e parada antecipada quando houver sinal forte.
  - [x] Validar em lote real se o novo limite preserva qualidade de busca e reduz o custo medio por topico.
    - Resultado: custo caiu para 3 buscas por topico, mas a primeira versao ficou restritiva demais e gerou `Sinal 0` em topicos provavelmente cobrados.
  - [x] Corrigir a busca economica para preservar qualidade: remover numeracao/pontuacao do topico e priorizar consulta ampla com banca antes de frase exata.
  - [x] Gravar `worker_version` no contexto da incidencia para rastrear quais resultados vieram de cada estrategia de busca.
  - [ ] Validar lote real da versao `2026-06-05-broad-board-query-budget` para confirmar se o custo continua baixo sem aumentar falsos `Sinal 0`.
    - Evidencia parcial: primeiro teste real processou 1 topico, `ai: 1`, `zero: 0`, `errors: 0`.
  - [ ] Criar reprocessamento controlado dos topicos `Sinal 0` gerados pela versao restritiva `2026-06-04-search-budget-per-topic`.
    - [x] Adicionar botao manual por linha para processar um topico especifico, permitindo reteste controlado.
  - [ ] Avaliar arquitetura de longo prazo baseada em banco proprio de questoes/provas por banca/materia/topico, reduzindo dependencia de busca web em tempo real.
    - Direcao proposta: SMI (Sistema de Monitoramento de Incidencia), separado do app principal, para coletar evidencia estruturada de questoes por fonte externa.
    - Premissa de risco: antes de escalar, validar em POC se a plataforma alvo fornece ID unico, estavel e extraivel para cada questao. Sem ID confiavel, nao usar metrica `DISTINCT` como incidencia real.
    - Arquitetura candidata: Docker para isolamento, n8n em modo fila, Redis para fila/cache, Playwright para coleta estruturada, Ollama/embeddings para mapeamento semantico, Supabase/Postgres para persistencia, Supabase Storage para evidencias/snapshots.
    - Regra de negocio: incidencia real deve ser calculada por questoes unicas (`COUNT DISTINCT` de IDs), nunca por soma simples de resultados de busca.
    - Exigir human-in-the-loop para baixa confianca de mapeamento entre topico do edital e filtros/tags da fonte externa.
    - Manter o coletor agnostico de plataforma, com camada de provider/fonte para permitir Qconcursos ou alternativas no futuro.
    - POC inicial: validar extracao de IDs unicos/estaveis, deduplicacao, cadencia operacional responsavel, conformidade juridica/termos de uso e custo para 1.000 topicos antes de qualquer escala.
    - Se a POC falhar ou ficar juridicamente/operacionalmente ruim, manter provider de busca estruturada como plano B temporario.
  - [ ] Avaliar provedores alternativos de busca estruturada apenas como plano B, sem substituir a meta principal de base propria rastreavel.
    - Serper.dev: candidato principal por ser parecido com Google Search JSON e ter volume maior de queries.
    - Tavily: candidato para busca com evidencias textuais/RAG, se a prioridade virar explicar fontes e nao apenas volume bruto.
  - Nao aceitar porcentagem gerada pela IA sem fonte/audit log; IA pode sugerir, mas o dado salvo precisa ser rastreavel.
- [ ] Revisar/reprocessar topicos que foram marcados como `no_volume` durante a fase em que falha tecnica ainda podia virar zero.
- [x] Criar acao manual `processar agora` para um topico especifico sem depender da ordem global.
- [x] Criar acao em lote pequena e segura: processar proximos N topicos pendentes.
- [x] Criar Edge Function autonoma para processar incidencia em background.
- [x] Garantir que a Edge Function nao responda sucesso quando o update no banco falhar.
- [x] Atualizar `last_trend_check_at` tambem quando o valor vier do catalogo, para o painel operacional mostrar ultimo processamento real.
- [x] Adicionar versao da Edge Function no retorno para confirmar se o deploy novo esta rodando.
- [x] Adicionar checagem pos-processamento no painel manual para confirmar quantos topicos retornados foram realmente persistidos no banco.
- [x] Corrigir processamento manual para limitar a fila aos topicos das materias do usuario logado (`subjects.user_id`), evitando processar dados globais invisiveis para o painel.
- [x] Ajustar painel operacional para contar topicos no mesmo escopo do usuario logado.
  - [x] Ajustar tabela operacional para listar e contar topicos no mesmo escopo do usuario logado.
- [x] Mostrar no resultado do lote manual quais topicos foram processados, com materia, status e valor atribuido, sem exigir procurar o topico na tabela.
- [x] Trocar linguagem tecnica do lote (`Sinal X`, `Banco confirmou`, `IA quando necessario`) por leitura operacional: processado, salvo, faixa de cobranca e volume bruto.
- [x] Reorganizar o resultado do lote manual para evitar texto oculto, colunas desalinhadas e repeticao de badges tecnicas.
- [x] Padronizar a tabela de resultado do processamento com coluna de topico maior, auditoria sem quebra e textos operacionais legiveis.
- [x] Separar resumo geral do lote da tabela de topicos, evitando duplicar topico/materia e alinhando colunas com os dados exibidos.
- [x] Remover mensagens tecnicas de rotina como `Volume 0 na busca atual`, data duplicada no resumo e ajustar hierarquia de fonte de materia/topico.
- [x] Remover a calculadora manual antiga de importancia/sinal (`v12`, multi-search solto) das telas operacionais, mantendo o fluxo por edital/topico como fonte principal.
- [x] Mostrar no painel de processamento o resultado do topico processado individualmente, sem exigir procurar depois na tabela.
- [x] Logar no console o retorno completo do processamento individual, igual ao lote.
- [x] Tornar logs de audit/processamento copiaveis no console via `JSON.stringify`, evitando objetos resumidos com `...`.
- [x] Separar no painel `Com sinal via busca`, `Busca sem sinal` e `Analises por busca` para evitar confundir total processado com sinal util.
- [x] Corrigir contador de limite diario de buscas para refletir o consumo usado pela Edge Function.
  - [x] Usar como fonte inicial o `last_audit_log.total_api_calls` dos topicos processados no dia.
  - [x] Depois de processar, usar `google_quota` retornado pela Edge Function como fonte operacional, evitando divergencia por RLS/horario no frontend.
  - [x] Mostrar consumo por dia e restantes estimados no painel manual sem chamar isso de cota fixa do Google.
  - [x] Corrigir inflacao do limite diario: reaproveitamento de catalogo nao deve contar como busca feita hoje, mesmo que carregue audit antigo.
  - [ ] Separar consumo de Gemini e consumo de Google Custom Search em metricas proprias.
  - [ ] Criar contador diario persistido dedicado se o Cron/Queue crescer e o audit log por topico deixar de ser suficiente.
  - [x] Retornar no payload da Edge Function o resumo `google_quota` com uso antes/depois da execucao.
  - Se o uso passar do free tier, preparar suporte a plano pago/cota maior.
- [ ] Tratar falta de credito/cota do Gemini/AI Studio como erro operacional separado da cota Google.
  - Erro observado: `Your prepayment credits are depleted`.
  - Erro observado no status automatico: `ai_status` retornou 400 ao salvar modelo porque a tabela remota nao tinha `model_name`.
  - [x] Criar migration para adicionar `ai_status.model_name`.
  - [x] Criar migration para trocar modelo preview `gemini-3.1-flash-lite-preview` por modelo estavel em `system_settings.ai_edital_config`.
  - [x] Corrigir causa raiz da tela de Gestao de IA voltando para preview: remover recuperacao automatica de `ai_settings_draft` e usar o banco como unica fonte de verdade.
  - [x] Exibir o modelo configurado no topo da tela antes de salvar, para deixar claro qual valor sera persistido.
  - [x] Manter `ai-handler.checkStatus` como verificacao leve de chave/modelo para nao transformar billing/credito em erro automatico da tela.
  - [x] Sincronizar o status da API Gemini entre card da pagina e indicador da sidebar, evitando bolinha vermelha apos teste aprovado.
  - [ ] Criar teste manual separado de geracao real no Gemini, com texto claro de que pode falhar por billing/credito mesmo quando a API estiver configurada.
  - Mostrar no painel que a falha ocorreu antes da busca Google, por isso `Cota Diaria Google` pode continuar 0/100.
  - Evitar retentar em loop enquanto a cota/credito Gemini estiver indisponivel.
  - [x] Criar fallback sem Gemini para gerar termos basicos a partir do proprio topico + materia + banca e ainda tentar Google Custom Search.
  - [x] Diferenciar no painel resultados gerados com `Fallback sem Gemini` dos resultados com termos refinados pela IA.
  - [x] Gravar `source_method` no contexto do topico/catalogo para diferenciar busca direta de termos refinados pela IA em auditorias futuras.
- [ ] Se o painel mostrar `Banco confirmou 0/N`, investigar deploy remoto antigo, permissao de update, schema remoto ou falha silenciosa de persistencia.
- [ ] Manter processamento de incidencia em modo manual/admin ate consolidar o metodo de calculo.
  - Motivo: Cron automatico pode consumir cota, preencher dados com estrategia ainda em validacao e atrapalhar testes com novos providers/SMI.
  - [x] Processamento manual por lote pequeno continua disponivel no painel admin.
  - [x] Processamento manual por topico especifico continua disponivel para auditoria.
  - [x] Adicionar filtros manuais de fila por edital, materia e status antes de gastar busca externa.
  - [x] Manter filtro de materia dependente do edital selecionado, evitando listar materias duplicadas/misturadas de todos os editais do usuario.
  - [x] Fazer `Ver proximos da fila` e `Processar lote seguro` usarem o mesmo escopo filtrado.
  - [ ] Antes de liberar qualquer automacao, definir provider oficial, limite diario, regra de fila e criterio de qualidade minimo.
  - [x] Criar um modo de previa visivel para testar fila sem gravar nem gastar busca externa.
- [ ] Configurar Supabase Cron para chamar a Edge Function em intervalo controlado somente depois da validacao do metodo.
  - [ ] Definir frequencia inicial conservadora.
  - [ ] Chamar `process-topic-incidence` com lote pequeno.
  - [ ] Usar segredo seguro no header, sem expor chave no frontend.
  - [x] Definir autenticacao segura para chamadas internas ao `ai-handler` quando nao houver JWT de usuario.
  - [ ] Criar migration do Cron com `pg_cron` + `pg_net` + Vault apenas quando for ativar a automacao.
  - [ ] Aplicar migration no Supabase e criar/confirmar secrets somente quando a automacao estiver aprovada.
  - [ ] Testar job manualmente e conferir retorno/log da Edge Function antes de deixar recorrente.
  - Registrar ou exibir no painel: ultimo processamento, proximo automatico previsto, quantidade processada e falhas recentes.
  - Enquanto o Cron nao existir, a pagina deve mostrar claramente `Proximo automatico: ainda nao configurado`.
- [ ] Avaliar Supabase Queues se o volume de topicos ou retentativas crescer.
- [ ] Garantir que a funcao processe poucos topicos por execucao para evitar timeout, custo alto e cota estourada.
- [x] Atualizar tabela/lista quando um topico for preenchido pelo catalogo ou pela IA.
- [x] Corrigir filtro da tabela operacional para recarregar a consulta ao trocar o filtro selecionado.

### Fase 5: Questoes e flashcards por topico

Decisao de produto: flashcards/questoes nao devem ser gerados automaticamente para todos os topicos nesta fase. Eles devem ser gerados sob demanda quando o aluno clicar no icone de gerar flashcard no topico.

- [ ] Criar banco global de questoes/cards reaproveitaveis por topico normalizado, materia e contexto.
- [ ] Manter vinculo claro com `topic_id`, `subject_id`, `edital_id` e usuario que solicitou quando aplicavel.
- [ ] Antes de chamar IA, procurar questoes/cards ja existentes para o mesmo topico normalizado.
- [ ] Se existir base suficiente, reutilizar/sugerir cards existentes sem gastar IA.
- [ ] Se nao existir, gerar com IA, salvar no banco global e vincular ao topico do aluno.
- [ ] Criar status de qualidade: `draft`, `needs_review`, `approved`, `rejected`.
- [ ] Cards gerados por IA devem entrar como revisaveis/aprovaveis, nao como verdade absoluta.
- [ ] Mostrar contadores por topico:
  - questoes/cards existentes;
  - aprovados;
  - gerados por IA;
  - reaproveitados;
  - aguardando revisao;
  - rejeitados.
- [ ] Nao misturar esse banco com `question_attempts`, que hoje representa tentativas/respostas do usuario.
- [ ] Reavaliar a Edge Function `generate-questions` atual para reaproveitar prompt, validacao e rate limit, mas mover persistencia para uma estrutura propria de banco de questoes/cards.
- [ ] Futuramente conectar cards aprovados ao fluxo de revisao/FSRS.

### Historico de ciclos

- [x] Criar tabela `cycle_rotation_snapshots`.
- [x] Salvar numero do ciclo, datas, materias estudadas, topicos iniciados, topicos concluidos e detalhe por materia.
- [x] Usar o ultimo ciclo salvo para comparar materias e topicos do ciclo atual.
- [ ] Criar relatorio mais completo de evolucao entre todos os ciclos.

### Fase 4: Limpeza de revisao e polimento

- [x] Remover ou reduzir informacoes de revisao nesta pagina.
- [x] Ajustar estados vazios.
- [x] Corrigir o Painel para nao exibir metricas, mapas ou historico de atividade quando nao houver edital carregado no ciclo: o estado `missing_cycle` agora mostra apenas o direcionamento para carregar o edital, a consulta de atividade fica desabilitada sem ciclo ativo e qualquer valor antigo em cache e zerado no modelo visual.
- [x] Corrigir navegacao do estado vazio da Ciclo/Painel para `Meus Editais`: quando ainda nao existe ciclo montado ou materia cadastrada, abrir a biblioteca completa; usar o filtro `editais do ciclo` apenas quando ja existe ciclo e as materias foram ocultadas/removidas. `Meus Editais` tambem passou a ignorar `filterCycle` se nenhum edital estiver realmente carregado no ciclo, evitando o vazio enganoso `Nenhum edital no ciclo atual`. O CTA `Carregar edital no ciclo` do Painel e a proxima acao `load_cycle` tambem passaram a apontar para `Meus Editais`, nao para a propria pagina Ciclo vazia.
- [x] Criar cenarios controlados de teste no Supabase para validar regras de maturidade, fechamento de ciclo, snapshots, alertas e insights sem depender de dados reais do aluno.
  - Cenario criado na conta `vourevisar@gmail.com` com prefixo `TESTE INSIGHTS - NAO USAR`.
  - Cobertura: materia sem topicos, sem peso, sem uso, peso alto parado, parcial em andamento, todos os topicos iniciados, concluida no edital, cobranca alta sem iniciar e revisoes vencidas relevantes.
  - Inclui eventos de ciclo, historico de revisao e snapshot anterior para alimentar maturidade, comparacao e insights.
  - Backup/restauracao do ciclo original salvo em `docs/test-cycle-supabase-backup.md`.
  - Gerar materias/topicos com datas diferentes, pesos, sinais de cobranca, eventos de ciclo e snapshots.
  - Fases `cold_start`, `started`, `active` e `historical` validadas por alternancia controlada do ciclo ativo no Supabase.
  - Cenario `Ciclo teste CTAs` criado para validar `Iniciar materia`, `Iniciar topico` e `Aplicar sugestao` com dados reais no Supabase.
  - Evitar misturar esses dados com editais reais do usuario.
- [x] Ajustar/validar dark mode: alternancia claro/escuro manteve fila, painel e controles renderizados sem overflow horizontal.
- [x] Validar visual no navegador em desktop, tablet e mobile.
- [x] Corrigir deslocamento do texto da linha do topico.
- [x] Corrigir icones de hover ficando atras do botao principal.
- [x] Adicionar teste automatizado para garantir que topico inativo (`is_active = false`) nao volte a entrar nas metricas do ciclo.
- [x] Validar clique real dos CTAs estrategicos na UI: `Iniciar materia`, `Iniciar topico` e `Aplicar sugestao`, conferindo rolagem/modal, persistencia no banco e evento registrado.
  - [x] `Aplicar sugestao` gravou evento `cycle_reordered` com `source=strategic_suggestion` e atualizou a ordem do ciclo no banco.
  - [x] `Iniciar topico` registrou primeiro contato em topico do cenario controlado.
  - [x] `Iniciar materia` deixou de usar o tipo interno ambiguo `start_topic`; agora usa `start_subject`, sem `topicId`, evitando abrir modal de topico por engano.
  - [x] Adicionado teste de regressao garantindo que alerta `Iniciar materia` usa `start_subject` e nao carrega `topicId`.
  - [x] `Iniciar materia` e CTAs com materia agora recolhem a fila, expandem apenas a materia alvo e aplicam destaque visual curto no cabecalho.
  - [x] `Iniciar topico` tambem expande e destaca a materia antes de abrir o modal do topico.
  - [x] Revalidar visualmente `Iniciar topico` no cenario ativo: CTA abriu o modal de primeiro contato sem finalizar estudo e o modal foi fechado com `Voltar`.
  - [x] Corrigir copy e criterio dos alertas de cobranca/prova proxima: o texto agora deixa claro que os dias sao ate a prova, inclui a data quando disponivel, evita parecer que a materia esta "a 25 dias" e so chama `cobranca alta` quando a mesma regra visual da Ciclo considera o sinal confiavel para o aluno.
  - [x] Revalidar visualmente `Iniciar materia` quando houver alerta ativo desse tipo; usuario aprovou o ponto para fechar a validacao visual da Ciclo e seguir para a proxima etapa.
- [x] Melhorar modal de primeiro contato/revisao: titulo sem corte feio, hierarquia menos grosseira, texto redundante removido, campo de tempo compacto e chip discreto de cobranca quando o topico tiver sinal confiavel para exibir.
- [x] Remover alternancia de cor dos topicos que confundia com a cor da materia; linhas de topico usam superficie unica e separacao por borda/hover.
- [x] Rodar `npm run lint`.
- [x] Rodar `npm run build` se a mudanca for ampla.
- [x] Zerar a divida global de lint e impedir regressao. Baseline de 2026-07-01: 0 erros e 368 warnings, sendo 335 `no-explicit-any`, 18 `react-hooks/exhaustive-deps` e 15 `react-refresh/only-export-components`. O script de lint e o Quality Gate agora rejeitam qualquer warning com `--max-warnings=0`; o PR #11 passou remotamente sem anotacoes.
  - [x] Eliminar `no-explicit-any` no frontend, hooks e services, preservando contratos Supabase e comportamento existente. Nao restou `any` explicito em codigo ativo; ocorrencias textuais remanescentes sao apenas o operador SQL `ANY(...)` em testes.
  - [x] Eliminar `no-explicit-any` nas Edge Functions `extract-edital`, `process-topic-incidence` e funcoes menores; as cinco funcoes tocadas passam juntas em `deno check` antes de deploy.
  - [x] Corrigir dependencias de hooks sem criar loops, chamadas duplicadas ou estado obsoleto.
  - [x] Declarar nominalmente os exports validos de Provider/hook e variants do shadcn/ui para Fast Refresh, mantendo a regra ativa para exports nao previstos.
  - [x] Atualizar `actions/checkout` e `actions/setup-node` para runtime Node 24 e validar o Quality Gate remoto sem anotacoes de runtime depreciado.
  - [x] Rodar `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build`, `deno check` e `npm audit`; todos verdes localmente, com 283 testes e zero vulnerabilidades.
- [x] Tornar `tsc -b` um gate real e zerar o passivo historico. O baseline de 472 pontos unicos medido em 2026-07-01 na `main` (`aa9bc2a1`) foi reduzido a zero em 2026-07-02; `npm run typecheck` agora executa a build de projetos TypeScript e integra o Quality Gate antes dos testes.
- [x] Adicionar testes de integracao para os estados criticos da pagina de ciclo em `Subjects.tsx`. A suite cobre loading sem falso vazio, ciclo nao montado com navegacao, falha de carregamento com retentativa, topico novo acionavel, prioridade de revisoes apos o primeiro contato e conclusao real com `Ver desempenho`. Merges, drag and drop e responsividade visual permanecem em suites especificas, sem promessa de cobertura neste recorte.
- [x] Avaliar e corrigir divisao de bundle em recorte proprio: em 2026-06-23, o `App.tsx` passou a lazy-load de paginas por rota, o import dinamico redundante de `gutCalculator` foi removido e o Vite recebeu `manualChunks` para vendors principais. `npm run build` passou sem aviso de chunk acima de 500 kB, sem warning de import misto e sem circular chunk.

## Riscos conhecidos

- Alterar a ordem do ciclo automaticamente pode frustrar o aluno. Nao fazer agora.
- Exibir peso ausente como zero pode passar ideia errada. Usar `sem peso informado`.
- Misturar revisao com ciclo deixa a tela confusa. Separar responsabilidades.
- `topics.total_volume` ainda pode ser incompleto. Tratar como dado opcional.
- Merge de editais/ciclos e historico de revisao sao areas sensiveis. Nao alterar sem recorte claro.
- [x] Corrigir Revisoes apos mesclagem de editais: `useReviewsData` agora expande o escopo de materias do ciclo usando `subject_merges`, busca os topicos das materias originais envolvidas e deduplica topicos equivalentes via `topic_merges`, preservando o progresso mais forte em uma unica linha. O fluxo de `markTopicAsReviewed` tambem passou a propagar progresso e historico por `topic_merges` antes de cair no fallback legado de `user_cycles.unification_map`, e `findSiblingTopicIds` ficou defensiva contra mapas antigos/malformados para eliminar o warning `map.unifiedSubjects is not iterable`.
- [x] Corrigir remocao do edital primario de uma mesclagem: `atomic_archive_edital_from_cycle` agora promove a materia sobrevivente para `user_cycles.ciclo_atual` quando a mesclagem colapsa para um unico edital remanescente, evitando estado vazio falso em `Ciclo de Estudos`. A mesma migration tambem copia o estado de revisao mais forte entre topicos equivalentes para o topico sobrevivente quando um `topic_merge` colapsa, preservando agenda/progresso ao arquivar o edital que recebeu a revisao.
- [x] Corrigir materia fantasma apos remover edital mesclado: `atomic_archive_edital_from_cycle` agora reconstrói `active_subject_ids` dos editais sobreviventes antes de persistir `user_cycles.ciclo_atual`, usando os editais ativos como fonte de verdade. Backfill `20260627162043_backfill_cycle_active_subject_scope.sql` corrigiu estados legados onde um edital ativo ainda carregava IDs de materias de um edital removido.
- [x] Criar checklist operacional de invariantes para ciclo/merge: antes de mexer em carga, remocao, substituicao, `subject_merges`, `topic_merges`, revisoes ou historico, consultar `docs/cycle-merge-invariants.md` para validar fonte de verdade, cenarios obrigatorios de teste e sinais de erro como materia fantasma.
- [x] Tornar mesclagem automatica de topicos deterministica e simples: topicos so mesclam automaticamente quando o nome e igual apos normalizacao conservadora, com tolerancia apenas para acento, caixa, pontuacao e plural/singular simples. Sugestoes semanticas da IA nao viram merge automatico; ficam individuais ate existir fluxo manual seguro de mesclar/desfazer.
- [x] Centralizar sincronizacao de progresso entre topicos equivalentes em `topicMergeProgressService`: revisao direta (`useTopicReview`) e atualizacao legada de topico (`useTopicOperations`, usada pela conclusao de sessao) agora chamam o mesmo service para copiar somente campos de progresso/revisao para os topicos irmaos de `topic_merges`, sem copiar nome, posicao ou outros metadados editoriais.
- [x] Mover a sincronizacao de progresso equivalente para RPC atomica: `sync_topic_merge_progress` valida `auth.uid()`, bloqueia o topico/merge com `for update`, atualiza o topico clicado e seus equivalentes em uma unica transacao e aceita apenas whitelist de campos de progresso. O frontend deixou de atualizar o topico principal antes da sincronizacao no fluxo de revisao direta; `updateTopic` separa campos editoriais de progresso para preservar nome/posicao/anotacoes no topico original. Fechamento do debito tecnico: a mesma RPC tambem aceita `p_history` opcional com whitelist de campos de historico e grava `topic_review_history` para o topico clicado e equivalentes na mesma transacao, eliminando a janela entre atualizar progresso e registrar historico.
- [x] Melhorar rastreabilidade na pagina Revisoes: quando houver editais mesclados ou topicos equivalentes, exibir de forma discreta o edital/origem da materia e do topico para o aluno entender de onde veio a revisao sem poluir a lista principal. Concluido em 2026-07-13: `useReviewsData` preserva `edital_id`, `source_topic_ids` e `source_edital_ids` mesmo depois do dedupe de topicos equivalentes; a lista mostra `Origem: ...` apenas em ciclo composto, com resumo compacto de concurso/cargo; testes cobrem metadado de origem no merge de revisoes e formatacao do rotulo.
- [x] Auditar o badge de tendencia da pagina Revisoes (`Melhorando`, `Piorando`, `Estavel`) antes de tratar como informacao confiavel para o aluno. Concluido em 2026-07-13: a lista deixou de usar a heuristica de `useMentorInsights` baseada em `memory_stability` para exibir tendencia/gargalo visual; agora a pagina monta a tendencia a partir de `topic_review_history.trend_label/trend_delta` no escopo ativo e so renderiza sinais com delta compativel (`Melhorando <= -0.5`, `Piorando >= 0.5`). Sinais neutros, sem historico suficiente ou ambiguos ficam ocultos.
- [ ] Projetar mesclagem/desmesclagem manual assistida: permitir que o aluno confirme, mescle ou desfaça equivalencias de materias/topicos sugeridas pela IA em fluxo simples, sem transformar a IA em decisora final. Definir se a acao fica apenas durante o merge inicial, se tambem aparece depois no ciclo/revisoes quando o aluno percebe equivalencias, ou ambos. Objetivo: produto automatico por padrao, conservador sem falso positivo, com correcao manual facil para casos ambíguos.
- [ ] Reduzir divida estrutural do fluxo de revisao em recorte futuro: limpar warnings antigos de lint em fases e quebrar o hook `useTopicReview`, que ainda concentra calculo SRS, persistencia, historico, sessao de estudo, dificuldade e efeitos de UI. Nao misturar com correcoes de merge/ciclo; fazer depois que os fluxos de edital, ciclo e revisoes estiverem estabilizados.
- [x] Adicionar testes dedicados para `src/services/mergeService.ts`: `src/services/mergeService.test.ts` cobre criacao, reversao com copia de progresso, promocao de primarios sobreviventes e limpeza de referencias em `subject_merges`/`topic_merges`.

## Proximo passo imediato

Antes da rodada final de layout, a pagina de ciclo esta funcionalmente consolidada. O que resta nesta frente e:

- [x] Revalidar visualmente `Iniciar materia` quando houver alerta ativo desse tipo; usuario aprovou o ponto para fechar a validacao visual da Ciclo e seguir para a proxima etapa.
- [x] Fazer rodada final de layout/responsividade em desktop, tablet e mobile quando o usuario passar a direcao visual. Validado em 1440x900, 768x900 e 375x667 com 8 cards, painel estrategico presente, sem overflow horizontal, sem botoes cortados e subtitulo mobile sem corte.
  - [x] Reorganizar cabecalho da fila do ciclo em duas linhas: ferramentas da fila acima (`buscar`, `organizar`, `detalhes`, `modo edital`) e identidade da fila abaixo (`Fila do Ciclo`, contador e `Expandir`).
  - [x] Ajustar cabecalho da fila para titulo primeiro e ferramentas agrupadas em faixa discreta abaixo, reduzindo a sensacao de elementos soltos.
  - [x] Remover slide/botao `Detalhes` da fila por conteudo redundante; previsao de ritmo fica no painel estrategico e `Resetar ciclo` virou acao discreta no rodape da fila.
  - [x] Reorganizar ferramentas da fila sem card: `Organizar` e busca à esquerda; `Modo edital` e `Expandir` à direita.
  - [x] Manter o mesmo cabecalho nos modos `Fila do Ciclo` e `Edital Verticalizado`, com busca ativa, ordenar bloqueado no modo verticalizado e botao de retorno no mesmo ponto do modo edital. Ao entrar no modo `Edital Verticalizado`, todas as materias visiveis abrem automaticamente para preservar a leitura de panorama geral, sem sobrescrever o estado aberto/recolhido que o aluno deixou no modo Ciclo.
  - [x] Corrigir responsividade do `Edital Verticalizado`: em mobile/tablet, topico usa duas camadas com nome em cima e status/acoes agrupados abaixo, evitando icones ou badges isolados em linhas quebradas.
  - [x] Refinar densidade visual do `Edital Verticalizado`: materia com hierarquia maior que topico, linha de topico mais compacta, badge textual `Neste ciclo` removida e estado de ciclo mantido como icone discreto com tooltip. Apos validacao visual, removido tambem o badge textual redundante de status normal (`Nao iniciado`, `Em revisao`) nas linhas de topico, pois a acao (`Iniciar estudo`, `Continuar`) e a barrinha lateral ja comunicam esse estado sem repetir informacao. A visualizacao agora segue a tipografia do modo Ciclo para materia, metadados e topicos; usa somente o controle global `Expandir/Recolher`, sem chevron individual por materia; posiciona cobranca/incidencia junto das acoes; e fixa a largura dos CTAs (`Continuar`, `Concluido`, `Iniciar estudo`) para evitar desalinhamento vertical das informacoes anteriores. No mobile/tablet, a linha do topico usa duas camadas: nome sozinho na primeira linha para usar toda a largura; anotacao sempre acessivel, cobranca/incidencia e CTA icon-only ficam juntos na segunda linha, alinhados a direita. No desktop, o layout volta a ser horizontal e o chip `Concluido` fica mais compacto.
  - [x] Diferenciar funcionalmente o `Edital Verticalizado` da fila do ciclo: adicionar mini mapa do edital antes das materias com concurso/cargo/banca/data quando disponiveis, cobertura de primeiro contato, topicos iniciados/pendentes/em andamento/concluidos, ritmo ate a prova e resumo leve de revisoes. Apos validacao visual, o mini mapa deixou de usar caixas grandes de dashboard e virou uma faixa compacta com porcentagem, barra e chips pequenos, reduzindo altura e peso visual no desktop/mobile.
  - [x] Alinhar titulo da fila com a lista, aproximar ferramentas dos cards e ajustar lapis da materia para ficar menor e alinhado ao nome.
  - [x] Ajustar a barra de ferramentas da fila: remover caixa alta dos botoes, alinhar controles verticalmente e aproximar a barra dos cards.
  - [x] Trocar busca abaixo do cabecalho por input minimalista na propria linha de ferramentas.
  - [x] Ajustar busca no mobile: usar o mesmo input minimalista do desktop, no mesmo local da barra, evitando padroes divergentes.
  - [x] Manter `Expandir/Recolher` tambem no `Edital Verticalizado`, controlando a abertura das materias somente dessa visualizacao.
  - [x] Criar cabecalho proprio para a coluna direita (`Painel estrategico do edital`) e usar o mesmo titulo como atalho inferior no mobile/tablet quando o painel estiver abaixo da fila.
  - [x] Remover duplicacao do atalho inferior do painel estrategico: o proprio titulo da coluna direita vira chamada compacta/sticky no mobile enquanto o painel estiver oculto.
  - [x] Corrigir ancora do painel estrategico: titulo real fica normal no fluxo da pagina; dock inferior com `Ver` aparece apenas quando o titulo real ainda esta abaixo da tela e some ao chegar no painel, evitando duplicacao entre mobile/tablet/desktop.
  - [x] Ajustar clique do dock `Ver` para rolar ate o titulo real do painel com margem abaixo da barra superior.
  - [x] Alinhar o primeiro card do painel estrategico com a primeira materia da fila no desktop.
  - [x] Mover `Resetar ciclo` para o fim dos cards do painel estrategico.
  - [x] Remover menu/dropdown de troca de plataforma da marca no menu lateral, mantendo apenas identidade visual do vouRevisar.
  - [x] Validar visualmente no navegador a nova estrutura do cabecalho da fila em tablet com menu aberto, desktop e mobile. Concluido em 2026-07-03: validado em sessao autenticada no navegador do app em 1440x900, 768x900 com menu lateral aberto e 390x844; sem overflow horizontal, sem elementos saindo da viewport, sem erros de console e com ferramentas da fila legiveis/responsivas.
  - [ ] Avaliar busca expansivel/deslizante ao clicar na lupa, com input abrindo lateralmente dentro da barra de ferramentas da fila.
  - [x] Iniciar rodada de direcao visual/design system usando `build-web-apps:frontend-app-builder`: conceito visual aprovado em 2026-06-15, tokens globais premium em `src/index.css`/`tailwind.config.ts`, primeira aplicacao na pagina de ciclo e validacao visual autenticada no navegador do app em modo dia/noite. O degrad azul/ciano ficou no shell inteiro, menu lateral e paineis de destaque; o fundo da pagina ficou neutro, frio e sem preto pesado. Em 2026-06-15, a segunda rodada removeu cores soltas visiveis da pagina ciclo, trocando azuis/cinzas/verdes diretos por tokens globais e classes como `app-surface`, `app-glass`, `app-gradient-panel`, `app-primary-button`, `app-success-button` e `app-empty-orb`.
  - [x] Auditar e limpar cores hardcoded no escopo `Ciclo + shell`: `src/pages/Subjects.tsx`, `src/components/AppLayout.tsx`, `src/components/ui/sidebar.tsx` e utilitarios globais em `src/index.css` nao devem mais depender de `bg-blue`, `bg-zinc`, `bg-slate`, `bg-emerald`, `text-red`, `dark:bg-white/5` e similares para a tela do ciclo; estados visuais passam por tokens globais (`primary`, `info`, `success`, `warning`, `destructive`, `incidence`, `surface`, `border`).
  - [ ] Expandir a rodada visual para o restante do sistema: revisar paleta dark/light global em todas as telas, reduzir dependencia excessiva de azul quando nao for informacao/acao, consolidar cores semanticas para informacao/alerta/sucesso/cobranca e revisar tokens de superficie/borda/degrade/radius sem repetir o mesmo container em tudo. Para fidelidade visual 10/10, comparar estados equivalentes ao conceito; a pagina real pode destoar quando mostra dados/estados diferentes, como varias materias concluidas em verde.
    - [x] Primeira aplicacao enxuta em `Meus Editais` (`src/pages/Editais.tsx`): sem criar classes globais novas e sem redesenhar cards/grid, alinhar cores semanticas de acoes e alertas usando tokens/classes ja existentes (`primary`, `success`, `warning`, `destructive`, `app-button-*`). Ajustados botao de mesclagem selecionada, banner de ciclo vazio, modais de excluir/remover do ciclo e acoes principais do modal de carregar/mesclar ciclo. Cards de editais, cards Catálogo/IA/Manual, toast/snackbar e responsividade fina ficaram fora deste recorte.
    - [x] Corrigir a superficie dos modais de `Meus Editais` em light/dark: a classe inexistente `bg-modal-background` deixava exclusao, remocao e conflito de ciclo transparentes. Concluido em 2026-07-04: exclusao, remocao do ciclo e conflito/carregamento de ciclo usam superficie `bg-modal` opaca; o aviso destrutivo de exclusao recebeu contraste melhor no dark e o rodape mobile do conflito deixou de jogar `Mesclar` para fora da viewport. Validado em sessao autenticada no navegador do app em desktop light/dark e mobile dark, sem overflow horizontal e sem elementos essenciais fora da viewport.
    - [x] Redesenhar a escolha de mesclagem do modal de ciclo como comparacao visual: ambos os caminhos adicionam tudo ao mesmo ciclo; a opcao neutra mantem materias/topicos equivalentes como entradas individuais e a opcao verde unifica equivalentes. Desktop usa duas colunas e mobile/tablet preserva as duas pre-visualizacoes empilhadas. Remover badges redundantes de mesclagem e impedir que a seta superior execute uma decisao implicita. Refinamento aplicado: card `Unificar equivalentes` voltou a superficie neutra; verde ficou concentrado no cabecalho da materia e nas linhas de topicos de fato mesclados; os editais/cargos envolvidos aparecem no topo; o colapso virou controle global para abrir/recolher as duas colunas; tipografia/espacamento foram compactados e os CTAs ficam sticky. Rodada visual posterior: topo virou painel de contexto com mais vida, chips de editais integrados a decisao, cabecalhos das colunas ganharam o mesmo acento visual e os topicos ficaram mais proximos das materias. Ajuste final de densidade: topico mesclado deixou de ter fundo/borda verde e passa a destacar somente o nome em verde, com menor distancia entre materia e primeiro topico. O modal final de sucesso foi reduzido e passou a permitir definir um apelido em `user_cycles.name`, deixando explicito que os editais reais continuam vinculados por seus nomes/IDs; o CTA final deixou de ocupar a largura inteira e virou `Abrir ciclo`, pois a mesclagem ja foi executada ao clicar em `Unificar equivalentes`. Nova rodada aplicada: sucesso usa largura menor que a comparacao, card unico mais compacto, input com label real, metricas em chips e loading de mesclagem deixou de usar overlay total para evitar o pisca entre progresso e sucesso. Ajuste de feedback: durante analise de topicos com overlay, a barra superior de `isMerging` fica oculta para nao parecer dois processamentos simultaneos; a analise semantica inicial deixou de exibir porcentagem fixa (`60%`) e passou a usar progresso indeterminado quando nao houver percentual real; botao `Manter itens individuais` recebeu affordance real de botao com acento primario, borda, fundo e estado hover. Refinamento do passo `Carregar edital`: cards de ciclo atual e novo edital usam superficies neutras com barras/acento semantico em vez de blocos muito saturados; chips de materias usam tokens `primary`/`success`; `Ver topicos` virou botao pequeno de verdade; `Substituir` ganhou contraste destrutivo sem competir com o CTA `Comparar opcoes`, agora em superficie neutra com borda e icone vermelhos para nao parecer desabilitado; CTA verde foi renomeado de `Comparar opcoes` para `Mesclar`, alinhado ao mesmo padrao outline com icone, texto/borda verdes em repouso e preenchimento verde com texto claro no hover; ambos os CTAs deixaram de usar largura minima fixa para o fundo ficar justo ao conteudo e, no modo noite, somente a borda externa usa branco translucido forte para aparecer claramente na superficie escura. O `X` volta a fechar o modal depois do sucesso, sem tentar desfazer a operacao ja concluida. A lista de editais envolvidos deixou de inferir origem por nome de materia e agora usa apenas IDs realmente presentes no ciclo, evitando edital fantasma. Adicionada migration `20260623002233_secure_user_cycles_rls.sql` para proteger `user_cycles` com RLS por `auth.uid() = user_id`. Concluido em 2026-07-04: comparacao validada em fluxo autenticado real em desktop dark, mobile dark e desktop light, sem erro de console, sem overflow horizontal e sem controle essencial fora da viewport; controle `Recolher/Abrir tudo` funciona; banner `Mesclagem recuperada` deixou de exibir `Invalid Date`. Os CTAs finais nao foram acionados no usuario real porque executam `atomic_cycle_load`; a validacao visual da etapa final de nome/data permanece no item especifico `Refinar o modal final Ciclo atualizado`. Plano detalhado: `docs/superpowers/plans/2026-06-22-cycle-merge-comparison.md`.
      - [x] Melhorar rastreabilidade e leitura da previa: cada materia agora mostra o nome do edital acima do nome da materia usando `edital_id` real, materias unificadas mostram a composicao dos editais por ID, e topicos deixam de usar truncamento visual para nao parecerem ausentes quando a materia esta aberta. Testes focados do modelo e do modal passaram.
      - [x] Adicionar equivalencia manual de topicos na etapa de escolha de organizacao do ciclo, sem IA e sem fuzzy matching: manter a unificacao automatica apenas para nomes 100% iguais, mas permitir que o aluno clique em `Marcar equivalente`, selecione outro topico como equivalente e confirme. Concluido em 2026-07-07: `CycleMergeComparison` permite marcar topicos livres como equivalentes, escolher candidato de outro edital, confirmar, exibir badge `Manual` e desfazer somente a equivalencia manual. A regra pura em `cycleMergeComparisonModel` impede sobrescrever equivalencias automaticas reais, substitui apenas singletons individuais, permite acumular topicos no mesmo grupo manual e grava `matchType: manual` para auditoria; `mergeService` persiste `match_type='manual'` sem marcar `created_by_ai`. Validado com testes focados, suite completa, typecheck, lint, build, `git diff --check` e fluxo autenticado em `Meus Editais`: marcação `Algebra` + `Função Logaritimica`, badge Manual, desfazer e sem overflow horizontal/erros de console.
      - [ ] Refinar o modal final `Ciclo atualizado`: reduzir excesso de boxes/bordas, equilibrar colunas, deixar explicito que clicar em edital usa o nome como apelido, explicar que o aluno pode personalizar o nome, agrupar `materias/topicos` como resumo e usar CTA no padrao global. Implementacao aplicada em `src/pages/Editais.tsx`; o passo 2/2 foi renomeado para `Finalizar Ciclo`, o CTA virou `Salvar e abrir ciclo` alinhado a direita para mesclagem, e o apelido salvo em `user_cycles.name` agora aparece no cabecalho da fila do ciclo, no painel estrategico da pagina `Ciclo de Estudos` e no Painel principal. Regra de produto ajustada: edital unico ou substituicao salva automaticamente o nome do proprio edital; escolha de nome fica somente para ciclo composto por mesclagem de editais. Ajuste de fluxo: edital unico tambem mostra 2/2 de confirmacao com imagem e texto motivacional, mas sem campos de nome; o CTA nesse caso e apenas `Abrir ciclo`. Ajuste de acolhimento: o 2/2 recebeu imagem gerada em `/images/study-cycle/cycle-generated-success.png`, mensagem dinamica com quantidade de materias/topicos e explicacao curta sobre organizar prioridades, acompanhar conteudo e ajustar a fila na pagina Ciclo. Ajuste de nome composto: no 2/2 de mesclagem o aluno pode selecionar um ou varios nomes de editais para compor automaticamente o nome com `+`, ou digitar um nome livre no campo. Ajuste de data do ciclo: criada `user_cycles.exam_date`; edital unico salva a data do proprio edital, ciclo composto pergunta qual data rege o ciclo e permite escolher data de edital, informar outra ou deixar sem data; Painel passa a usar `user_cycles.exam_date` e nao cai no primeiro edital quando houver composicao. Ajuste de edicao posterior: clicar no nome no Painel edita `user_cycles.name`, enquanto `Meus Editais` continua editando o nome real do edital. Ajuste posterior de seguranca/UX: o `X` fica bloqueado na finalizacao de ciclo composto ate salvar nome/data, o fluxo com mesclagem passa a usar `1/3`, `2/3`, `3/3`, e o layout final foi compactado com campo de nome em largura cheia, sugestoes em chips e menos bordas internas para melhorar mobile. Pendente validacao visual autenticada em dark/light, porque a automacao local caiu no login.
      - [x] Robustecer a recuperacao do passo final de ciclo composto: depois que a mesclagem ja executou `atomic_cycle_load`, uma atualizacao da pagina nao perde materias/topicos porque o ciclo ja esta no banco, mas pode perder a escolha final de `user_cycles.name` e `user_cycles.exam_date`. Concluido em 2026-07-04: `atomic_cycle_load` ja salva nome/data padrao no mesmo fechamento transacional, e o frontend deixou de bloquear o fechamento pelo botao no estado `success` composto; o aluno pode fechar sem perder dados e editar nome/data depois no fluxo existente. Backdrop continua bloqueado no sucesso composto para evitar fechamento acidental. Regra coberta por teste unitario em `cycleConflictModalClose`.
      - [x] Evoluir o alerta premium de data vencida do ciclo: a data padrao do ciclo composto deve ser a prova futura mais proxima entre os editais; se todas as datas ja passaram, manter a mais recente para acionar estado honesto de data vencida. Concluido em 2026-07-04: `atomic_cycle_load` ja salva `name` e `exam_date` junto com o ciclo; a pagina Ciclo agora recebe `user_cycles.exam_date` na fonte de alertas, cria alerta critico `Data da prova vencida` quando a data passou e oferece CTA para atualizar dados em `Meus Editais`; o Painel ja possuia estado `exam_date_past`. Regra coberta por teste em `studyCycleAlerts`.
        - [x] Criar editor direto de `user_cycles.exam_date` para ciclo composto, sem depender de editar a data real de um edital individual; ao salvar, disparar `cycleUpdated` e recalcular metricas/agendas dependentes da prova. Concluido em 2026-07-05: o alerta `Data da prova vencida` abre um dialogo proprio na pagina Ciclo, a mutation TanStack Query persiste somente no ciclo ativo do usuario via service filtrado por `user_id` e `status`, exige o retorno da linha atualizada, atualiza estado/cache local e dispara `cycleUpdated`. O RLS existente exige ownership no `UPDATE`. As metricas do Ciclo e do Painel passam a recalcular pela nova data; agendas SRS nao foram reescritas porque usam a data do edital associado ao topico, nao `user_cycles.exam_date`. Testes focados de alerta, service, hook e dialogo aprovados; validacao autenticada em desktop e mobile sem overflow ou erros de console.
    - [ ] Corrigir `Remover edital do ciclo` para preservar dados: os fluxos de `Meus Editais` e `Subjects` nao podem zerar SRS, topicos, sessoes ou `topic_review_history`; ambos passaram a usar `cycleUnloadService`, que desmonta apenas ciclo, mapa e mesclagens antes da RPC. Modal recebeu titulo em formato de pergunta, `Cancelar`, carregamento, bloqueio durante processamento e fechamento somente apos sucesso. A RPC `atomic_cycle_unload_or_delete` foi auditada, mantem historico e recebeu a migration `20260622145259_secure_atomic_cycle_unload_authorization.sql`: agora valida `auth.uid()`, nega `anon` e permite apenas `authenticated`; migration aplicada e permissoes verificadas no banco. Teste de regressao e build aprovados; pendente validacao visual e ponta a ponta com usuario autenticado.
    - [ ] Robustecer o arquivamento de edital fora do ciclo: Revisoes e prioridades ja filtram exclusivamente `user_cycles.ciclo_atual`, mantendo agendas arquivadas invisiveis sem apagar dados. Adicionado `user_editais.cycle_archived_at`; ao remover/substituir, a RPC grava o inicio da pausa e, ao carregar novamente, desloca `topics.next_review` pelo tempo exato fora do ciclo, preservando atraso anterior, distancia futura, etapa, estabilidade e historico. `atomic_cycle_load` e `atomic_archive_edital_from_cycle` validam `auth.uid()` e bloqueiam `anon`. A nova RPC concentra arquivamento, ciclo, mapa e desmontagem/promocao de `subject_merges` e `topic_merges` na mesma transacao; o frontend faz uma unica chamada e propaga qualquer falha. A RPC antiga `atomic_cycle_unload_or_delete` teve acesso removido de `authenticated` para impedir clientes antigos de contornar o fluxo seguro. Modal alternativo de `Subjects` foi alinhado ao de Editais e o cache de revisoes passou a incluir `userId`. Migrations `20260622172718_secure_atomic_cycle_load_authorization.sql`, `20260622172922_archive_cycle_review_schedule.sql`, `20260622173236_fix_cycle_resume_topic_scope.sql`, `20260622173841_backfill_archived_cycle_timestamps.sql`, `20260622174607_atomic_archive_edital_with_merges.sql` e `20260622180047_retire_legacy_cycle_unload_rpc.sql` aplicadas. Backfill confirmou 6 editais arquivados com timestamp e zero sem pausa registrada. Prova transacional com rollback confirmou 17 agendas deslocadas exatamente 10 dias. Nova prova com tres editais confirmou promocao dos sobreviventes, preservacao de sessoes/historico e rollback integral apos falha forcada, sem persistir fixtures. Testes focados aprovados; pendente validacao visual e ponta a ponta pela UI autenticada.
      - [x] Tornar a desmontagem de `subject_merges`, `topic_merges`, mapa e substituicoes do ciclo uma unica operacao transacional no banco, com erro explicito e rollback automatico.
    - [x] Ajuste pontual do card de edital em `Meus Editais`: tempo passou a usar somente `study_sessions.session_duration_minutes` real; se nao houver sessao registrada, o card mostra `0m` e `Sem registro`, sem estimativa por revisao. A data superior passou a mostrar a data da prova em vez da data de importacao/criacao; o alerta inferior de dias/prova foi removido do card para reduzir ruido; a origem (`Copia IA`, `Copia Catalogo`, `Catalogo removido`, `Manual`) foi movida para o rodape junto das acoes de editar/excluir, liberando espaco no topo para o nome do concurso; o titulo passou para o formato `ano - nome`, sem badge, com limite de duas linhas para lidar com nomes curtos e longos; cargo e banca viraram linhas compactas com icone proprio e uma altura minima para separar melhor da data em desktop; a area superior ate a primeira divisoria recebeu altura fixa controlada e a data ficou ancorada no rodape dessa area para alinhar de verdade a partir da data da prova; os botoes ganharam respiro antes da linha do rodape para nao parecerem atras da borda; os cards internos de `Progresso` e `Tempo` foram reduzidos e estreitados dentro do card, com superficie propria em degradê neutro sutil para nao competir com os botoes padrao, textos `Tópicos`, `Matérias` e `Sem registro` em caixa normal; a origem no rodape ficou levemente indentada; a grade usa `auto-fit/minmax` com largura minima de card, quebrando para uma coluna antes de espremer o conteudo e mantendo cards da mesma fileira com altura uniforme; barra de progresso com 0% ficou mais discreta e sem borda vazia estranha. Validado com build/lint, sem redesenhar o card.
    - [x] Refinar visualmente o card de edital sem perder a altura reservada para nomes longos: Progresso e Tempo foram unificados em um painel com degradê discreto e divisoria interna; o tempo zerado ficou neutro e a barra sem meta real foi removida; `Ver Matérias` ganhou tratamento azul secundario; editar/excluir passaram para uma bandeja expansivel sem comprimir as acoes principais no mobile, com azul para edicao e vermelho destrutivo para exclusao. Validado em desktop e 375px, sem rolagem horizontal, alem de lint e build.
    - [x] Ajustar o cabecalho do modal `Ver Matérias`: mostrar nome do concurso em destaque, cargo com icone, banca com icone, contagem de materias/topicos e badge de origem (`Copia Catalogo`, `Copia IA`, `Manual`) compondo o mesmo cabecalho. Manter sync status discreto no topo e nao mexer na lista/fluxos internos do modal.
      - [x] Refinamento responsivo do cabecalho: em mobile/tablet, o icone principal fica pequeno e alinhado ao nome do concurso; em desktop, mantém o bloco maior. Cargo e banca mantem icones pequenos com cores especificas, banca deixa de usar texto azul, e origem (`Copia IA`/equivalentes) passa a aparecer apos a contagem de materias e topicos.
    - [x] Refinar o modal `Ver Matérias` sem criar abstracao global: titulo do edital em cor de conteudo, botao fechar com hover destrutivo, toolbar responsiva com busca, expandir/recolher, criacao manual recolhida e `Adicionar em lote`; lista com cabecalho proprio; linha de materia mais compacta, sem drag/olho/anotacao como acoes primarias; peso da prova seguindo a mesma anatomia da Fila do Ciclo, com metadado clicavel, editor compacto substituindo a propria linha e confirmacao verde inline apos salvar; exclusao de materia rebaixada para acao secundaria dentro da materia expandida. Validado com lint/build.
      - [x] Permitir que `Nova Matéria` cadastre uma ou várias matérias separadas por ponto e vírgula, ignore duplicadas, mantenha o formulário aberto após salvar e devolva foco ao campo. O fluxo `Adicionar em Lote` continua reservado à inclusão de tópicos.
      - [x] Corrigir a inclusão de tópicos em lote para manter o painel aberto durante a persistência, exibir `Salvando matéria e tópicos...`, usar os registros reais retornados pelo banco antes de atualizar a lista e recolher somente após confirmação. A primeira ação passou a se chamar `Conferir tópicos` e a confirmação final `Salvar tópicos`.
      - [x] Padronizar o foco após inclusão: `Nova Matéria` recolhe as demais e abre a primeira criada quando houver vários nomes separados por `;`; `Adicionar em Lote` recolhe as demais e abre a matéria que recebeu os tópicos, inclusive quando ela já existia. Em ambos os casos, limpar filtro, rolar até a matéria e aplicar foco/destaque curto.
    - [x] Evoluir o modal `Ver Matérias` para acabamento premium e responsivo: implementada sheet ancorada nas laterais e no rodape no mobile; celular em paisagem usa toda a largura e apenas 8px de respiro superior; tablet touch em retrato/paisagem usa painel quase em tela cheia com 16px laterais; desktop recebe dialog centralizado com a largura anterior limitada diretamente por `max-w-5xl` (1024px), evitando que a utilidade `w-full` prevaleca e estique o painel em monitores ultrawide. A distincao combina largura, altura e tipo de ponteiro, com protecao adicional por largura a partir de 1280px para monitores que reportem o ponteiro incorretamente. Aplicados `dvh`, safe area, bloqueio de scroll da pagina, `Esc`, semantica de dialog, toolbar rolavel quando o teclado reduz a altura, controles maiores, menos microtexto e cores semanticas em busca, criacao, edição, tópicos e exclusoes. O degrade sutil do cabecalho foi mantido; backdrop e modal passaram a ser renderizados por portal diretamente no `body`, fora da árvore da pagina `Meus Editais`. O backdrop preto ocupa uma camada fixa independente com `100dvh`/largura da viewport e o fundo raiz fica preto durante a abertura, impedindo recorte pela altura, scroll ou contêiner da pagina. Contagem, separador e peso foram alinhados com distancia simetrica; percentuais de peso passaram a exibir valor inteiro arredondado (`33%`), cobertos por teste. Validado visualmente em sessao autenticada em 2026-07-02: desktop 1280px, mobile 375px, tablet 768px, ultrawide 1600px e tema claro, todos sem overflow horizontal; painel respeita `max-w-5xl` e sheet mobile ocupa a largura correta.
  - [ ] Redesenhar o mini `Mapa do edital` na rodada visual posterior: trocar caixas grandes com pouca informacao por composicao mais refinada, com icones e micro-metricas em linha quando couber, evitando duas linhas para dados pequenos e evitando card dentro de card. Primeira aplicacao feita no modo verticalizado com `app-gradient-panel`, micro-metricas e superficies com blur; falta validacao visual real em tablet/mobile antes de marcar como concluido.

As partes pesadas ficam para depois: motor definitivo de cobranca/incidencia, automacao/Cron, flashcards/questoes globais e relatorios avancados.

## Ajustes transversais recentes

- [x] Corrigir fallback de `Anotacoes Gerais` no topo global: se o Quill nao inicializar, a aba `Anotacoes` nao fica mais como painel vazio; mostra editor simples editavel e preserva salvar/fechar. Tambem removido uso de `window.innerWidth` direto no render do editor.
- [x] Reduzir flicker no passo final de `Ciclo atualizado` em `Meus Editais`: ao chegar no estado de sucesso, o overlay de processamento `Finalizando ciclo` e desmontado antes da troca de tela, evitando piscar sobre os campos de nome/data.
- [x] Corrigir flicker anterior ao passo `3/3 Finalizar Ciclo`: ao clicar em `Unificar equivalentes`, a finalizacao agora usa trava visual propria ate sucesso/erro e o loading global de `Editais` nao desmonta mais a rota enquanto o modal do ciclo esta processando. Validado no navegador em 2026-07-10: antes havia dois buracos sem modal entre `Cruzando históricos`, `Salvando informações` e `CICLO GERADO`; depois da correção a sequência ficou contínua, sem estados vazios.
- [x] Evitar falso aviso de timer/revisao em outra janela ao confirmar primeiro contato na propria Ciclo: o listener de realtime do timer nao assume mais que `old.review_count` ausente significa avanco externo; so considera avanco quando o payload antigo traz contagem confiavel ou quando o topico ficou realmente concluido. Cobertura: `TimerContext.test.ts`.
- [x] Corrigir notificacoes atras do blur/modal de forma definitiva e substituir o visual antigo: `React Toastify` foi removido e trocado por sistema proprio `PremiumToastViewport` com portal no `body`, camada acima de dialogs, layout mobile centralizado, desktop no canto inferior direito, icones Lucide, cores semanticas, loading/update, dedupe via `toastManager`, compatibilidade com `toastGate`, `aria-live` e animacao em `transform/opacity` com `prefers-reduced-motion`. O auto-dismiss pausa ao passar o mouse, focar pelo teclado ou segurar com o dedo no mobile, para permitir leitura. Cobertura tecnica: lint, build, `toastGate.test.ts`, `TimerContext.test.ts` e `useTopicStudySessionFlow.test.tsx`.
- [x] Aplicar limpeza inicial de semantica/UX na pagina Revisoes: estados vazios trocaram emojis/gradientes roxos por icones Lucide e tokens do sistema, CTAs ficaram alinhados ao fluxo Ciclo/Editais, banner de recuperacao virou `Revisoes prioritarias` sem tom de prototipo, assistente de revisao deixou de mostrar texto simulado e logs de debug foram removidos do fluxo de revisao. Ainda falta redesenhar a lista e a hierarquia visual completa da pagina Revisoes em rodada propria.
- [x] Corrigir duplicidade de topico equivalente em ciclo composto: quando dois editais mesclados geravam duas linhas com o mesmo topico canônico (ex.: `Crase`) dentro da materia unificada, a Ciclo passou a consolidar em uma linha escolhendo o registro com maior progresso/conclusao, e a pagina Revisoes passou a deduplicar tambem pelos `topicMappings` de `user_cycles.unification_map`, inclusive quando existirem mappings separados de um unico topico com o mesmo nome canônico. Concluidos passam a exibir estado cognitivo `Dominando` e a linha de Revisoes mostra `N/4 revisoes`. Cobertura: `useCycleSubjectListState.test.ts`, `reviewMergeScope.test.ts` e `RevisoesList.test.ts`.
  - [x] Ajustar `Ver Materias` para topicos equivalentes de edital mesclado: o topico original deixou de ficar riscado quando o progresso vem de revisao/conclusao; a linha passa a mostrar badge pequeno e semantico (`N/4 revisoes`, `4/4 revisoes` ou `4/4 revisoes no ciclo`) e a porcentagem da materia usa apenas vinculos explicitos de mesclagem (`topicMappings`/`topic_merges`) como fonte da verdade. Correcao posterior: o reparo deixou de enviar campos inexistentes em `topics` (`is_completed`) e de filtrar por `user_id` na tabela errada; o fluxo de revisao tambem passou a sincronizar sempre pelo mapa do ciclo mesmo quando a RPC de `topic_merges` cobre apenas parte dos equivalentes. Fechamento arquitetural: criado grafo explicito de equivalencias de topico; nome igual/parecido nao decide equivalencia e serve apenas como dado de exibicao. Se um topico equivalente nao esta no grafo, a falha correta esta na gravacao da mesclagem, nao na tela consumidora. Cobertura: `topicEquivalenceGraph.test.ts`, `editalTopicProgress.test.ts`, `editalTopicProgressRepair.test.ts`, `reviewMergeScope.test.ts` e `cycleMergeService.siblings.test.ts`.
  - [x] Manter mescla funcional de topicos e estabilizar progresso sem tabela nova: quando topicos equivalentes sao confirmados, o sistema consolida um unico estado ativo e grava nos topicos fisicos do grupo. A regra usa conclusao se qualquer equivalente concluiu, maior `review_count/total_reviews`, primeira data de estudo, ultima revisao, proxima revisao mais urgente quando ainda nao concluido, dificuldade mais conservadora, metricas SRS do representante mais avancado, `last_session_duration` da revisao mais recente e preserva `study_sessions` como fonte real de tempo sem duplicar sessoes. O fluxo futuro de revisao passou a enviar dificuldade, `total_reviews`, duracao, notas e campos SRS para a RPC `sync_topic_merge_progress`; migrations `20260711123000_consolidate_existing_topic_merge_progress.sql` e `20260711124000_expand_sync_topic_merge_progress_fields.sql` consolidam dados existentes e expandem a sincronizacao. Cobertura: `topicProgressConsolidation.test.ts`, `topicMergeProgressService.test.ts`, `topicMergeConsolidationMigration.test.ts`, `expandedTopicMergeProgressRpcMigration.test.ts` e `mergeService.test.ts`.
  - [x] Definir e implementar UX explicita para estudar do zero sem criar camada historica paralela: remover/descarregar edital do ciclo preserva estado e agenda; estudar do zero virou escolha explicita no modal de carga quando o ciclo esta vazio e o edital ja tem progresso, ou quando o aluno substitui/troca o ciclo por edital com progresso anterior. Ao adicionar/mesclar edital em ciclo existente, o progresso segue automaticamente. A operacao de reset foi concentrada na RPC `reset_edital_study_progress`, escopada ao edital/topicos escolhidos, removendo `topic_review_history` e `study_sessions` relacionados e zerando campos SRS dos topicos antes do `atomic_cycle_load`. Correcao posterior: `atomic_cycle_load` recebeu `p_reset_cycle_state` para zerar tambem o estado ativo do ciclo (`ciclos_realizados`, `materias_estudadas_ciclo`, `indice_atual`, datas, eventos e snapshots estrategicos) quando a escolha e `Iniciar do zero`; assim nao aparece mais topico zerado dentro de `Ciclo 6`. Regra fechada em seguida: se `user_cycles.ciclo_atual` esta vazio antes de carregar/substituir, o proximo carregamento inicia novo contexto de ciclo e tambem zera esse estado, mesmo que o aluno mantenha progresso proprio do edital; ciclo vazio nao herda contador antigo. O fluxo tambem passou a bloquear substituicao com payload vazio para nao cair em `Nenhuma materia ativa no ciclo` apos trocar edital. Correcao final: substituir ciclo sempre reinicia o estado operacional do ciclo (`ciclos_realizados`, materias ja marcadas, indice e snapshots), mesmo quando o aluno preserva o historico do edital; preservar historico significa manter revisoes/topicos do edital selecionado, nao herdar o ciclo anterior. Para producao, aplicar migrations `20260711120000_reset_edital_study_progress.sql`, `20260712172110_reset_cycle_state_on_zero_study.sql`, `20260712172622_reset_empty_cycle_context_on_load.sql` e `20260712185000_reset_cycle_state_on_replace.sql` e deployar `supabase/functions/user-rpc`.

## Backlog futuro: radar de concursos e noticias

- [ ] Avaliar implementacao de um radar de concursos/noticias recentes dentro do vouRevisar, inspirado em APIs publicas simples como `concursos-api-deno`, mas sem depender delas como fonte critica.
- [ ] Tratar noticias e concursos abertos/previstos apenas como descoberta e contexto para o aluno, nao como dado confiavel para montar ciclo, calcular estrategia, importar edital ou gerar questoes.
- [ ] Se implementado, exigir fonte e link por item, cache persistente, data de coleta, estado de erro honesto e aviso para conferir informacoes oficiais no edital/orgao/banca.
- [ ] Antes de usar scraping de terceiros, verificar termos de uso, robots.txt, estabilidade tecnica e risco juridico; preferir fontes oficiais, RSS/APIs autorizadas ou curadoria propria.
- [ ] Definir UX discreta para nao transformar a pagina de ciclo em portal de noticias; possivel recorte: widget separado ou pagina `Concursos em alta`, fora do fluxo principal de estudo.

## Backlog futuro: onboarding do primeiro ciclo

- [ ] Redesenhar o estado vazio do Ciclo de Estudos como onboarding guiado de primeiro uso, substituindo a mensagem isolada `Nenhum edital carregado no Ciclo de Estudos` por uma jornada curta que explique o valor real do vouRevisar e ofereca caminhos objetivos: importar PDF do edital, usar edital cadastrado/catalogo quando existir ou criar manualmente.
- [ ] O onboarding deve vender o fluxo real do produto sem prometer dados inexistentes: peso so pode aparecer quando veio do edital extraido pela IA, foi informado manualmente pelo usuario ou esta cadastrado em edital do sistema pelo admin; se ausente, mostrar estado honesto como `sem peso informado`.
- [ ] O onboarding nao deve exibir cobranca/incidencia como dado inicial do ciclo. Esse sinal entra apenas depois que o ciclo e iniciado e a IA propria de cobranca processa os topicos, calcula o nivel de cobranca e grava o resultado no sistema.
- [ ] Manter a primeira versao enxuta e funcional, sem mascotismo generico nem landing page decorativa: progress bar simples, cards de escolha, CTA principal, estados de carregamento/erro honestos e responsividade real em desktop, tablet e mobile.
- [ ] Implementar depois que os fluxos pendentes e validacoes funcionais do sistema estiverem estabilizados; nao misturar esse redesenho com correcoes de ciclo, revisoes, merge, assinatura ou Supabase.

## Backlog transversal: acesso, assinatura e reconexao

- [x] Evitar que erro temporario de rede na verificacao de role/assinatura redirecione admin ou aluno pagante para `/planos`.
- [x] Nao chamar ausencia de assinatura de `Plano Free` no novo menu; usar `Sem plano ativo` para usuario comum sem acesso, preservando `Proprietario`, `Administrador`, `Teste gratuito`, `Plano mensal` e `Plano anual` quando esses estados existirem.
- [x] Tornar `/planos` contextual para usuario logado: sem plano continua como aquisicao, mensal ativo mostra plano atual e exibe o anual apenas como referencia de preco, anual ativo vira leitura/gestao sem empurrar nova compra. Concluido em 2026-07-08: a pagina usa `useSubscriptionInfo`, destaca o plano atual, leva o plano atual para `/conta?tab=assinatura` e remove CTA falso de migracao enquanto a troca mensal -> anual nao existir no backend.
- [ ] Criar fluxo backend seguro para migrar mensal para anual no Asaas antes de liberar checkout real de upgrade. O checkout atual cria nova assinatura e atualiza vinculo local; liberar isso como upgrade pode duplicar cobranca se a assinatura mensal anterior nao for cancelada/trocada de forma transacional e auditavel.
- [x] Reduzir leituras concorrentes de Auth no boot para evitar `NavigatorLockAcquireTimeoutError` e `AbortError: Lock broken` em reload local. Concluido em 2026-07-08: `useSubscription` e `useUserProfile` passaram a usar o `user` do `AuthContext`, `logSessionStart` recebe o usuario ja carregado, logs de login/logout nao fazem `getSession` redundante e o efeito principal do `AuthContext` nao reinstala listener ao atualizar `user`.
- [ ] Unificar hooks de assinatura/acesso para remover regras duplicadas de admin, owner, trial e assinatura paga.
- [ ] Validar fluxo de reconexao no navegador em desktop e mobile, incluindo aluno pagante, trial ativo, admin/owner e usuario realmente sem assinatura.

## Backlog operacional: Codex e Git

- [ ] Corrigir o perfil de execucao das conversas locais do Codex para permitir escrita em `.git`: a nova conversa local foi criada, mas tambem iniciou com `.git` somente leitura e aguarda aprovacao explicita para escrita no repositorio e acesso de rede. Nao tentar contornar por script, alterar permissoes Unix do repositorio ou ampliar acesso global sem necessidade.
- [x] Reconciliar com cuidado o historico de migrations local e remoto do Supabase. Verificado em 2026-07-03 com `supabase migration list --linked`: todas as versoes locais/remotas estavam alinhadas ate `20260627162043`, sem lacunas e sem necessidade de `migration repair`. Evidencia registrada em `docs/supabase-migration-reconciliation-2026-07-03.md`.
- [x] Regenerar e revisar `src/integrations/supabase/types.ts` em entrega dedicada. Concluído em 2026-07-03: `supabase gen types --linked --lang=typescript --schema public` atualizou o arquivo com o schema remoto real, incluindo `ai_usage_logs`, `cycle_rotation_snapshots`, `cycle_study_events`, `edital_incidence_maps`, `topic_incidence_catalog`, `ai_status.model_name`, `check_ai_circuit_breaker`, `get_user_ai_limits` e a RPC `atomic_delete_subject`; `npm run typecheck` validou os consumidores.

## Plano transversal: motor de revisao adaptativa

- [x] Unificar o fluxo ativo em quatro revisoes programadas apos o primeiro contato: R1 em ate 24 horas, R2 com alvo de 7 dias, R3 na janela de 15 a 30 dias e R4 na janela de 60 a 90 dias.
- [x] Manter a avaliacao atual `Facil`, `Medio` e `Dificil`; todas avancam a etapa, mas escolhem pontos diferentes da janela adaptativa.
- [x] Encerrar o programa automatico somente depois da quarta revisao (`primeiro contato + 4 revisoes`), gravando `completed = true` e `next_review = null`.
- [x] Usar como sinais cognitivos dificuldade atual, estabilidade, intervalo anterior, tendencia recente e atraso real; usar incidencia/cobranca e data da prova como sinais estrategicos separados e explicaveis.
- [x] Nao usar duracao da sessao diretamente para alterar memoria/intervalo enquanto o dado nao estiver normalizado por aluno, volume e tipo de estudo; manter a duracao como diagnostico real.
- [x] Corrigir a fonte da data da prova no motor: resolver pelo edital do topico (`topics.edital_id -> user_editais.exam_date`), sem depender de `user_settings.data_prova_meta`.
- [x] Quando a data da prova for criada, alterada ou removida, recalcular apenas agendas futuras dos topicos daquele edital, preservar todo o historico e informar ao aluno quantas revisoes foram ajustadas.
- [x] Sem data da prova, manter o programa adaptativo normal; nunca inventar horizonte, quantidade futura ate a prova ou compressao inexistente.
- [x] Corrigir dados divergentes sem fabricar historico: migration `20260622133242_repair_adaptive_review_states.sql` aplicada; 3 topicos antigos reabertos para calibracao, 4 agendas ausentes reparadas e verificacao final com zero topicos iniciados sem `next_review`.
- [ ] Tratar revisoes manuais apos a conclusao como etapa futura da pagina Revisoes; registrar de forma distinguivel para que contatos acima do programa indiquem importancia percebida ou dificuldade persistente.
- [ ] Eliminar ao final os motores e perfis legados de revisao fixa (`sessionUtils`, hooks sem consumidores e usos de `REVIEW_PROFILES`) depois de provar que nenhuma rota ativa depende deles.
- [ ] Reutilizar a mesma semantica de etapas e conclusao no Painel, Ciclo, Revisoes, calendarios, estatisticas e componentes de edital para impedir contagens divergentes. Pagina Revisoes e fluxo ativo alinhados em 2026-06-22; calendarios/componentes legados ainda precisam de auditoria no fechamento. Em 2026-07-11, `isReviewProgramCompleted` passou a tratar `review_count/reviewCount >= COMPLETION_CONTACT_COUNT` como conclusao defensiva e `cycleTopicPresentation`/`studyCycleSubjectState` passaram a reutilizar essa semantica; Estatisticas ficou fora do recorte por decisao do produto.
- [ ] Plano detalhado de implementacao: `docs/superpowers/plans/2026-06-22-adaptive-review-engine.md`.
