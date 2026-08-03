export type SubscriptionEntitlementInput = {
  plan: 'free_trial' | 'monthly' | 'annual' | string | null | undefined;
  status: 'trial' | 'active' | 'expired' | 'canceled' | 'cancelled' | 'suspended' | string | null | undefined;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  nextBillingAt?: string | null;
  manualAccessUntil?: string | null;
  manualAccessPlan?: 'free_trial' | 'monthly' | 'annual' | string | null;
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
  manualAccessUntil,
  manualAccessPlan,
  now = new Date(),
}: SubscriptionEntitlementInput): SubscriptionEntitlement {
  type Candidate = {
    plan: 'free_trial' | 'monthly' | 'annual';
    status: 'trial' | 'active';
    end: string | null;
    source: 'manual' | 'trial' | 'paid';
  };
  const candidates: Candidate[] = [];
  const manualPlan = manualAccessPlan === 'monthly' || manualAccessPlan === 'annual'
    ? manualAccessPlan
    : 'free_trial';

  if (manualAccessUntil && daysUntil(manualAccessUntil, now) > 0) {
    candidates.push({ plan: manualPlan, status: manualPlan === 'free_trial' ? 'trial' : 'active', end: manualAccessUntil, source: 'manual' });
  }
  if (status === 'trial' && trialEndsAt && daysUntil(trialEndsAt, now) > 0) {
    candidates.push({ plan: 'free_trial', status: 'trial', end: trialEndsAt, source: 'trial' });
  }

  const paidPlan = plan === 'monthly' || plan === 'annual';
  // When the provider does not return an explicit paid-period end, the next
  // billing date is the end of the period currently covered by that payment.
  // It must not keep access alive after the period has elapsed.
  const paidEnd = subscriptionEndsAt ?? nextBillingAt;
  const paidStillValid = !paidEnd || daysUntil(paidEnd, now) > 0;
  if ((status === 'active' || status === 'canceled') && paidPlan && paidStillValid) {
    candidates.push({ plan, status: 'active', end: paidEnd ?? null, source: 'paid' });
  }

  if (candidates.length > 0) {
    const selected = candidates.sort((left, right) => {
      if (!left.end && !right.end) return left.source === 'manual' ? -1 : 1;
      if (!left.end) return -1;
      if (!right.end) return 1;
      return new Date(right.end).getTime() - new Date(left.end).getTime();
    })[0];
    return { plan: selected.plan, status: selected.status, isActive: true, daysRemaining: daysUntil(selected.end, now) };
  }

  return {
    plan: 'free_trial',
    status: 'expired',
    isActive: false,
    daysRemaining: 0,
  };
}
