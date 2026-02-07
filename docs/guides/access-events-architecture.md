# Arquitetura de Eventos de Acesso (User Events)

Este documento descreve a arquitetura técnica implementada para o rastreamento, armazenamento e análise de eventos de usuário (acessos, logins, sessões) no sistema.

## 1. Visão Geral

O módulo de eventos tem como objetivo fornecer uma **fonte única de verdade** sobre a atividade dos usuários, substituindo campos legados não confiáveis (como `last_sign_in_at` do `auth.users`) por um histórico auditável e consistente.

### Principais Componentes

1.  **Tabela de Log Imutável (`public.user_events`):** Armazena o histórico bruto de eventos.
2.  **Trigger de Sincronização:** Atualiza o campo `last_access_at` no perfil do usuário sempre que um evento relevante ocorre.
3.  **RPC Segura (`log_user_event`):** Função de banco de dados para inserção controlada de eventos via frontend.
4.  **Instrumentação Frontend (`useUserLogger`):** Hook React que gerencia o disparo de eventos com proteção anti-spam.

---

## 2. Banco de Dados

### 2.1. Tabela `public.user_events`

Tabela particionada (preparada para alto volume) responsável por armazenar cada ocorrência de evento.

| Coluna        | Tipo                     | Descrição                                                                 |
| :------------ | :----------------------- | :------------------------------------------------------------------------ |
| `id`          | `uuid`                   | Identificador único do evento.                                            |
| `user_id`     | `uuid`                   | Referência ao usuário (`auth.users`).                                     |
| `event_type`  | `text`                   | Tipo do evento: `LOGIN`, `SESSION_START`, `LOGOUT`.                       |
| `occurred_at` | `timestamptz`            | Data/hora exata do evento.                                                |
| `metadata`    | `jsonb`                  | Dados contextuais extras (ex: método de login, device info - opcional).   |

**Índices:**
- `idx_user_events_user_occurred`: Otimiza buscas por histórico de um usuário (`user_id`, `occurred_at DESC`).
- `idx_user_events_type_occurred`: Otimiza contagens e análises por tipo de evento (`event_type`, `occurred_at DESC`).

**Segurança (RLS):**
- **INSERT:** Permitido apenas via RPC `log_user_event` (security definer) ou triggers internos. O usuário não insere diretamente na tabela.
- **SELECT:** Usuários podem ver apenas seus próprios eventos. Admins (role `service_role` ou policy específica) podem ver tudo.

### 2.2. Campo `profiles.last_access_at`

Coluna adicionada à tabela `public.profiles` para desnormalizar o "último acesso" e permitir consultas rápidas (ex: listagem de usuários no admin) sem varrer a tabela de logs.

- **Tipo:** `timestamp with time zone`
- **Atualização:** Automática via trigger `on_user_event_insert`.

### 2.3. Trigger `sync_last_access`

Sempre que um novo registro é inserido em `user_events` com tipo `LOGIN` ou `SESSION_START`, esta função atualiza o `last_access_at` do usuário correspondente em `public.profiles`.

> **Lógica:** `last_access_at` = `MAX(occurred_at)` dos eventos de acesso.

---

## 3. Frontend & Instrumentação

A lógica de cliente está centralizada no hook `src/hooks/useUserLogger.ts`.

### 3.1. Tipos de Eventos

| Evento          | Gatilho                                      | Significado                                                                 |
| :-------------- | :------------------------------------------- | :-------------------------------------------------------------------------- |
| `LOGIN`         | Sucesso no `auth.signIn` ou Google Auth.     | Usuário realizou autenticação explícita.                                   |
| `SESSION_START` | Carregamento do `AppLayout` (área logada).   | Usuário abriu o app (nova aba, refresh ou retorno após tempo inativo).      |
| `LOGOUT`        | Clique no botão de sair.                     | Usuário encerrou explicita a sessão.                                       |

### 3.2. Mecanismo Anti-Spam (Throttling)

Para evitar que *refreshs* de página ou navegação entre abas gerem ruído (múltiplos `SESSION_START` em segundos), implementamos um controle no cliente:

- **Armazenamento:** `localStorage` (Persiste mesmo se fechar o navegador).
- **Chave:** `last_session_log_${userId}` (Isolado por usuário para suportar múltiplos logins no mesmo PC).
- **Janela:** 30 minutos.
- **Regra:** Se `Agora - ÚltimoLog < 30 min`, o evento `SESSION_START` é ignorado e não é enviado ao banco.

### 3.3. Interface (UI)

- **Admin / User Management:**
    - A coluna "Último Acesso" agora lê de `profiles.last_access_at`.
    - Exibição relativa amigável (ex: "Há 5 min", "Ontem").
    - Tooltip com data/hora completa.
    - Coluna "Data de Adição" padronizada para formato curto (`dd/mm/aaaa`).

---

## 4. Fluxo de Dados Completo

1.  **Usuário acessa o app.**
2.  `AppLayout` monta e chama `useUserLogger().logSessionStart()`.
3.  **Frontend verifica `localStorage`:**
    - Se registrou acesso há < 30 min: **Para**.
    - Se > 30 min ou nunca registrou: **Prossegue**.
4.  **Frontend chama RPC `log_user_event('SESSION_START')`.**
5.  **Supabase (Postgres):**
    - RPC insere linha em `public.user_events`.
    - Trigger `on_user_event_insert` dispara.
    - Função `sync_last_access` atualiza `public.profiles`.
6.  **Painel Admin:** Ao listar usuários, busca `profiles.last_access_at` atualizado instantaneamente.
