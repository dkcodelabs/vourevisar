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
- [ ] Salvar historico de uso/ordem real de estudo no ciclo para sugerir reorganizacao sem alterar a fila automaticamente.

## Estrutura geral da pagina

### Layout

- [x] Topo horizontal premium.
- [x] Coluna esquerda com fila do ciclo existente.
- [x] Coluna direita com resumo e insights do edital.
- [ ] Rodape discreto com progresso semanal.
- [ ] Responsividade real para desktop, tablet e mobile.

### Visual

- [ ] Minimalista.
- [ ] Dark mode elegante.
- [ ] Alto espacamento.
- [ ] Sem excesso de bordas.
- [ ] Sem glow exagerado.
- [ ] Hierarquia visual clara.
- [ ] Legibilidade forte em nomes longos de materias/topicos.

## Topo da pagina

O topo deve transmitir progresso estrategico, clareza e continuidade.

### Manter

- [ ] Nome do ciclo.
- [ ] Edital atual ou editais ativos no ciclo.

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

- [ ] Excesso de cards tecnicos.
- [ ] Visual administrativo.
- [ ] Blocos gigantes de recomendacao IA.
- [ ] Repetir uma unica "melhor materia agora" como se fosse comando obrigatorio.

## Coluna esquerda: fila estrategica do ciclo

Esta coluna e o foco principal da pagina.

### Decisao

- [x] A fila ja existe.
- [x] A fila deve preservar a ordem escolhida pelo aluno.
- [x] A fila deve parecer mais viva, estrategica e premium.
- [ ] O sistema deve sugerir/alertar, mas nao reorganizar sozinho.

### Cards das materias

Cada materia deve possuir:

- [ ] Nome da materia.
- [ ] Quantidade total de topicos.
- [ ] Quantidade de topicos iniciados.
- [x] Indicador percentual de exploracao foi descartado por redundar com `iniciados/total`.
- [x] Badge pequena de peso no edital.
  - Exemplos:
    - `Peso alto`
    - `Peso medio`
    - `Peso baixo`
    - `Sem peso informado`
- [x] Tooltip ou texto curto quando o peso for desconhecido.
  - Exemplo: `Peso nao identificado no edital. Voce pode preencher depois.`

### Estados visuais das materias

- [x] Materia em andamento com destaque suave quando tem topicos iniciados no ciclo.
- [x] Materia concluida com cabecalho verde discreto e icone check.
- [x] Materia concluida automaticamente recolhida.
- [x] Materia concluida permanecendo na mesma fila.
- [x] Remover area separada `Concluidas no ciclo`.
- [ ] Definir regra futura: quando todos os topicos da materia estiverem concluidos, decidir se a materia deve ser fechada automaticamente no ciclo ou apenas sugerir fechamento.

## Topicos

Cada topico deve possuir:

- [ ] Nome do topico.
- [ ] Estado visual:
  - Nao iniciado.
  - Iniciado.
  - Em revisao.
  - Concluido.
- [x] Indicador de incidencia recente quando houver dado.
- [x] O indicador deve usar `topics.total_volume` quando disponivel.
- [x] Quando nao houver volume/incidencia, nao inventar dado nem exibir frase de ausencia.

## Botoes dos topicos

Substituir icones confusos por CTAs claros.

- [x] Topico nao iniciado: `Iniciar estudo`.
- [x] Topico iniciado: `Continuar estudo`.
- [x] Topico em revisao: `Revisoes`.
- [x] Topico concluido: `Concluido`.
- [x] Priorizar clareza acima de minimalismo extremo.
- [ ] Garantir que os botoes nao quebrem no mobile.

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
- [x] Topico mais cobrado e menos cobrado, somente entre topicos analisados.
- [x] Materia com mais topicos nao iniciados, somente se houver pendencia real.
- [x] Estado vazio honesto quando nao houver insights calculaveis.
- [x] Nao exibir alerta para peso/incidencia ausente enquanto a IA ainda vai gerar esses dados.

Nao mostrar nesta secao:

- [ ] Retencao.
- [ ] FSRS.
- [ ] Esquecimento.
- [ ] Estabilidade de memoria.
- [ ] Atrasos detalhados de revisao.

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
- [ ] A pagina do ciclo ainda nao consome esses campos no tipo `StudyCycleSubject`.
- [ ] A pagina do ciclo ainda nao mostra peso visualmente.

### Regra de produto

