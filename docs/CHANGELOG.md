# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [v1.0-events-audit-pass] - 2026-02-07

### Adicionado

-   **Módulo de Eventos de Acesso (`user_events`):**
    -   Tabela particionada `public.user_events` com RLS e índices otimizados.
    -   Field `profiles.last_access_at` (timestamptz) sincronizado via trigger.
    -   Função RPC `log_user_event` para inserção segura de eventos.
    -   Instrumentação completa no frontend: `LOGIN`, `SESSION_START`, `LOGOUT`.
    -   Mecanismo anti-spam robusto no cliente (`localStorage`, janela de 30min).
-   **Painel Admin:**
    -   Coluna "Último Acesso" agora exibe dado real relativo (`last_access_at`).
    -   Padronização de datas (formato curto + tooltip completo).
-   **Documentação Técnica:**
    -   `docs/guides/access-events-architecture.md`: Arquitetura detalhada.
    -   `docs/guides/access-events-runbook.md`: Guia de operação e troubleshooting.
    -   `docs/adr/ADR-001-access-events.md`: Registro de Decisão Arquitetural.

### Alterado

-   Migração do controle de sessão de `sessionStorage` para `localStorage` para maior persistência e robustez.
