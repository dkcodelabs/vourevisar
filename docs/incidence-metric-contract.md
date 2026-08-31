# Decisão de produto: retirada da incidência em provas

## Estado

Decisão tomada em 2026-08-30: a funcionalidade de incidência/importância em
prova foi retirada do produto. O vouRevisar não deve buscar, calcular, exibir ou
usar esse sinal para ordenar estudos, revisões, treinos ou recomendações.

## Motivo

- volume de busca não comprova frequência real de cobrança pela banca;
- a API externa usada no experimento será descontinuada;
- cobrir matérias e centenas de tópicos teria custo e operação incompatíveis
  com a margem inicial do SaaS;
- alimentar provas, bancas, matérias e tópicos manualmente criaria uma operação
  de conteúdo que o produto não pode depender para funcionar;
- uma recomendação aparentemente precisa, mas sustentada por cobertura parcial,
  prejudica a confiança do aluno.

## Corte aplicado

- páginas e rotas de `Importância em Prova` removidas da navegação;
- mapa e badges de cobrança removidos de Painel, Ciclo, Revisões e Evolução;
- incidência removida do agendamento de revisões, dos alertas estratégicos, da
  sugestão de fila, dos insights do mentor e do desempate no Treino;
- processamento automático e POC cancelados;
- tabelas, constraints, índice, colunas `topics.incidence_*`, serviços locais e
  Edge Function foram removidos pela migration isolada
  `20260830130908_remove_incidence_legacy`, seguida das migrations
  `20260831003649_drop_unused_incidence_admin_rpc` e
  `20260831003840_drop_unused_topic_audit_columns` e
  `20260831132656_remove_incident_action_log_legacy`; nenhuma estrutura
  executável de incidência permanece no schema atual.

## Regra para reconsiderar no futuro

A funcionalidade só volta a ser avaliada se a solução for simultaneamente:

- autônoma, sem alimentação manual por aluno ou edital;
- auditável e baseada em dados que realmente representem provas;
- barata por edital, com custo marginal previsível e compatível com a margem;
- reutilizável entre usuários sem misturar bancas ou tópicos por nomes parecidos;
- capaz de declarar cobertura e incerteza sem prometer precisão inexistente.

Até lá, a personalização usa apenas dados sustentáveis já pertencentes ao
produto: atraso, agenda, dificuldade registrada, desempenho, histórico de uso,
progresso, data da prova e pesos explícitos do edital quando disponíveis.
