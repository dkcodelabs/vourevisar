import type { BillingOverview, LastExpiredAccess } from '@/features/billing/types';

export type BillingAccessRecoveryKind =
  | 'initial_trial_expired'
  | 'courtesy_expired'
  | 'subscription_expired'
  | 'payment_attention'
  | 'access_required';

export interface BillingAccessRecoveryState {
  kind: BillingAccessRecoveryKind;
  title: string;
  description: string;
  actionLabel: string;
  endedAt: string | null;
}

const expiredCopy: Record<LastExpiredAccess['kind'], Omit<BillingAccessRecoveryState, 'endedAt'>> = {
  initial_trial: {
    kind: 'initial_trial_expired',
    title: 'Seu teste de 7 dias terminou',
    description: 'O período para conhecer o vouRevisar chegou ao fim. Seus editais, ciclo e histórico continuam preservados.',
    actionLabel: 'Escolher como continuar',
  },
  courtesy: {
    kind: 'courtesy_expired',
    title: 'Sua cortesia terminou',
    description: 'Esse acesso foi liberado para você conhecer o vouRevisar. Seu trabalho e seu progresso continuam salvos.',
    actionLabel: 'Escolher um plano',
  },
  paid_subscription: {
    kind: 'subscription_expired',
    title: 'Sua assinatura foi encerrada',
    description: 'Seu acesso pago terminou, mas sua preparação continua preservada para você retomar do mesmo ponto.',
    actionLabel: 'Retomar meus estudos',
  },
};

export function getBillingAccessRecoveryState(
  overview: BillingOverview | null | undefined,
): BillingAccessRecoveryState | null {
  if (!overview || overview.is_active) return null;

  if (
    overview.subscription?.status === 'past_due' ||
    overview.subscription?.status === 'unpaid' ||
    overview.subscription?.access_suspended_at
  ) {
    return {
      kind: 'payment_attention',
      title: 'Seu pagamento precisa de atenção',
      description: 'Regularize a cobrança para recuperar o acesso. Seus dados e seu progresso continuam salvos.',
      actionLabel: 'Regularizar pagamento',
      endedAt: null,
    };
  }

  const expired = overview.last_expired_access;
  if (expired) {
    return {
      ...expiredCopy[expired.kind],
      endedAt: expired.ended_at,
    };
  }

  if (overview.source === 'stripe' || overview.status === 'canceled' || overview.status === 'incomplete_expired') {
    return {
      ...expiredCopy.paid_subscription,
      endedAt: overview.access_until,
    };
  }

  return {
    kind: 'access_required',
    title: 'Seu acesso não está ativo',
    description: 'Escolha um plano para abrir seus editais e continuar sua preparação.',
    actionLabel: 'Ver planos',
    endedAt: null,
  };
}

export function getCurrentAccessName(overview: BillingOverview): string {
  if (overview.source === 'trial') return 'Teste gratuito';
  if (overview.source === 'manual' || overview.source === 'goodwill') return 'Cortesia';
  if (overview.source === 'migration' && overview.plan === 'free_trial') return 'Acesso concedido';
  if (overview.plan === 'annual') return 'Plano anual';
  if (overview.plan === 'monthly') return 'Plano mensal';
  return 'Acesso gratuito';
}
