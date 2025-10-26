# 🔧 Solução Simples - Problema do Hook de Assinatura

## 🚨 **Problema:**
- Erro 404: função `get_subscription_info` não encontrada
- Hook não atualiza quando muda de "Free" para "Anual"

## ✅ **Solução em 3 Passos:**

### **Passo 1: Execute o SQL Corrigido**

No Supabase Dashboard → SQL Editor, execute:

```sql
-- Copie e cole TODO o conteúdo do arquivo:
-- database/28_drop_and_recreate_subscription_functions.sql
```

**Este arquivo:**
- Remove as funções antigas que estavam conflitando
- Recria todas as funções com as assinaturas corretas
- Garante que sejam acessíveis via RPC

### **Passo 2: Teste se Funcionou**

Adicione temporariamente na sua página:

```tsx
import { QuickSubscriptionTest } from '@/components/QuickSubscriptionTest'

// Em qualquer página
<QuickSubscriptionTest />
```

Clique em "Testar Função". Se aparecer um JSON com dados da assinatura, funcionou!

### **Passo 3: Use o Hook Atualizado**

Substitua seu hook atual por:

```tsx
import { useSubscriptionInfo } from '@/hooks/useSubscriptionInfo'

function MeuComponente() {
  const { subscriptionInfo, loading, error, forceRefresh } = useSubscriptionInfo()
  
  // Quando alterar assinatura no modal, force refresh
  const handleSubscriptionChange = async () => {
    // ... sua lógica de alteração
    
    // Force a atualização
    forceRefresh()
  }
  
  if (loading) return <div>Carregando...</div>
  if (error) return <div>Erro: {error}</div>
  
  return (
    <div>
      <p>Plano: {subscriptionInfo?.plan}</p>
      <p>Status: {subscriptionInfo?.status}</p>
      <p>Ativo: {subscriptionInfo?.is_active ? 'Sim' : 'Não'}</p>
    </div>
  )
}
```

## 🎯 **O que foi corrigido:**

1. **Funções SQL**: Removidas e recriadas com assinaturas corretas
2. **Hook**: Escuta mudanças em tempo real na tabela
3. **Modal**: Usa as novas funções RPC e força refresh

## 🚨 **Se ainda não funcionar:**

Execute no Supabase para verificar:

```sql
-- Verificar se a função existe
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'get_subscription_info';

-- Testar a função diretamente
SELECT get_subscription_info();
```

## 🎉 **Resultado esperado:**

- ✅ Função `get_subscription_info` funciona
- ✅ Hook atualiza automaticamente
- ✅ Modal muda de "Free" para "Anual" instantaneamente