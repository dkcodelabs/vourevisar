export type SubscriptionEntitlementInput = {
  plan: 'free_trial' | 'monthly' | 'annual' | string | null | undefined;
  status: 'trial' | 'active' | 'expired' | 'canceled' | 'cancelled' | 'suspended' | string | null | undefined;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  nextBillingAt?: string | null;
  now?: Date;
};

export type SubscriptionEntitlement = {
  plan: 'free_trial' | 'monthly' | 'annual';
  status: 'trial' | 'active' | 'expired';
  isActive: boolean;
  daysRemaining: number;
};

const daysUntil = (dateString: string | null | undefined, now: Date) => {
  if (!dateString) return 0;
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime()) || target <= now) return 0;
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86400000));
};

/**
 * Keeps access labels consistent across the menu, guards and account surfaces.
 * A paid record is not active merely because its database status is `active`:
 * an explicit end date in the past wins.
 */
export function getSubscriptionEntitlement({
  plan,
  status,
  trialEndsAt,
  subscriptionEndsAt,
  nextBillingAt,
  now = new Date(),
}: SubscriptionEntitlementInput): SubscriptionEntitlement {
  if (status === 'trial' && daysUntil(trialEndsAt, now) > 0) {
    return {
      plan: 'free_trial',
      status: 'trial',
      isActive: true,
      daysRemaining: daysUntil(trialEndsAt, now),
    };
  }

  const paidPlan = plan === 'monthly' || plan === 'annual';
  const paidStillValid =
    (!subscriptionEndsAt || daysUntil(subscriptionEndsAt, now) > 0)
    && (!nextBillingAt || daysUntil(nextBillingAt, now) > 0);

  if (status === 'active' && paidPlan && paidStillValid) {
    return {
      plan,
      status: 'active',
      isActive: true,
      daysRemaining: daysUntil(subscriptionEndsAt, now),
    };
  }

  return {
    plan: 'free_trial',
    status: 'expired',
    isActive: false,
    daysRemaining: 0,
  };
}
