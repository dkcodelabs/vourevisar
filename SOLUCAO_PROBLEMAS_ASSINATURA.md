# 🔧 Solução para Problemas de Assinatura

## 🚨 **Problemas Identificados:**

### 1. **Erro 404: Função `get_subscription_info` não encontrada**
### 2. **Hook não atualiza quando muda de "Free" para "Anual"**

---

## ✅ **Solução Completa:**

### **Passo 1: Executar Funções SQL Atualizadas**

Execute estes arquivos SQL no Supabase Dashboard (SQL Editor):

```sql
-- 1. Primeiro execute: database/27_fix_subscription_rpc_functions.sql
-- Este arquivo contém as funções RPC corrigidas
```

**OU** use o script automatizado:
```bash
node scripts/install-subscription-functions.js
```

### **Passo 2: Verificar se as Funções Foram Criadas**

No Supabase Dashboard → SQL Editor, execute:

```sql
-- Testar se a função existe
SELECT get_subscription_info();

-- Listar todas as funções de assinatura
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name LIKE '%subscription%';
```

### **Passo 3: Usar o Hook Atualizado**

Substitua o hook atual pelo novo:

```tsx
// Use o novo hook em vez do antigo
import { useSubscriptionInfo } from '@/hooks/useSubscriptionInfo'

function MeuComponente() {
  const { subscriptionInfo, loading, error, forceRefresh } = useSubscriptionInfo()
  
  // Quando alterar assinatura, force refresh
  const handleSubscriptionChange = async () => {
    // ... sua lógica de alteração
    
    // Depois force a atualização
    forceRefresh()
  }
}
```

### **Passo 4: Testar com o Componente de Teste**

Adicione temporariamente na sua página:

```tsx
import { SubscriptionTester } from '@/components/SubscriptionTester'

// Em qualquer página para testar
<SubscriptionTester />
```

---

## 🔧 **Funções RPC Disponíveis Agora:**

### **Para Obter Informações:**
```javascript
// Obter info da assinatura do usuário atual
const { data } = await supabase.rpc('get_subscription_info')

// Obter info de outro usuário (apenas admins)
const { data } = await supabase.rpc('get_subscription_info', { 
  check_user_id: 'uuid-do-usuario' 
})
```

### **Para Alterar Assinaturas (apenas admins):**
```javascript
// Ativar assinatura mensal
await supabase.rpc('activate_paid_subscription', {
  target_user_id: 'uuid-do-usuario',
  plan_type: 'monthly'
})

// Ativar assinatura anual
await supabase.rpc('activate_paid_subscription', {
  target_user_id: 'uuid-do-usuario',
  plan_type: 'annual'
})

// Ativar trial
await supabase.rpc('activate_trial_subscription', {
  target_user_id: 'uuid-do-usuario',
  trial_days: 7
})

// Desativar assinatura
await supabase.rpc('deactivate_subscription', {
  target_user_id: 'uuid-do-usuario'
})
```

---

## 🎯 **Correções Implementadas:**

### **1. Funções RPC Corrigidas:**
- ✅ `get_subscription_info()` - Agora acessível via RPC
- ✅ `activate_paid_subscription()` - Para ativar planos pagos
- ✅ `activate_trial_subscription()` - Para ativar trials
- ✅ `deactivate_subscription()` - Para desativar

### **2. Hook Melhorado:**
- ✅ Escuta mudanças em tempo real na tabela `user_subscriptions`
- ✅ Função `forceRefresh()` para atualização manual
- ✅ Melhor tratamento de erros
- ✅ Logs detalhados para debug

### **3. Modal Atualizado:**
- ✅ Usa as novas funções RPC
- ✅ Botão "Forçar Atualização" para casos extremos
- ✅ Melhor feedback visual durante processamento

---

## 🚨 **Se Ainda Não Funcionar:**

### **Verificação 1: Permissões**
```sql
-- Verificar se as funções têm as permissões corretas
SELECT routine_name, routine_type, security_type
FROM information_schema.routines 
WHERE routine_name LIKE '%subscription%';
```

### **Verificação 2: Tabelas**
```sql
-- Verificar se a tabela existe
SELECT * FROM user_subscriptions LIMIT 1;
```

### **Verificação 3: RLS**
```sql
-- Verificar políticas RLS
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_subscriptions';
```

---

## 🎉 **Teste Final:**

1. **Execute** o SQL atualizado
2. **Teste** com `SubscriptionTester`
3. **Altere** uma assinatura no modal
4. **Verifique** se atualiza automaticamente

---

## 📞 **Debug Adicional:**

Se ainda houver problemas, adicione logs:

```javascript
// No console do navegador
console.log('Testing subscription function...')

supabase.rpc('get_subscription_info').then(result => {
  console.log('Function result:', result)
}).catch(error => {
  console.error('Function error:', error)
})
```

---

**Resultado esperado:** Hook atualiza automaticamente quando você muda de "Free" para "Anual" e não há mais erro 404.