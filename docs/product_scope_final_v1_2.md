# Escopo Final do Produto — V1.2 (Consolidação Enxuta)

Este documento define o estado final do produto para a versão 1.2, após a simplificação do escopo para foco exclusivo na experiência do aluno e preservação interna de ferramentas administrativas.

## 1. Visão Geral
O produto foi otimizado para remover a complexidade técnica (SLA, Analytics, Prazos) da interface do estudante, tornando-a uma Central de Atendimento e Notificações minimalista.

## 2. Experiência do Aluno (Frontend)
A Central do Aluno (Student Hub) foi simplificada e agora consiste em:

### 2.1 Notificações
- **Categorias:** Sistema e Estudo.
- **Linguagem:** Mensagens diretas, sem menção a tempos de resposta ou metas internas.

### 2.2 Central de Pedidos (Antigo Feedback)
- **Terminologia:** O termo "Feedback" foi substituído por "Pedido" ou "Solicitação" para soar mais natural ao usuário final.
- **Abas:** "Notificações" e "Meus Pedidos".
- **Nova Solicitação:** Fluxo em 2 etapas focado em Categoria (Melhoria, Nova Funcionalidade, Problema) e Descrição.
- **Status Visíveis ao Aluno:**
  - **Nova:** Recebida e aguardando triagem.
  - **Planejada:** Aprovada para o cronograma futuro.
  - **Em Desenvolvimento:** Sendo implementada no momento.
  - **Concluída:** Entregue e disponível.
  - **Não Planejada:** Recusada (com justificativa visível).

### 2.3 SLA e Prazos
- **Invisibilidade:** O aluno **não vê** prazos de SLA, cronômetros de resposta ou status de "SLA Breach". Para o aluno, o processo é opaco, focando apenas na solução.

## 3. Experiência Administrativa (Backend e Admin)
As ferramentas de gestão de SLA implementadas na V1.2 continuam ativas e restritas:

- **KPIs de SLA:** Dashboard interno para acompanhamento de tempos médios e cumprimento de metas.
- **Gestão de Triagem:** Capacidade de responder, justificar e alternar status dos pedidos.
- **Audit Log:** Registro de todas as mudanças de status e interações administrativas.

## 4. Exclusões Confirmadas (Dívida Técnica Zerada)
As seguintes iniciativas da antiga V1.3 foram **canceladas** para esta baseline:
1. Exportação de Analytics em PDF/CSV.
2. Alertas Push de SLA para Admins.
3. Comentários internos em threads.
4. Migração de cache para TanStack Query.

---
**Data de Fechamento:** 2026-02-13
**Versão:** 1.2.1-LEAN
