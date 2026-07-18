type SubscriptionDisplayInput = {
  plan?: string | null;
  status?: string | null;
  renewalDate?: string | null;
  now?: Date;
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
  if (status === 'expired' || status === 'canceled' || status === 'cancelled' || status === 'suspended') {
    return 'Encerrado';
  }

  const daysRemaining = getSubscriptionDaysUntil(renewalDate, now);
  if (daysRemaining === null) return null;
  if (daysRemaining <= 0) return 'Vence hoje';
  if (daysRemaining === 1) return '1 dia';
  return `${daysRemaining} dias`;
};

export const getSubscriptionRenewalLabel = (plan?: string | null) =>
  plan === 'free_trial' ? 'Fim do teste' : 'Próxima cobrança';
