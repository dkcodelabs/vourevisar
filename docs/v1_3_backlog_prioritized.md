# Backlog Executivo Priorizado — V1.3

Lista de iniciativas detalhadas para o ciclo V1.3, focada em métricas de SLA e colaboração administrativa.

---

## 1. [Fase A] Filtro por Gestor (Atribuição)
- **Objetivo:** Permitir que administradores "assumam" protocolos e que o dashboard filtre a performance individual.
- **In-scope:** 
  - Campo de seleção (combobox) no `AdminFeedback`.
  - Filtro global no Dashboard de SLA por "Atribuído a".
  - Endpoint de listagem de admins/owners.
- **Critérios de Aceite:**
  - Admin consegue filtrar feedbacks que estão sob sua responsabilidade.
  - KPIs de SLA (tempo de resposta/resolução) atualizam dinamicamente para o gestor selecionado.
- **Risco Técnico:** Baixo.
- **Esforço:** S (Small)
- **Prioridade:** P1

## 2. [Fase B] Comentários Internos (Threads)
- **Objetivo:** Viabilizar a colaboração entre admins em protocolos complexos sem expor notas internas ao aluno.
- **In-scope:** 
  - Nova tabela `feedback_comments`.
  - UI de chat/thread na lateral do feedback selecionado.
  - Diferenciação visual entre resposta ao aluno e nota técnica interna.
- **Out-of-scope:** Menções (@usuário) ou anexos em comentários (v1.4).
- **Critérios de Aceite:**
  - Pelo menos 2 admins conseguem trocar notas em um mesmo protocolo.
  - O aluno NÃO vê essas notas através do Student Hub.
- **Risco Técnico:** Médio (Sync de real-time).
- **Esforço:** M (Medium)
- **Prioridade:** P1

## 3. [Fase C] Alertas Push Admin (SLA Alert)
- **Objetivo:** Reduzir o número de estouros de SLA através de avisos proativos.
- **In-scope:** 
  - Sistema de alerta visual (Toast + Banner) quando um ticket estiver a < 10% do prazo final.
  - Verificação de proximidade de breach no carregamento do dashboard.
- **Critérios de Aceite:**
  - Alerta surge em tela se existirem tickets "Em Risco".
- **Risco Técnico:** Médio (Polling vs Real-time).
- **Esforço:** M (Medium)
- **Prioridade:** P2

## 4. [Fase D] Exportação Analytics (CSV/PDF)
- **Objetivo:** Facilitar a geração de relatórios mensais para a diretoria.
- **In-scope:** 
  - Botão "Exportar" no Dashboard.
  - Exportação dos feedbacks filtrados em CSV.
  - Print resumido dos gráficos do dashboard em PDF.
- **Critérios de Aceite:**
  - Arquivos baixados respeitam os filtros ativos (data, status, gestor).
- **Risco Técnico:** Baixo.
- **Esforço:** S (Small)
- **Prioridade:** P2

## 5. [Fase E] Migração TanStack Query (Hardening V2)
- **Objetivo:** Eliminar bugs de stale data e melhorar a percepção de performance (UX).
- **In-scope:** 
  - Substituição do cache manual em `feedbackAnalyticsService.ts`.
  - Implementação de `useQuery` para feedbacks e analytics.
  - Estratégia de invalidation ao salvar/comentar.
- **Critérios de Aceite:**
  - Dados atualizam automaticamente após uma ação (ex: mudar status).
  - Fim de carregamentos manuais (Loading Skeletons automáticos).
- **Risco Técnico:** Alto (Refatoração de serviço core).
- **Esforço:** L (Large)
- **Prioridade:** P3 (Infra)

---
**Legenda de Esforço:** S (< 2 dias), M (3-5 dias), L (> 1 semana)
**Legenda de Prioridade:** P1 (Crítico/Core), P2 (Desejado/Estratégico), P3 (Melhoria Técnica)
