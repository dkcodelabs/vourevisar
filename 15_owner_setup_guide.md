# 👑 Guia Completo: Como Definir o Primeiro Owner

## 🎯 **Objetivo**
Estabelecer o proprietário inicial do sistema de forma segura, garantindo que apenas você tenha acesso administrativo total.

## ⚠️ **IMPORTANTE: Execute APENAS UMA VEZ**
- O primeiro owner é crítico para a segurança
- Apenas owners podem criar outros owners
- Sem owner, o sistema fica "órfão"

---

## 🔧 **Método 1: SQL Direto (Recomendado)**

### **Passo 1: Faça Login no Sistema**
1. Acesse seu aplicativo
2. Faça login com sua conta
3. Confirme que está autenticado

### **Passo 2: Execute no Supabase SQL Editor**
```sql
-- Encontre seu user_id
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'seu.email@exemplo.com';  -- ⚠️ SUBSTITUA

-- Copie o UUID retornado e execute:
INSERT INTO public.user_roles (user_id, role, assigned_by)
VALUES ('SEU-UUID-AQUI', 'owner', 'SEU-UUID-AQUI');
```

### **Passo 3: Verificar**
```sql
SELECT public.is_owner(auth.uid());  -- Deve retornar true
```

---

## 🤖 **Método 2: Migration Automática**

Execute o arquivo `14_setup_first_owner.sql` - Método 2:

```sql
-- Substitua o email no arquivo e execute
DO $$ ... END $$;
```

**Vantagens:**
- ✅ Automático
- ✅ Seguro
- ✅ Verifica se já existe owner

---

## 🌐 **Método 3: Edge Function (Produção)**

### **Setup da Function:**
1. Deploy da Edge Function:
```bash
supabase functions deploy setup-owner
```

2. Configure variáveis de ambiente:
```bash
SETUP_SECRET_KEY=sua-chave-secreta-aqui
```

### **Chamada da Function:**
```javascript
const response = await fetch('https://your-project.supabase.co/functions/v1/setup-owner', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
  },
  body: JSON.stringify({
    email: 'seu.email@exemplo.com',
    secret_key: 'sua-chave-secreta'
  })
})
```

---

## 📜 **Método 4: Script Node.js**

1. Configure o arquivo `scripts/setup-owner.js`
2. Adicione suas credenciais
3. Execute:
```bash
node scripts/setup-owner.js
```

---

## ✅ **Verificação Final**

Após qualquer método, execute estes testes:

```sql
-- 1. Verificar se você é owner
SELECT public.is_owner(auth.uid());

-- 2. Listar todos os owners
SELECT 
  ur.user_id,
  au.email,
  ur.assigned_at
FROM public.user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE ur.role = 'owner';

-- 3. Testar funções administrativas
SELECT * FROM public.list_users_with_roles();
```

---

## 🛡️ **Segurança**

### **✅ Boas Práticas:**
- Use seu email pessoal/principal
- Mantenha as credenciais seguras
- Execute apenas uma vez
- Documente quem é o owner

### **❌ Nunca Faça:**
- Compartilhar credenciais de owner
- Criar múltiplos owners desnecessários
- Usar emails temporários
- Executar em produção sem backup

---

## 🚨 **Recuperação de Emergência**

Se perder acesso de owner:

1. **Via Supabase Dashboard (Service Role):**
```sql
-- Execute com service_role key
INSERT INTO public.user_roles (user_id, role, assigned_by)
SELECT id, 'owner', id 
FROM auth.users 
WHERE email = 'seu.email@exemplo.com';
```

2. **Via Support:**
- Contate o suporte do Supabase
- Prove propriedade do projeto
- Solicite reset de permissões

---

## 📋 **Checklist Final**

- [ ] ✅ Conta criada e verificada
- [ ] ✅ Login funcionando
- [ ] ✅ Owner role atribuída
- [ ] ✅ Funções administrativas testadas
- [ ] ✅ Backup das credenciais feito
- [ ] ✅ Documentação atualizada

**🎉 Parabéns! Seu sistema está seguro e você é o proprietário oficial!**