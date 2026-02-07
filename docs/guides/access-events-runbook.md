# Runbook: Eventos de Acesso

Este guia operacional descreve os procedimentos para validação, monitoramento e solução de problemas relacionados ao módulo de Eventos de Acesso (`user_events`).

## 1. Checklist Pré-Deploy

Antes de promover alterações que afetem este módulo para produção:

- [ ]  Verificar se a tabela `user_events` existe e tem RLS ativado.
- [ ]  Confirmar que a coluna `profiles.last_access_at` existe.
- [ ]  Garantir que os índices de performance (`user_id`, `event_type`, `occurred_at`) estão criados.
- [ ]  Testar se o anti-spam de `SESSION_START` está respeitando a janela de 30min no `localStorage`.

SQL de Validação Rápida:

```sql
SELECT relname, relrowsecurity FROM pg_class WHERE relname='user_events';
-- Deve retornar: user_events | t
```

## 2. Monitoramento Pós-Deploy (24h)

Nas primeiras 24 horas após o deploy, monitore os seguintes indicadores via SQL no Supabase Dashboard:

### 2.1. Volume de Eventos por Tipo

Verifique se a proporção faz sentido. Espera-se muito mais `SESSION_START` do que `LOGIN` (pois o login persiste).

```sql
SELECT event_type, COUNT(*) as qtd
FROM public.user_events
WHERE occurred_at > NOW() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY 2 DESC;
```

### 2.2. Coerência de Dados

Verifique se o trigger está atualizando o perfil corretamente. A query abaixo busca discrepâncias maiores que 5 segundos entre o evento e o perfil.

```sql
WITH max_evt AS (
  SELECT user_id, MAX(occurred_at) as max_at
  FROM public.user_events
  WHERE event_type IN ('LOGIN', 'SESSION_START')
  GROUP BY user_id
)
SELECT p.id, p.last_access_at, m.max_at
FROM public.profiles p
JOIN max_evt m ON m.user_id = p.id
WHERE ABS(EXTRACT(EPOCH FROM (p.last_access_at - m.max_at))) > 5;
-- Idealmente deve retornar 0 linhas.
```

## 3. Troubleshooting

### Cenário A: "Último acesso" no Admin não atualiza

**Sintoma:** Usuário relata que está usando o sistema, mas na lista de usuários aparece como "Visto há 5 dias".

**Investigação:**

1.  O usuário está logado? Peça para ele dar um refresh (F5).
2.  Verifique o `localStorage` do usuário (DevTools > Application > Local Storage).
    - Procure a chave `last_session_log_<USER_ID>`.
    - Apague a chave e peça novo refresh. Se atualizar, era o anti-spam funcionando corretamente (dentro da janela de 30min).
3.  Verifique se o evento chegou no banco:
    ```sql
    SELECT * FROM public.user_events WHERE user_id = '<ID_DO_USUARIO>' ORDER BY occurred_at DESC LIMIT 5;
    ```
4.  Se o evento existe mas o perfil não atualizou, o trigger pode estar quebrado ou desabilitado.

### Cenário B: Explosão de Eventos (Spam)

**Sintoma:** Um único usuário gerando milhares de eventos `SESSION_START` em poucos minutos.

**Causa Provável:**
- Falha no acesso ao `localStorage` (ex: navegador em modo privado restrito ou bloqueadores).
- Loop de redirecionamento no frontend.

**Ação Imediata:**
Bloquear temporariamente o usuário ou aumentar o throttling no RPC (via banco) se necessário.

**Correção:**
Verificar permissões de armazenamento no navegador do usuário e logs de erro do console JS.
