# Documentação de Correção Final - Central do Aluno (v1.2.1-LEAN)

**Data:** 14/02/2026
**Responsável:** Antigravity (Tech Lead)
**Status:** [CONCLUÍDO]

---

## 1. Contexto
Durante a fase final de validação da v1.2.1, foram identificados ajustes necessários na Central do Aluno para garantir a estrita separação de domínios (Estudo vs. Feedback) e melhorar a usabilidade imediata (realtime e feedback visual).

## 2. Alterações Realizadas

### 2.1 UI e Nomenclatura
- **Aba renomeada:** "Meus Pedidos" passou a ser **"Feedback"** para clareza semântica.
- **Filtros de Notificação Simplificados:** Removidos filtros técnicos ("Sistema", "Estudo"). Mantidos apenas **"Todas"** e **"Não lidas"**, pois a aba agora é exclusiva para notificações de estudo.

### 2.2 Lógica de Separação de Domínios
- **Sanitização de Notificações:** Implementado filtro no frontend (`filteredNotifications`) que exclui proativamente quaisquer notificações contendo termos como "feedback", "solicitação" ou "pedido".
- **Objetivo:** Garantir que, mesmo se o backend enviar eventos misturados, o aluno veja apenas conteúdo de estudo na aba principal.

### 2.3 Melhorias de UX e Realtime
- **Optimistic UI (Mark as Read):** Implementada ação de leitura ao clicar na notificação (antes exigia abrir detalhes ou clicar em check). O feedback visual é instantâneo (a bolinha azul some).
- **Filtro "Respondido":** Adicionado na aba de Feedback para permitir ao aluno ver rapidamente solicitações com resposta do admin.
- **Polling Automático:** Adicionado `setInterval` de 10 segundos quando o painel está aberto. Isso garante que respostas de admins ou novas notificações apareçam quase em tempo real sem sobrecarregar o banco com sockets.

## 3. Arquivos Impactados
- `src/components/student-hub/StudentHubPanel.tsx`: Lógica principal, filtros e renderização.
- `src/hooks/useNotifications.ts`: (Revisado, sem alterações funcionais profundas, apenas uso de métodos existentes).

## 4. Evidências de Teste (Manual Integration)

| Cenário | Resultado Esperado | Status |
| :--- | :--- | :--- |
| **Abrir Painel** | Aba padrão "Notificações", filtro "Todas". Apenas itens de estudo visíveis. | ✅ PASS |
| **Clicar em Notificação** | Item marcado como lido instantaneamente (bolinha some). Count decrementa. | ✅ PASS |
| **Aba Feedback** | Lista pedidos anteriores. Botão "Nova Solicitação" visível. | ✅ PASS |
| **Filtro "Respondido"** | Mostra apenas pedidos com `admin_reply` não nulo. | ✅ PASS |
| **Recebimento de Dados** | Aguardar 10s: Lista atualiza se houver mudanças no DB (simulado). | ✅ PASS |

## 5. Riscos Residuais
- **Polling vs. Realtime:** O polling de 10s é uma solução "low-tech" segura e robusta, mas tem um delay máximo de 10s. Aceitável para v1.2.1.
- **Filtro de Texto:** A separação por regex (`/feedback|solicitação/`) no frontend é uma defesa de "última milha". O ideal para v1.3 é uma separação rígida na API/DB (coluna `domain`).

---

## 6. Conclusão
As alterações respeitam o escopo "LEAN" (sem migrations, sem novas libs) e resolvem os pontos de atrito de navegação. A Central do Aluno está aprovada para o congelamento final.
