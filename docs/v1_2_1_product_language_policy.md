# Política de Vocabulário de Produto (v1.2.1-LEAN)

Esta política estabelece os termos permitidos em cada interface para manter a simplicidade do escopo do aluno.

## 🎓 Interface do Aluno (Student Hub)
**Foco:** Linguagem amigável, acolhedora e não técnica.

| ✅ Permitido (Sim) | ❌ Proibido (Não) |
| :--- | :--- |
| Pedido | Feedback |
| Solicitação | SLA / Prazo |
| Meus Pedidos | Inbox / Tickets |
| Em Desenvolvimento | Triagem / Backlog |
| Nova Solicitação | Reportar erro / Enviar Feedback |
| Concluída | Resolvida / Closed |

## 🛠️ Interface do Admin
**Foco:** Eficiência operacional e métricas.
- Termos técnicos são permitidos: **SLA**, **Breach**, **Analytics**, **Métricas**, **ID**, **Metadata**.

## 🛡️ Regras de Revisão (PR)
1. **Bloqueio Semântico:** Qualquer alteração em `src/components/student-hub` que introduza o termo "feedback" ou "SLA" no texto visível deve ser rejeitada.
2. **Normalização:** Novos status devem ser mapeados via `feedbackService.ts` seguindo os 5 status aprovados.

---
*Em caso de dúvida entre o termo técnico e o amigável, priorize sempre a clareza para o aluno.*
