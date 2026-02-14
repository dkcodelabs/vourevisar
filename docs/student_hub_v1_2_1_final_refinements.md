# Refinamento Final da Central do Aluno v1.2.1-LEAN

## Resumo das Correções
Em conformidade com os requisitos de otimização de UX e comportamento Realtime, as seguintes melhorias foram implementadas.

### 1. Polling Silencioso (Silent Refetch)
**Problema:** O polling a cada 10 segundos causava flicker na UI (loading states) e resetava scrolls/interações.
**Solução:**
- Atualizados hooks `useNotifications` e `useUserFeedbacks` para suportar a opção `{ silent: true }`.
- Quando `silent` é true, o estado `isLoading` não é alterado, permitindo atualização de dados em background sem afetar a UI.
- O `StudentHubPanel` agora utiliza `silent: true` no polling de 10s.

### 2. Indicador de "Não Lido" (Blue Dot) em Feedbacks
**Problema:** O badge global (sino) exibia um número (ex: 7) que incluía notificações de feedback, mas ao abrir a aba "Feedback", não havia indicação visual de quais itens eram novos.
**Solução:**
- Implementada correlação lógica no front-end: `getUnreadNotificationIdForFeedback(feedback)`.
- O sistema varre as notificações carregadas buscando correspondência por Protocolo (`#REQ-123`) no título ou mensagem.
- Se encontrar uma notificação não lida vinculada, exibe o "Blue Dot" no card do feedback.
- Ao expandir o feedback clicando no card, a notificação correspondente é marcada como lida automaticamente (`markAsRead`), removendo o Blue Dot e decrementando o badge global.

### 3. Correção do Modal de Nova Solicitação
**Problema:** O modal não fechava corretamente após o envio ou apresentava comportamento inconsistente.
**Solução:**
- Refatorada a lógica de `handleFeedbackSubmit` no `StudentHubPanel`.
- Agora fecha o modal (`setShowFeedbackModal(false)`) apenas após sucesso confirmado (`result.protocol_code`).
- Dispara refresh silencioso das listas para garantir que o novo item apareça imediatamente.

### 4. Correção de Lint e Tipagem
**Problema:** Erro de tipagem no `onClick` devido à mudança na assinatura de `refetch`.
**Solução:**
- Ajustada a chamada para encapsular em arrow function: `onClick={() => refetchNotifs()}`.

## Status Final
- **Badge Global:** Sincronizado.
- **Lista de Feedback:** Exibe indicadores de novidade.
- **Interação:** Fluida, sem flickers.
- **Escopo:** Mantido (v1.2.1-LEAN), sem alterações de arquitetura ou banco de dados.
