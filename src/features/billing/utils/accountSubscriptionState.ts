import type { BillingOverview } from '@/features/billing/types';
import { getBillingAccessRecoveryState } from '@/features/billing/utils/billingAccessRecovery';

export type AccountSubscriptionAction = 'none' | 'plans' | 'portal';
export type AccountSubscriptionTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface AccountSubscriptionState {
  kind: 'internal' | 'trial' | 'active' | 'ending' | 'payment_attention' | 'ended';
  tone: AccountSubscriptionTone;
  badge: string;
  heroDescription: string;
  summaryLabel: string;
  summaryValue: string | null;
  asideTitle: string;
  asideDescription: string;
  primaryAction: AccountSubscriptionAction;
  primaryActionLabel: string;
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
      tone: 'neutral',
      badge: 'Acesso administrativo',
      heroDescription: 'Esta conta possui acesso interno e não depende de uma assinatura ou cobrança.',
      summaryLabel: 'Acesso',
      summaryValue: 'Sem vencimento',
      asideTitle: 'Acesso interno',
      asideDescription: 'Contas administrativas não possuem cartão, faturas ou renovação vinculados à Stripe.',
      primaryAction: 'none',
      primaryActionLabel: 'Acesso confirmado',
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
      tone: accessSuspended ? 'danger' : 'warning',
      badge: accessSuspended ? 'Acesso bloqueado' : 'Pagamento pendente',
      heroDescription: accessSuspended
        ? 'Não foi possível concluir a cobrança. Seu acesso fica bloqueado até o pagamento ser regularizado.'
        : 'Seu plano continua disponível durante o período vigente. Atualize o pagamento para evitar a interrupção do acesso.',
      summaryLabel: accessSuspended ? 'Situação do acesso' : 'Período vigente até',
      summaryValue: accessSuspended ? 'Aguardando pagamento' : null,
      asideTitle: accessSuspended ? 'Retome seus estudos' : 'Mantenha seu acesso',
      asideDescription: 'Atualize o cartão em um ambiente protegido e regularize a fatura pendente.',
      primaryAction: 'portal',
      primaryActionLabel: accessSuspended ? 'Regularizar pagamento' : 'Atualizar pagamento',
      artworkNextStep: 'Regularizar pagamento',
      alertTitle: accessSuspended ? 'Acesso bloqueado até a regularização' : 'Não foi possível cobrar seu cartão',
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
      tone: 'neutral',
      badge: 'Assinatura encerrada',
      heroDescription: 'Sua assinatura foi encerrada. Escolha um plano para retomar seus estudos; suas informações continuam salvas.',
      summaryLabel: 'Renovação',
      summaryValue: 'Sem renovação ativa',
      asideTitle: 'Pronto para retomar?',
      asideDescription: 'Escolha um novo plano para recuperar o acesso. Suas cobranças anteriores ficam disponíveis apenas para consulta.',
      primaryAction: 'plans',
      primaryActionLabel: 'Escolher novo plano',
      artworkNextStep: 'Retomar assinatura',
      alertTitle: null,
      alertDescription: null,
    };
  }

  if (!overview.is_active) {
    const recovery = getBillingAccessRecoveryState(overview);
    return {
      kind: 'ended',
      tone: 'neutral',
      badge: recovery?.kind === 'initial_trial_expired'
        ? 'Teste encerrado'
        : recovery?.kind === 'courtesy_expired'
          ? 'Cortesia encerrada'
          : 'Acesso inativo',
      heroDescription: recovery?.description ?? 'Seu acesso não está ativo. Escolha um plano para retomar seus estudos.',
      summaryLabel: 'Fim do acesso',
      summaryValue: null,
      asideTitle: 'Pronto para retomar?',
      asideDescription: 'Escolha mensal ou anual. Seus editais, ciclo e histórico continuam preservados.',
      primaryAction: 'plans',
      primaryActionLabel: recovery?.actionLabel ?? 'Ver planos',
      artworkNextStep: 'Retomar estudos',
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
      tone: 'warning',
      badge: 'Renovação cancelada',
      heroDescription: 'Sua renovação foi cancelada, mas o acesso continua disponível até o fim do período pago.',
      summaryLabel: 'Acesso até',
      summaryValue: null,
      asideTitle: 'Gerencie sua assinatura',
      asideDescription: 'Na Stripe, consulte as cobranças, altere o cartão ou reative a renovação. Apenas abrir não faz nenhuma alteração.',
      primaryAction: 'portal',
      primaryActionLabel: 'Gerenciar assinatura',
      artworkNextStep: 'Voltar aos estudos',
      alertTitle: null,
      alertDescription: null,
    };
  }

  if (isStripeSubscriber) {
    return {
      kind: 'active',
      tone: 'success',
      badge: 'Acesso ativo',
      heroDescription: 'Seu plano, cartão, faturas e renovação ficam reunidos em um só lugar.',
      summaryLabel: 'Próxima renovação',
      summaryValue: null,
      asideTitle: 'Gerencie sem burocracia',
      asideDescription: 'Atualize seu cartão, consulte faturas e controle a renovação em um ambiente protegido.',
      primaryAction: 'portal',
      primaryActionLabel: 'Gerenciar pagamento',
      artworkNextStep: 'Voltar aos estudos',
      alertTitle: null,
      alertDescription: null,
    };
  }

  const isCourtesy = overview.source === 'manual' || overview.source === 'goodwill' || overview.source === 'migration';

  return {
    kind: 'trial',
    tone: 'info',
    badge: isCourtesy ? 'Cortesia ativa' : 'Teste ativo',
    heroDescription: isCourtesy
      ? 'Este acesso foi concedido como cortesia. Você pode estudar normalmente até o fim do período indicado.'
      : 'Seu teste de 7 dias está ativo. Assine quando quiser para manter sua preparação sem interromper o ritmo.',
    summaryLabel: 'Fim do período',
    summaryValue: null,
    asideTitle: 'Pronto para continuar?',
    asideDescription: 'Escolha mensal ou anual e conclua com cartão no nosso checkout seguro.',
    primaryAction: 'plans',
    primaryActionLabel: 'Ver planos',
    artworkNextStep: 'Voltar aos estudos',
    alertTitle: null,
    alertDescription: null,
  };
};