- [ ] Nunca inventar peso.
- [ ] Peso ausente nao bloqueia a pagina.
- [ ] Peso ausente deve aparecer como estado neutro, sem alerta.
- [x] Peso ausente pode ser preenchido diretamente na pagina de ciclo clicando em `Sem peso`.
- [ ] Se houver peso por bloco, nao distribuir automaticamente entre disciplinas.
- [ ] Permitir que o aluno ajuste manualmente em local apropriado.
- [ ] Na pagina de ciclo, usar peso apenas como sinal/alerta, nao para reordenar automaticamente.

## Incidencia dos topicos

### Estado atual

- [x] Existe base inicial via `topics.total_volume`.
- [x] O sistema de GUT/Google/IA ainda esta em evolucao.
- [ ] O tipo `StudyCycleTopic` ainda nao carrega `total_volume`.
- [ ] A UI do ciclo ainda nao mostra incidencia/cobranca.

### Regra de produto

- [ ] Incidencia deve ser sinal visual, nao regra obrigatoria de ordem.
- [x] Enquanto o motor de nota ainda esta em validacao, nao mostrar baixa/media nem score numerico para o aluno.
- [x] Mostrar para o aluno apenas destaque de `Cobrança alta` quando houver sinal bruto alto.
- [ ] Quando o motor de questoes/cobranca estiver consolidado, reavaliar exibicao de baixa/media e score mais detalhado.
- [x] Quando nao existir dado, nao mostrar badge de incidencia na linha do topico.
- [x] Quando existir dado, mostrar apenas o volume numerico do topico.
- [ ] Nao exigir finalizar 100% a IA de incidencia antes de melhorar a pagina.
- [ ] Preparar a pagina para receber dados melhores depois sem refatoracao grande.

## Alertas estrategicos

Os alertas devem apoiar decisao, nao comandar o aluno.

- [x] Criar um motor local de alertas estrategicos com severidade, motivo, dado usado e acao sugerida.
- [x] Avisar quando uma materia com peso conhecido estiver pouco iniciada.
- [x] Avisar quando existir materia importante ainda sem nenhum topico iniciado.
- [x] Avisar quando houver topicos com maior volume/incidencia ainda nao iniciados.
- [ ] Avisar quando houver topicos com maior volume/incidencia iniciados, mas ainda nao revisados, se houver dado de revisao confiavel.
- [x] Avisar quando a data da prova estiver proxima e ainda existirem topicos relevantes abertos.
- [ ] Avisar quando o aluno estiver concentrando estudo em poucas materias e deixando outras relevantes paradas.
- [x] Avisar quando uma materia sem peso impedir calculo melhor, apenas se houver acao direta para preencher o peso.
- [ ] Avisar sobre incidencia ausente apenas se houver caminho claro para rodar/gerar analise da IA.
- [x] Oferecer acao clara sem alterar a fila automaticamente.
- [ ] Evitar alertas grandes, repetitivos ou culpabilizantes.
- [ ] Nao transformar ausencia de peso/incidencia em problema quando a IA ainda nao gerou dado e o aluno nao pode agir.

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
- [ ] Sugestao de reorganizar fila: depende de historico de uso da ordem do ciclo e prioridade calculada.
- [ ] Fechar automaticamente materia com todos os topicos concluidos: depende de decisao de produto para nao confundir ciclo com conclusao definitiva.

## Historico de uso da fila e ordem real de estudo

A ordem salva em `user_cycles.ciclo_atual` mostra a ordem escolhida pelo aluno. Ela nao mostra como ele realmente estudou.

### Objetivo

- [ ] Registrar eventos reais de estudo no ciclo: topico novo iniciado, topico ja aberto revisado/retomado, materia marcada como estudada, materia devolvida para fila, ordem alterada manualmente.
- [ ] Guardar posicao da materia no ciclo no momento do evento.
- [ ] Guardar ciclo atual, edital, materia, topico, tipo de evento e data/hora.
- [ ] Usar esse historico para detectar padroes:
  - [x] materia importante sempre empurrada para o fim;
  - [ ] aluno estudando fora da prioridade escolhida;
  - [x] materias de alto peso ignoradas em ciclos seguidos;
  - [x] muitas revisoes/retornos a topicos ja abertos e poucos topicos novos;
  - fila manual muito desalinhada com peso/incidencia.

### Regra de produto

- [ ] O sistema pode sugerir reorganizacao da fila, mas nao deve aplicar automaticamente.
- [ ] Sugestao deve explicar o motivo: peso, incidencia, data da prova, atraso de cobertura ou historico de negligencia.
- [ ] A acao deve ser reversivel e manual: `Aplicar sugestao`, `Ver motivo`, `Ignorar por enquanto`.

### Persistencia sugerida

