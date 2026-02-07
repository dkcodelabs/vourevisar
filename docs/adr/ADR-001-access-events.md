# ADR-001: Implementação de Eventos de Acesso com Tabela Imutável

## Status

Aprovado

## Data

2026-02-07

## Contexto

A aplicação precisa rastrear com precisão a atividade dos usuários ("Último Acesso") para fins de auditoria, engajamento e segurança.

O campo padrão `last_sign_in_at` do Supabase (`auth.users`) mostrou-se insuficiente e não confiavel, pois:
1.  Não é atualizado em tempo real.
2.  Depende de logins explícitos, ignorando sessões longas e reaberturas de aba (`SESSION_START`).
3.  Pode ser sobrescrito ou perdido em migrações de auth provider.

Precisávamos de uma solução que garantisse:
-   Precisão no rastreamento de atividade real.
-   Persistência histórica (audit trail).
-   Performance em escala (evitar writes desnecessários).

## Decisão

Optamos por implementar uma arquitetura híbrida de eventos (`User Events`):

1.  **Fonte da Verdade:** Criamos a tabela `public.user_events` para armazenar logs imutáveis de `LOGIN`, `SESSION_START` e `LOGOUT`.
2.  **Desnormalização para Leitura:** Adicionamos `last_access_at` na tabela `public.profiles`, atualizado via trigger no banco sempre que um novo evento relevante é inserido.
3.  **Anti-Spam no Cliente:** Implementamos um controle de *throttling* de 30 minutos no frontend (`localStorage`) para o evento `SESSION_START`.

## Consequências

### Positivas

-   **Auditoria Completa:** Temos histórico de quando e como cada usuário acessou.
-   **Performance de Leitura:** O painel admin lê apenas `profiles.last_access_at` (rápido), sem precisar fazer agregações pesadas na tabela de logs.
-   **Robustez:** O uso de triggers garante consistência eventual forte. Se o evento entrou, o perfil atualiza.
-   **Independência de Auth:** Não dependemos mais de detalhes de implementação do GoTrue/Supabase Auth.

### Negativas

-   **Aumento de Armazenamento:** A tabela `user_events` crescerá indefinidamente. Será necessário implementar política de retenção (ex: arquivar logs > 1 ano) no futuro.
-   **Complexidade no Frontend:** Foi necessário adicionar lógica de estado (`useUserLogger`) para gerenciar o throttling de eventos.

## Trade-offs

-   **Precisão vs. Volume de Dados:** Aceitamos armazenar mais dados (tabela de eventos) em troca de precisão absoluta na métrica de acesso.
-   **Client-side Throttling vs. Server-side:** Optamos por filtrar eventos repetidos no cliente (`localStorage`) para economizar requisições de rede e processamento no banco, assumindo o risco de que limpezas de cache locais possam gerar "duplicatas legítimas" espaçadas.

## Alternativas Rejeitadas

1.  **Apenas atualizar `profiles` direto do Frontend:** Rejeitado por segurança (RLS complexa) e falta de histórico (perderíamos a trilha de auditoria).
2.  **Usar `auth.users`:** Rejeitado pois é um esquema interno do Supabase e não deve ser modificado, além da não confiabilidade citada no contexto.
3.  **Analytics de Terceiros (GA/Mixpanel):** Rejeitado pois precisávamos desses dados *dentro* do banco de produção para uso em regras de negócio (ex: bloquear inativos) e exibição no admin.
