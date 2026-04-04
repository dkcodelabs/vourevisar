### Módulo 1: Normalização e Mesclagem Automática (Hard Code / Sem IA)
**Objetivo:** Limpar a base de dados rapidamente sem gastar tokens, juntando o que é textualmente idêntico.

**Tarefas para implementação:**
1. Criar uma função utilitária (ex: `normalizeText`) que receba uma string, converta para minúsculas, remova acentos, espaços duplos e pontuações finais (pontos, vírgulas).
2. Criar um script/serviço que compare os tópicos/matérias dos editais selecionados usando essa função.
3. Se `normalizeText(topicoA) == normalizeText(topicoB)`, o sistema deve mesclar automaticamente (vincular os IDs) sem necessidade de aprovação do usuário.

---

### Módulo 2: O Motor de Sugestões (Integração com IA)
**Objetivo:** Analisar os tópicos que sobraram do Módulo 1 e identificar semelhanças semânticas.

**Tarefas para implementação:**
1. Criar um *Job/Worker* assíncrono que pegue a lista de tópicos restantes.
2. Enviar essa lista para a API do LLM usando o prompt de agrupamento semântico (aquele que devolve um array `originalTopicsToMerge` com as strings exatas).
3. Salvar o retorno JSON da IA no banco de dados em uma tabela/coleção temporária (ex: `PendingMergeSuggestions`), relacionando os nomes originais que a IA sugeriu agrupar e o respectivo `suggestedName`.

---

### Módulo 3: Interface de Revisão (O "Aviso 💡")
**Objetivo:** Mostrar as sugestões da IA para o usuário aprovar ou rejeitar DURANTE a configuração do ciclo, antes da geração final.

**Tarefas para implementação:**
1. Criar um componente visual de "Card de Sugestão" no frontend para a etapa de "Revisão/Ajustes Finos".
2. O card deve exibir: O nome principal sugerido pela IA e a lista dos tópicos originais que ele vai englobar.
3. O card deve ter duas ações claras: "✅ Unificar" e "❌ Manter Separado".
4. Conectar esses botões aos endpoints do backend que vão efetivar a unificação (acionando a lógica do Módulo 4) ou descartar a sugestão (limpando a sugestão do banco).

---

### Módulo 4: Ação de Mesclagem (A Unificação Real no Banco)
**Objetivo:** Definir a modelagem de banco de dados para suportar a mesclagem sem perda de dados ou exclusão de registros (Soft Merge).

**Tarefas para implementação:**
1. Criar a lógica de relacionamento no banco de dados (Não aplicar Hard Delete nos tópicos originais).
2. Implementar um sistema de "Tópico Pai" e "Tópicos Filhos" (adicionando um campo `parent_topic_id` ou `merged_to_id`).
3. Ajustar as *queries* que geram o ciclo de estudos: o sistema deve buscar e exibir apenas os Tópicos Pais (o nome unificado), agregando/somando o progresso de estudo que pertence aos tópicos filhos.

---

### Módulo 5: Gerenciamento de Tópicos e Efeito Cascata (Soft Delete)
**Objetivo:** Permitir que o aluno gerencie (exclua/restaure) tópicos exclusivamente na página de "Matérias e Tópicos", mantendo a página de "Ciclo" focada apenas na execução. A exclusão deve ocultar o tópico e pausar todo o ecossistema vinculado a ele (revisões e estatísticas).

**Tarefas para implementação:**

1. **Separação de Interface (UI):**
   - A página de "Ciclo de Estudos" NÃO deve ter ações de exclusão. Deve conter apenas ações de execução (marcar como concluído, agendar revisão, etc.).
   - A página de "Matérias e Tópicos" será o painel de controle. Inserir o botão de Lixeira (Excluir) ao lado dos tópicos ativos.

2. **Lógica de Banco de Dados (Soft Delete do Tópico):**
   - Ao clicar em Excluir na página de "Matérias e Tópicos", o sistema faz um UPDATE na tabela que vincula o aluno ao tópico (ex: `cycle_topics`), marcando `is_active = false` (ou preenchendo `deleted_at`).
   - NENHUM dado real (horas, revisões, acertos) deve ser apagado com o comando `DELETE`.

3. **Efeito Cascata nas Revisões e Estatísticas (Filtro Dinâmico):**
   - Ajustar as *queries* (consultas ao banco) do painel principal, da agenda de revisões e das estatísticas.
   - O sistema deve ignorar sumariamente qualquer dado cujo tópico vinculado esteja com `is_active = false`.
   - Isso garante que revisões atrasadas, de hoje ou futuras desapareçam instantaneamente da agenda do aluno, e o tempo estudado nesse tópico pare de contar no gráfico geral.

4. **Ação de Recuperação (Restauração Total):**
   - Na listagem geral do Edital, exibir o botão `+` (Adicionar) para os tópicos que estão com `is_active = false`.
   - Ao clicar no `+`, o sistema altera a flag para `is_active = true`.
   - Ao reativar, todas as estatísticas e revisões (graças ao filtro do passo 3) voltam a aparecer automaticamente.