# 🚀 Instalação Completa - Sistema de Roles

## ✅ **Arquivos Criados para Você:**

```
📂 src/
├── 📂 hooks/
│   └── useUserRole.ts          ← Hook principal
├── 📂 components/
│   ├── ProtectedComponent.tsx  ← Componentes de proteção
│   ├── RoleBasedUI.tsx        ← Componentes de UI
│   └── TestePage.tsx          ← Página para testar
└── 📂 lib/
    └── supabase.ts            ← Cliente Supabase

📄 .env.local.example          ← Exemplo de configuração
📄 INSTALACAO.md              ← Este guia
```

---

## 🔧 **Passo 1: Instalar Dependências**

```bash
npm install @supabase/supabase-js
```

---

## 🔧 **Passo 2: Configurar Variáveis de Ambiente**

1. **Copie** o arquivo `.env.local.example` para `.env.local`
2. **Preencha** com suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

**Onde encontrar:**
- Supabase Dashboard → Settings → API

---

## 🔧 **Passo 3: Testar se Funciona**

### **Opção A: Página de Teste Completa**
```tsx
// pages/teste.tsx ou app/teste/page.tsx
import TestePage from '@/components/TestePage'

export default function Teste() {
  return <TestePage />
}
```

### **Opção B: Teste Rápido**
```tsx
// Em qualquer página sua
import { useUserRole } from '@/hooks/useUserRole'
import { OwnerOnly } from '@/components/ProtectedComponent'

function MinhaPage() {
  const { user, isOwner, loading } = useUserRole()

  if (loading) return <div>Carregando...</div>

  return (
    <div>
      <p>Usuário: {user?.email || 'Não logado'}</p>
      
      <OwnerOnly>
        <div style={{ background: 'purple', color: 'white', padding: '10px' }}>
          🎉 Você é owner! Sistema funcionando!
        </div>
      </OwnerOnly>
    </div>
  )
}
```

---

## 🔧 **Passo 4: Usar na Sua Página Existente**

### **Integração Mínima:**
```tsx
// Na sua página dashboard atual, adicione apenas:

import { useUserRole } from '@/hooks/useUserRole'
import { OwnerOnly, AdminOnly } from '@/components/ProtectedComponent'

function SeuDashboard() {
  const { isAdmin, isOwner, loading } = useUserRole()

  // Seu código atual permanece igual...

  return (
    <div>
      {/* Todo seu conteúdo atual */}
      
      {/* Adicione proteções onde necessário */}
      {isAdmin && (
        <div>Seção só para admins</div>
      )}
      
      <OwnerOnly>
        <div>Seção só para owners</div>
      </OwnerOnly>
    </div>
  )
}
```

---

## 📋 **Checklist de Verificação:**

- [ ] ✅ Dependências instaladas (`@supabase/supabase-js`)
- [ ] ✅ Arquivo `.env.local` configurado
- [ ] ✅ Arquivos copiados para `src/`
- [ ] ✅ Teste executado (página `/teste`)
- [ ] ✅ Sistema funcionando (vê conteúdo baseado em role)

---

## 🎯 **Componentes Disponíveis:**

### **Proteção:**
- `<OwnerOnly>` - Apenas proprietários
- `<AdminOnly>` - Admins ou superior  
- `<AuthenticatedOnly>` - Usuários logados
- `<RequireRole role="admin">` - Role específica

### **UI:**
- `<UserRoleBadge />` - Badge com role do usuário
- `<ProtectedButton requiredRole="admin">` - Botão que se desabilita
- `<UserInfo />` - Informações do usuário

### **Hook:**
- `useUserRole()` - Verificações de permissão

---

## 🚨 **Problemas Comuns:**

### **1. "Hook não funciona"**
- ✅ Verifique se o import está correto: `import { useUserRole } from '@/hooks/useUserRole'`
- ✅ Confirme que o arquivo está em `src/hooks/useUserRole.ts`

### **2. "Supabase não conecta"**
- ✅ Verifique as variáveis de ambiente no `.env.local`
- ✅ Confirme que executou todos os arquivos SQL do backend

### **3. "Permissões não funcionam"**
- ✅ Teste no Supabase: `SELECT public.is_owner(auth.uid())`
- ✅ Verifique se está logado com o usuário correto

---

## 🎉 **Pronto!**

Agora você tem um sistema completo de roles funcionando!

**Próximo passo:** Use os componentes nas suas páginas existentes conforme necessário.

**Dúvidas?** Teste primeiro com a página `TestePage.tsx` para verificar se tudo está funcionando.