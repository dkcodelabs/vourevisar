
# Plano: Autenticação Profissional com Supabase Auth

## Resumo Executivo

Implementar autenticação profissional usando **Supabase Auth Hooks** + **Resend** para envio de e-mails customizados de confirmação e recuperação de senha, mantendo total controle sobre o design e conteúdo dos e-mails.

## Situação Atual

```text
+---------------------------+--------------------------------------+
| Componente                | Status                               |
+---------------------------+--------------------------------------+
| Login/Logout              | ✅ Funcionando                       |
| Cadastro                  | ✅ Funcionando                       |
| Google OAuth              | ✅ Funcionando                       |
| Recuperação de Senha      | ⚠️ Usando e-mail padrão do Supabase |
| Confirmação de E-mail     | ❌ Desabilitado (enable_confirmations=false) |
| Templates HTML            | ✅ Existem, mas não são usados      |
| Supabase types.ts         | ❌ Arquivo corrompido               |
| RESEND_API_KEY            | ❌ Não configurada                  |
+---------------------------+--------------------------------------+
```

## Arquitetura Proposta

```text
┌─────────────────────────────────────────────────────────────────┐
│                        FLUXO DE CADASTRO                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Usuário]  ──signup──▶ [Supabase Auth]                         │
│                              │                                  │
│                              ▼ (Auth Hook)                      │
│                       [Edge Function]                           │
│                       send-auth-email                           │
│                              │                                  │
│                              ▼                                  │
│                         [Resend API]                            │
│                              │                                  │
│                              ▼                                  │
│                   📧 E-mail Personalizado                       │
│                    (Templates React Email)                      │
│                              │                                  │
│                              ▼                                  │
│                     [Usuário confirma]                          │
│                              │                                  │
│                              ▼                                  │
│                     /auth/callback                              │
│                              │                                  │
│                              ▼                                  │
│                       ✅ Acesso ao App                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Etapas de Implementação

### 1. Corrigir Build Error (Prioridade Crítica)

**Problema**: O arquivo `src/integrations/supabase/types.ts` está corrompido com conteúdo de terminal.

**Ação**: Regenerar o arquivo com os tipos corretos do banco de dados Supabase.

---

### 2. Configurar RESEND_API_KEY como Secret

Você mencionou que já tem a API Key do Resend. Vou solicitar que você a adicione como secret no Supabase para uso nas Edge Functions.

---

### 3. Criar Edge Function `send-auth-email`

**Estrutura de arquivos:**

```text
supabase/functions/
└── send-auth-email/
    ├── index.ts           # Handler principal
    └── _templates/
        ├── confirmation.tsx    # Template de confirmação
        ├── recovery.tsx        # Template de recuperação
        ├── magic-link.tsx      # Template de magic link
        └── email-change.tsx    # Template mudança de e-mail
```

**Funcionalidades:**
- Recebe webhook do Supabase Auth Hook
- Valida assinatura do webhook usando `SEND_EMAIL_HOOK_SECRET`
- Identifica o tipo de e-mail (confirmation, recovery, magic_link, email_change)
- Renderiza o template React Email correspondente
- Envia via Resend API

**Template de exemplo (confirmation.tsx):**
```tsx
import { Body, Container, Head, Heading, Html, Link, Preview, Text, Img } from '@react-email/components'

