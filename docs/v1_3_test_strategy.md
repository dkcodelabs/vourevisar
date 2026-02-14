# Plano de Testes — V1.3

Este Plano de Testes detalha as camadas de validação necessárias para garantir a qualidade da Release V1.3.

## 1. Testes de Unidade (Vitest)
Focados na lógica de negócios e manipulação de dados.
- **`feedbackCommentService.test.ts`**: Validar criação, deleção (soft-delete) e filtragem de comentários internos.
- **`exportUtils.test.ts`**: Testar a conversão da estrutura JSON do Analytics para CSV (RFC 4180).
- **`gestorFilter.test.ts`**: Validar a lógica de filtragem de feedbacks baseada no UUID do `assigned_to`.

## 2. Testes de Integração (Supabase + Hooks)
- **RLS Collaboration**: Testar se um usuário com role `user` (estudante) recebe erro ao tentar ler a tabela `feedback_comments`.
- **TanStack Query Invalidation**: Verificar se ao salvar um novo comentário, a query cache `['feedback', feedback_id]` é invalidada e re-executada.

## 3. Checklist de Regressão (Manual/E2E)
Essencial para garantir que a V1.2 não quebrou.

### 3.1. /admin/feedback
- [ ] O Dashboard de SLA ainda carrega os números corretos (Total de Entradas, Tempo Médio)?
- [ ] O toggle de exibição do Dashboard funciona sem causar re-render infinito?
- [ ] Filtros de Data (7, 30, 90 dias) continuam persistindo na URL?

### 3.2. Student Hub
- [ ] O aluno consegue enviar um novo feedback normalmente?
- [ ] O badge de notificações no modal "Meus Pedidos" atualiza quando o status do feedback muda?
- [ ] **CRÍTICO:** Notas internas dos admins NÃO aparecem no histórico de mensagens do aluno.

## 4. Teste de Stress / Performance
- **Dashboard sob Exportação**: Verificar se o download de um relatório de 500 itens não trava a thread principal do navegador (usar `Web Worker` se necessário).
- **Admin Polling**: Monitorar o uso de recursos no Supabase Dashboard quando 5 admins estiverem com a aba aberta recebendo alertas de SLA.

---
**Data:** 2026-02-13
**Nível de Confiança para Execução:** Alto (Baseado na baseline V1.2)
