import type { BillingOverview } from '@/features/billing/types';

export type AccountSubscriptionAction = 'none' | 'plans' | 'portal';

export interface AccountSubscriptionState {
  kind: 'internal' | 'trial' | 'active' | 'ending' | 'payment_attention' | 'ended';
  badge: string;
  heroDescription: string;
  summaryLabel: string;
  summaryValue: string | null;
  asideTitle: string;
  asideDescription: string;
  primaryAction: AccountSubscriptionAction;
  primaryActionLabel: string;
  secondaryPortalLabel: string | null;
  artworkNextStep: string;
  alertTitle: string | null;
  alertDescription: string | null;
}

const endedStatuses = new Set(['canceled', 'incomplete_expired']);

export const getAccountSubscriptionState = (
  overview: BillingOverview,
  hasInternalAccess: boolean,
): AccountSubscriptionState => {
  const subscription = overview.subscription;
  const isStripeSubscriber = overview.source === 'stripe' && Boolean(subscription);

  if (hasInternalAccess) {
    return {
      kind: 'internal',
      badge: 'Acesso administrativo',
      heroDescription: 'Esta conta possui acesso interno e não depende de uma assinatura ou cobrança.',
      summaryLabel: 'Acesso',
      summaryValue: 'Sem vencimento',
      asideTitle: 'Acesso interno',
      asideDescription: 'Contas administrativas não possuem cartão, faturas ou renovação vinculados à Stripe.',
      primaryAction: 'none',
      primaryActionLabel: 'Acesso confirmado',
      secondaryPortalLabel: null,
      artworkNextStep: 'Voltar aos estudos',
      alertTitle: null,
      alertDescription: null,
    };
  }

  const needsPaymentAttention = isStripeSubscriber && (
    subscription?.status === 'past_due' ||
    subscription?.status === 'unpaid' ||
    Boolean(subscription?.access_suspended_at)
  );

  if (needsPaymentAttention) {
    const accessSuspended = Boolean(subscription?.access_suspended_at) || subscription?.status === 'unpaid';

    return {
      kind: 'payment_attention',
      badge: accessSuspended ? 'Acesso suspenso' : 'Pagamento pendente',
      heroDescription: accessSuspended
        ? 'Seu acesso está pausado enquanto o pagamento é regularizado. Atualize a forma de pagamento para continuar.'
        : 'Seu plano continua disponível durante o período vigente. Atualize o pagamento para evitar a interrupção do acesso.',
      summaryLabel: accessSuspended ? 'Situação do acesso' : 'Período vigente até',
      summaryValue: accessSuspended ? 'Aguardando pagamento' : null,
      asideTitle: accessSuspended ? 'Retome seus estudos' : 'Mantenha seu acesso',
      asideDescription: 'Atualize o cartão em um ambiente protegido e regularize a fatura pendente.',
      primaryAction: 'portal',
      primaryActionLabel: accessSuspended ? 'Regularizar pagamento' : 'Atualizar pagamento',
      secondaryPortalLabel: null,
      artworkNextStep: 'Regularizar pagamento',
      alertTitle: accessSuspended ? 'Acesso suspenso' : 'Pagamento pendente',
      alertDescription: accessSuspended
        ? 'Regularize o pagamento para recuperar o acesso. Seus dados e seu progresso continuam salvos.'
        : 'Seu acesso permanece durante o período vigente. Atualize o cartão para evitar interrupção.',
    };
  }

  const hasEnded = isStripeSubscriber && (
    !overview.is_active || endedStatuses.has(subscription?.status ?? '')
  );

  if (hasEnded) {
    return {
      kind: 'ended',
      badge: 'Assinatura encerrada',
      heroDescription: 'Sua assinatura foi encerrada. Escolha um plano para retomar seus estudos; suas informações continuam salvas.',
      summaryLabel: 'Renovação',
      summaryValue: 'Sem renovação ativa',
      asideTitle: 'Pronto para retomar?',
      asideDescription: 'Para voltar a estudar, escolha um novo plano. Se houver uma fatura pendente, ela pode ser regularizada no histórico, mas não inicia uma nova assinatura.',
      primaryAction: 'plans',
      primaryActionLabel: 'Escolher novo plano',
      secondaryPortalLabel: 'Ver histórico e faturas',
      artworkNextStep: 'Retomar assinatura',
      alertTitle: null,
      alertDescription: null,
    };
  }

  const isEnding = isStripeSubscriber && Boolean(
    subscription?.cancel_at_period_end || subscription?.cancel_at,
  );

  if (isEnding) {
    return {
      kind: 'ending',
      badge: 'Renovação cancelada',
      heroDescription: 'Sua renovação foi cancelada, mas o acesso continua disponível até o fim do período pago.',
      summaryLabel: 'Acesso até',
      summaryValue: null,
      asideTitle: 'Gerencie sem burocracia',
      asideDescription: 'Consulte faturas, atualize o cartão ou reative a renovação em um ambiente protegido.',
      primaryAction: 'portal',
      primaryActionLabel: 'Gerenciar assinatura',
      secondaryPortalLabel: null,
      artworkNextStep: 'Voltar aos estudos',
      alertTitle: 'Renovação cancelada',
      alertDescription: null,
    };
  }

  if (isStripeSubscriber) {
    return {
      kind: 'active',
      badge: 'Acesso ativo',
      heroDescription: 'Seu plano, cartão, faturas e renovação ficam reunidos em um só lugar.',
      summaryLabel: 'Próxima renovação',
      summaryValue: null,
      asideTitle: 'Gerencie sem burocracia',
      asideDescription: 'Atualize seu cartão, consulte faturas e controle a renovação em um ambiente protegido.',
      primaryAction: 'portal',
      primaryActionLabel: 'Gerenciar pagamento',
      secondaryPortalLabel: null,
      artworkNextStep: 'Voltar aos estudos',
      alertTitle: null,
      alertDescription: null,
    };
  }

  return {
    kind: 'trial',
    badge: overview.is_active ? 'Acesso ativo' : 'Acesso inativo',
    heroDescription: overview.is_active
      ? 'Aproveite o período gratuito. Quando quiser, escolha um plano sem perder seus dados.'
      : 'Seu período gratuito terminou. Escolha um plano para retomar seus estudos sem perder seus dados.',
    summaryLabel: 'Fim do período',
    summaryValue: null,
    asideTitle: 'Pronto para continuar?',
    asideDescription: 'Escolha mensal ou anual e conclua com cartão no nosso checkout seguro.',
    primaryAction: 'plans',
    primaryActionLabel: 'Ver planos',
    secondaryPortalLabel: null,
    artworkNextStep: overview.is_active ? 'Voltar aos estudos' : 'Escolher um plano',
    alertTitle: null,
    alertDescription: null,
  };
};