export const ConfirmationEmail = ({ token_hash, redirect_to, supabase_url }) => (
  <Html>
    <Head />
    <Preview>Confirme seu cadastro no vouRevisar</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://seu-bucket.supabase.co/logo.png" />
        <Heading style={h1}>Bem-vindo ao vouRevisar!</Heading>
        <Text>Clique no botão abaixo para confirmar seu e-mail:</Text>
        <Link href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=signup&redirect_to=${redirect_to}`}>
          Confirmar E-mail
        </Link>
      </Container>
    </Body>
  </Html>
)
```

---

### 4. Configurar Auth Hook no Supabase

Após criar a Edge Function, você precisará configurar o **Auth Hook** no Dashboard do Supabase:

1. Ir para **Authentication > Hooks**
2. Criar hook para **Send Email**
3. Apontar para: `https://ebghgbzvdiytxuxmnvvt.supabase.co/functions/v1/send-auth-email`
4. Adicionar o secret `SEND_EMAIL_HOOK_SECRET` gerado

---

### 5. Habilitar Confirmação de E-mail

**Atualizar `supabase/config.toml`:**
```toml
[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true   # ← Mudar para true
```

---

### 6. Criar Bucket de Storage para Assets de E-mail

Para usar a logo nos templates de e-mail:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO NOTHING;
```

Upload da logo via ferramenta de storage.

---

### 7. Melhorar Tratamento de Erros no Frontend

**Atualizar `src/hooks/useAuthOperations.tsx`:**
- Adicionar mensagens específicas para "Email não confirmado"
- Melhorar feedback para reenvio de e-mail de confirmação
- Adicionar validação com Zod

**Atualizar `src/pages/Login.tsx`:**
- Adicionar opção de reenviar e-mail de confirmação
- Melhorar mensagens de erro para e-mail não confirmado

---

### 8. Criar Página de Confirmação de E-mail

**Nova rota: `/confirm-email`**

Página amigável que:
- Mostra instrução para verificar caixa de entrada
- Permite reenviar e-mail de confirmação
- Redireciona após confirmação bem-sucedida

---

## Secrets Necessários

| Secret | Descrição |
|--------|-----------|
| `RESEND_API_KEY` | Sua API Key do Resend |
| `SEND_EMAIL_HOOK_SECRET` | Secret para validar webhooks do Supabase Auth (será gerado) |

---

## Arquivos a Serem Criados/Modificados

| Arquivo | Ação |
|---------|------|
| `src/integrations/supabase/types.ts` | Regenerar (corrigir build error) |
| `supabase/functions/send-auth-email/index.ts` | Criar |
| `supabase/functions/send-auth-email/_templates/confirmation.tsx` | Criar |
| `supabase/functions/send-auth-email/_templates/recovery.tsx` | Criar |
| `supabase/functions/send-auth-email/_templates/magic-link.tsx` | Criar |
| `supabase/functions/send-auth-email/_templates/email-change.tsx` | Criar |
| `supabase/config.toml` | Atualizar (enable_confirmations=true) |
| `src/pages/ConfirmEmail.tsx` | Criar |
| `src/hooks/useAuthOperations.tsx` | Atualizar |
| `src/pages/Login.tsx` | Atualizar |
| `src/App.tsx` | Adicionar rota /confirm-email |

---

## Configuração Manual Necessária (Após implementação)

1. **No Dashboard do Supabase:**
   - Ir para **Authentication > Hooks**
   - Adicionar hook "Send Email" apontando para a Edge Function
   - Copiar o `SEND_EMAIL_HOOK_SECRET` gerado

2. **Adicionar o Secret:**
   - Ir para **Settings > Edge Functions**
   - Adicionar `SEND_EMAIL_HOOK_SECRET` com o valor gerado

3. **Verificar domínio no Resend:**
   - Confirmar que o domínio está verificado em https://resend.com/domains
   - O remetente deve ser algo como `noreply@seudominio.com`

---

## Estimativa de Implementação

| Etapa | Complexidade |
|-------|--------------|
| Corrigir types.ts | Baixa |
| Criar Edge Function send-auth-email | Média |
| Criar templates React Email | Média |
| Configurar storage para logo | Baixa |
| Atualizar frontend | Baixa |
| Configuração manual no Dashboard | Baixa |

---

## Próximos Passos

Ao aprovar este plano, irei:

1. Primeiro solicitar que você adicione a **RESEND_API_KEY** como secret
2. Corrigir o arquivo `types.ts` corrompido
3. Criar a Edge Function `send-auth-email` com todos os templates
4. Criar bucket de storage e fazer upload da logo
5. Atualizar o frontend com melhorias de UX
6. Fornecer instruções detalhadas para configuração do Auth Hook
