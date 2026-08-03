export type SubscriptionDisplayInput = {
  plan?: string | null;
  status?: string | null;
  renewalDate?: string | null;
  now?: Date;
};

export type SubscriptionBillingDisplayInput = {
  plan?: string | null;
  status?: string | null;
  billingType?: string | null;
  nextBillingDate?: string | null;
  subscriptionEndsAt?: string | null;
  trialEndsAt?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  now?: Date;
};

const isCreditCardBilling = (billingType?: string | null) =>
  billingType?.toUpperCase() === 'CREDIT_CARD';

export const hasAutomaticRenewal = ({
  status,
  billingType,
  nextBillingDate,
  cancelAtPeriodEnd,
}: SubscriptionBillingDisplayInput) =>
  status === 'active' &&
  isCreditCardBilling(billingType) &&
  !cancelAtPeriodEnd &&
  Boolean(nextBillingDate);

export const getSubscriptionDisplayDate = (input: SubscriptionBillingDisplayInput) => {
  if (input.status === 'trial' || input.plan === 'free_trial') {
    return input.trialEndsAt ?? null;
  }

  return hasAutomaticRenewal(input)
    ? input.nextBillingDate ?? null
    : input.subscriptionEndsAt ?? null;
};

export const getSubscriptionDisplayDateLabel = (input: SubscriptionBillingDisplayInput) => {
  if (input.status === 'trial' || input.plan === 'free_trial') return 'Fim do teste';
  return hasAutomaticRenewal(input) ? 'Próxima cobrança' : 'Acesso até';
};

export const getSubscriptionAccessStatusLabel = (input: SubscriptionBillingDisplayInput) => {
  if (input.status === 'trial' || input.plan === 'free_trial') return 'Teste gratuito';
  if (input.status === 'expired' || input.status === 'suspended') {
    return 'Encerrado';
  }
  if (input.status === 'canceled' || input.status === 'cancelled') {
    const end = input.subscriptionEndsAt ? new Date(input.subscriptionEndsAt).getTime() : NaN;
    const now = input.now?.getTime() ?? Date.now();
    return Number.isFinite(end) && end > now ? 'Ativo até o fim do período' : 'Encerrado';
  }
  return hasAutomaticRenewal(input) ? 'Ativo' : 'Ativo até o fim do período';
};

export const getSubscriptionDaysUntil = (
  dateString?: string | null,
  now = new Date(),
) => {
  if (!dateString) return null;
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
};

export const getSubscriptionRemainingLabel = ({
  plan,
  status,
  renewalDate,
  now,
}: SubscriptionDisplayInput) => {
  const daysRemaining = getSubscriptionDaysUntil(renewalDate, now);
  if (daysRemaining === null) return null;
  if (status === 'expired' || status === 'suspended') return 'Encerrado';
  if ((status === 'canceled' || status === 'cancelled') && daysRemaining <= 0) {
    return 'Encerrado';
  }
  if (daysRemaining <= 0) return 'Vence hoje';
  if (daysRemaining === 1) return '1 dia';
  return `${daysRemaining} dias`;
};

export const getSubscriptionRenewalLabel = (plan?: string | null) =>
  plan === 'free_trial' ? 'Fim do teste' : 'Próxima cobrança';
