import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AdminBillingPlan = 'free_trial' | 'monthly' | 'annual';
export type AdminBillingSource = 'stripe' | 'trial' | 'manual' | 'goodwill' | 'migration' | 'none';

export interface AdminBillingUser {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  role: 'owner' | 'admin' | 'moderator' | 'user';
  is_active: boolean;
  plan: AdminBillingPlan;
  status: string;
  access_until: string | null;
  source: AdminBillingSource;
  cancel_at_period_end: boolean;
  manual_access: {
    plan: AdminBillingPlan;
    ends_at: string;
    reason: string | null;
  } | null;
}

type AdminBillingAction = 'list' | 'grant_manual_access' | 'revoke_manual_access';

const messages: Record<string, string> = {
  authentication_required: 'Sua sessão expirou. Entre novamente para continuar.',
  invalid_session: 'Sua sessão expirou. Entre novamente para continuar.',
  admin_permission_required: 'Permissão administrativa obrigatória.',
  invalid_target_user: 'Não foi possível identificar o usuário.',
  invalid_manual_access_plan: 'O plano manual selecionado é inválido.',
  stripe_subscription_active: 'Este aluno já possui uma assinatura Stripe ativa. Gerencie a cobrança no portal, sem criar um acesso manual paralelo.',
};

const invoke = async <T>(action: AdminBillingAction, payload: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.functions.invoke<T>('admin-billing', {
    body: { action, ...payload },
  });
  if (!error) return data;

  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null) as { error?: string } | null;
    if (body?.error) throw new Error(messages[body.error] ?? 'Não foi possível atualizar o acesso. Nenhuma cobrança foi alterada.');
  }
  throw new Error('Não foi possível carregar os dados de cobrança. Tente novamente.');
};

export const listAdminBillingUsers = async () =>
  (await invoke<{ users: AdminBillingUser[] }>('list')).users;

export const grantManualBillingAccess = async (userId: string, plan: AdminBillingPlan) =>
  (await invoke<{ users: AdminBillingUser[] }>('grant_manual_access', { userId, plan })).users;

export const revokeManualBillingAccess = async (userId: string) =>
  (await invoke<{ users: AdminBillingUser[] }>('revoke_manual_access', { userId })).users;