- [x] Criar tabela futura `cycle_study_events`.
- [ ] Campos sugeridos:
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
- [ ] Nao usar apenas `last_reviewed_at` para medir avanco do ciclo, pois continuar/revisar topico antigo nao e topico novo.

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
- [ ] Nao salvar contadores diarios permanentes se eles puderem ser calculados de eventos/historico.
- [ ] Evitar campos agregados que podem ficar inconsistentes com `topics` e `topic_review_history`.

### Lacunas reais de dados

- [x] Eventos especificos da fila/ciclo existem para: iniciar topico novo, revisar/retomar topico antigo, marcar materia, devolver materia, reordenar fila.
- [x] O sistema salva `cycle_number` e `subject_position` em cada acao de estudo registrada no ciclo.
- [ ] `study_sessions` registra sessoes, mas nao diferencia bem evento de primeiro contato vs revisao/retorno a topico ja aberto.
- [ ] Confirmar schema atual de `study_sessions`: o hook usa `session_duration_minutes`, enquanto a migracao base mostra `duration_minutes`; corrigir antes de depender desse dado.
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

- [ ] `cold_start`: sem uso suficiente; mostrar contexto neutro, nao cobranca.
- [ ] `started`: alguns topicos iniciados; mostrar metas leves e alertas informativos.
- [ ] `active`: uso consistente por alguns dias; mostrar risco, ritmo, deficit e prioridade.
- [ ] `historical`: ciclos/eventos suficientes; mostrar comparacoes, padroes e sugestao de reorganizacao.

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
- [ ] Nao misturar "fechar primeiro contato" com "concluir revisoes".
- [ ] Toda previsao deve dizer de onde veio: media dos ultimos dias, dias ate prova ou quantidade pendente.

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
  - Estado atual: a busca usa janela de 3 anos (`anosPreferencia = 3`), via filtro `after:<ano atual - 3>`.
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
  - [ ] Criar backfill para recalcular score dos topicos ja analisados antes da versao `2026-06-04-normalized-incidence-score`.
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
- [ ] Configurar Supabase Cron para chamar a Edge Function em intervalo controlado.
  - Definir frequencia inicial conservadora.
  - Chamar `process-topic-incidence` com lote pequeno.
  - Usar segredo seguro no header, sem expor chave no frontend.
  - Definir autenticacao segura para chamadas internas ao `ai-handler` quando nao houver JWT de usuario.
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
- [ ] Ajustar dark mode.
- [ ] Validar visual no navegador.
- [x] Corrigir deslocamento do texto da linha do topico.
- [x] Corrigir icones de hover ficando atras do botao principal.
- [ ] Rodar `npm run lint`.
- [x] Rodar `npm run lint`.
- [x] Rodar `npm run build` se a mudanca for ampla.

## Riscos conhecidos

- Alterar a ordem do ciclo automaticamente pode frustrar o aluno. Nao fazer agora.
- Exibir peso ausente como zero pode passar ideia errada. Usar `sem peso informado`.
- Misturar revisao com ciclo deixa a tela confusa. Separar responsabilidades.
- `topics.total_volume` ainda pode ser incompleto. Tratar como dado opcional.
- Merge de editais/ciclos e historico de revisao sao areas sensiveis. Nao alterar sem recorte claro.

## Proximo passo imediato

Deployar e testar a versao `2026-06-05-accurate-search-limit` da Edge Function. Depois disso, configurar o Supabase Cron para rodar a Edge Function automaticamente em lote pequeno e controlado. A validacao visual final em desktop/tablet/mobile fica para quando o sistema completo estiver fechado.

## Backlog futuro: radar de concursos e noticias

- [ ] Avaliar implementacao de um radar de concursos/noticias recentes dentro do vouRevisar, inspirado em APIs publicas simples como `concursos-api-deno`, mas sem depender delas como fonte critica.
- [ ] Tratar noticias e concursos abertos/previstos apenas como descoberta e contexto para o aluno, nao como dado confiavel para montar ciclo, calcular estrategia, importar edital ou gerar questoes.
- [ ] Se implementado, exigir fonte e link por item, cache persistente, data de coleta, estado de erro honesto e aviso para conferir informacoes oficiais no edital/orgao/banca.
- [ ] Antes de usar scraping de terceiros, verificar termos de uso, robots.txt, estabilidade tecnica e risco juridico; preferir fontes oficiais, RSS/APIs autorizadas ou curadoria propria.
- [ ] Definir UX discreta para nao transformar a pagina de ciclo em portal de noticias; possivel recorte: widget separado ou pagina `Concursos em alta`, fora do fluxo principal de estudo.
