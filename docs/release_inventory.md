# Release Inventory - Central do Aluno v1.0

Inventário técnico dos ativos implementados/alterados nesta release.

## 1. Componentes (Frontend)

### Central do Aluno (Student Hub)
- `src/components/student-hub/StudentHubPanel.tsx` (Drawer principal, Tabs, Listas)
- `src/components/student-hub/FeedbackModal.tsx` (Formulário, Validação, A11y)
- `src/components/AppLayout.tsx` (Integração do sino e wrapper de Feature Flag)

### Admin
- `src/pages/admin/AdminFeedback.tsx` (Gestão de feedbacks, respostas)

## 2. Serviços e Hooks (Lógica)

### Dados
- `src/hooks/useUserFeedbacks.ts` (CRUD de feedbacks do aluno)
- `src/hooks/useNotifications.ts` (Listagem e contagem de notificações)
- `src/services/feedbackService.ts` (Camada de serviço para RPCs/Tables)

### Infraestrutura
- `src/lib/features.ts` (Sistema de Feature Flags)
- `src/lib/analytics.ts` (Sistema de Telemetria leve)
- `src/lib/errors/errorService.ts` (Integração de erros)

## 3. Banco de Dados (Supabase)

### Tabelas Envolvidas
- `user_feedback`
- `user_notifications` (leitura apenas)

### RPCs Utilizadas
- `get_user_feedbacks`
- `submit_feedback` (ou inserção direta via RLS)
- `update_feedback_status` (Admin)

## 4. Feature Flags

| Flag | Padrão (Dev) | Padrão (Prod) | Descrição |
|------|--------------|---------------|-----------|
| `STUDENT_HUB` | `true` | `false` | Ativa toda a stack da Central do Aluno (Sino, Drawer, Modal) |

## 5. Rotas

| Caminho | Acesso | Descrição |
|---------|--------|-----------|
| `/admin/feedback` | Admin | Painel de gestão de feedbacks |
| (Componente Global) | Aluno | Central acessível via Topbar em qualquer rota logada |
