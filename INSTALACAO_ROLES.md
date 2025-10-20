# 🔐 Instalação do Sistema de Roles

## ⚠️ IMPORTANTE: Execute os Scripts SQL Primeiro!

Antes de usar o sistema de roles, você precisa executar os scripts SQL no seu banco Supabase para criar as tabelas e funções necessárias.

## 📋 Passo a Passo

### 1. Acesse o Supabase Dashboard
- Vá para [supabase.com](https://supabase.com)
- Acesse seu projeto
- Vá para **SQL Editor**

### 2. Execute os Scripts na Ordem Correta

Execute os seguintes arquivos SQL **na ordem exata**:

```sql
-- 1. Criar ENUM de roles
-- Copie e execute: database/01_create_enum_roles.sql

-- 2. Criar tabela user_roles
-- Copie e execute: database/02_create_user_roles_table.sql

-- 3. Configurar RLS policies
-- Copie e execute: database/03_setup_rls_policies.sql

-- 4. Funções básicas de segurança
-- Copie e execute: database/04_basic_security_functions.sql

-- 5. Inserir owner inicial (SUBSTITUA O EMAIL!)
-- Copie e execute: database/05_insert_initial_owner.sql
-- ⚠️ IMPORTANTE: Altere o email para o seu email!

-- 6. Funções SECURITY DEFINER
-- Copie e execute: database/06_security_definer_functions.sql

-- 7. Funções administrativas avançadas
-- Copie e execute: database/07_advanced_admin_functions.sql

-- 8. Atualizar RLS policies
-- Copie e execute: database/08_update_rls_policies.sql
```

### 3. Configurar Owner Inicial

**MUITO IMPORTANTE**: No arquivo `database/05_insert_initial_owner.sql`, substitua o email pelo seu:

```sql
-- ALTERE ESTE EMAIL PARA O SEU!
INSERT INTO user_roles (user_id, role, assigned_by, assigned_at)
SELECT 
  id, 
  'owner'::app_role, 
  id, 
  NOW()
FROM profiles 
WHERE email = 'SEU_EMAIL_AQUI@exemplo.com';  -- ⚠️ ALTERE AQUI!
```

### 4. Testar o Sistema

Após executar todos os scripts:

1. **Faça logout e login novamente** no seu app
2. Acesse a página **Gerenciamento** no menu
3. Você deve ver todas as seções disponíveis como Owner

## 🔧 Funcionalidades Implementadas

### ✅ Backend (Supabase)
- ✅ ENUM `app_role` (owner, admin, moderator, user)
- ✅ Tabela `user_roles` com RLS
- ✅ Funções SECURITY DEFINER para verificação segura
- ✅ Policies restritivas para proteção de dados
- ✅ Sistema de auditoria e logs

### ✅ Frontend (React)
- ✅ Hook `useUserRole()` para verificar permissões
- ✅ Componentes `OwnerOnly`, `AdminOnly`, `ModeratorOnly`
- ✅ Navegação condicional no TopHeader
- ✅ Página de Gerenciamento completa
- ✅ Proteção de rotas por role

## 🎯 Como Usar

### Hook useUserRole
```tsx
import { useUserRole } from '@/hooks/useUserRole'

function MeuComponente() {
  const { isOwner, isAdmin, isModerator, hasRole } = useUserRole()
  
  if (isOwner) {
    return <div>Você é o proprietário!</div>
  }
  
  if (hasRole('admin')) {
    return <div>Você é admin!</div>
  }
  
  return <div>Usuário comum</div>
}
```

### Componentes Protegidos
```tsx
import { OwnerOnly, AdminOnly } from '@/components/ProtectedComponent'

function MinhaInterface() {
  return (
    <div>
      <AdminOnly>
        <button>Função só para admins</button>
      </AdminOnly>
      
      <OwnerOnly>
        <button>Função só para owners</button>
      </OwnerOnly>
    </div>
  )
}
```

## 🚨 Troubleshooting

### Erro: "user_roles table does not exist"
- Execute os scripts SQL na ordem correta
- Verifique se todos os scripts foram executados sem erro

### Erro: "Permission denied"
- Verifique se você executou o script de owner inicial
- Confirme se o email no script está correto
- Faça logout/login após executar os scripts

### Link "Gerenciamento" não aparece
- Verifique se você tem role de admin ou owner
- Faça logout/login para atualizar as permissões
- Verifique no console do navegador se há erros

## 📞 Suporte

Se tiver problemas:
1. Verifique o console do navegador para erros
2. Confirme se todos os scripts SQL foram executados
3. Teste as funções SQL diretamente no Supabase Dashboard
4. Verifique se o email do owner inicial está correto

---

**🎉 Após seguir estes passos, seu sistema de roles estará funcionando perfeitamente!**