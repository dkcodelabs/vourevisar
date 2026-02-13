# Changelog

## [1.1.0] - 2026-02-13

### Adicionado
- **Central do Aluno (Student Hub):**
    - Painel integrado no header (Sino de notificações).
    - Abas: "Notificações" e "Meus Feedbacks".
    - Criação simplificada de feedback em 2 passos.
    - Status de feedback visível para o aluno.
- **Gestão de Feedbacks (Admin):**
    - Listagem com filtros avançados (Status, Tipo, Data, Busca).
    - Modal de resposta com templates (Canned Responses).
    - Bloqueio de transições de status inválidas (Hardening).
- **Observabilidade:**
    - Auditoria de alterações de feedback.
    - Eventos de analytics para criação e atualização.
- **Segurança:**
    - Rate Limiting (5 feedbacks/hora).
    - Sanitização de contexto técnico.
    - Isolamento de dados via RLS.

### Alterado
- **Layout:** Header e Sidebar ajustados para suportar o novo hub.
- **Package.json:** Versão bump para `1.1.0`.

### Corrigido
- Bugs visuais menores no modo escuro.
- Normalização de status legado ('new' -> 'nova').

---
*Release estável e aprovada para produção.*
