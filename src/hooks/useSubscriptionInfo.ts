import { useCallback } from 'react';
import { useStripeBillingOverview } from '@/features/billing/hooks/useStripeBilling';

interface SubscriptionInfo {
  user_id: string;
  plan: 'free_trial' | 'monthly' | 'annual';
  status: 'trial' | 'active' | 'expired' | 'canceled' | 'suspended';
  is_active: boolean;
  days_remaining: number | null;
  billing_type: string | null;
  cancel_at_period_end: boolean;
  next_billing_date: string | null;
  last_payment_at: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  scheduled_plan: 'free_trial' | 'monthly' | 'annual' | null;
  scheduled_plan_at: string | null;
  manual_access_until: string | null;
  manual_access_plan: 'free_trial' | 'monthly' | 'annual' | null;
  manual_access_reason: string | null;
  manual_access_granted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UseSubscriptionInfoReturn {
  subscriptionInfo: SubscriptionInfo | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  forceRefresh: () => void;
}

const toDaysRemaining = (accessUntil: string | null) => {
  if (!accessUntil) return null;

  const timestamp = new Date(accessUntil).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.ceil((timestamp - Date.now()) / 86_400_000));
};

/**
 * Compatibility adapter for legacy presentation components.
 *
 * Access is intentionally derived from the Stripe billing overview, which also
 * contains internal courtesy grants. It must never query the retired
 * subscription store, which is not an entitlement source.
 */
export function useSubscriptionInfo(): UseSubscriptionInfoReturn {
  const billingOverview = useStripeBillingOverview();
  const billing = billingOverview.data;

  const subscriptionInfo: SubscriptionInfo | null = billing
    ? (() => {
        const subscription = billing.subscription;
        const accessUntil = billing.access_until ?? subscription?.current_period_end ?? null;
        const isTrial = billing.source === 'trial' || billing.plan === 'free_trial';
        const isActive = billing.is_active;
        const status: SubscriptionInfo['status'] = isActive
          ? (isTrial ? 'trial' : 'active')
          : billing.status === 'canceled'
            ? 'canceled'
            : billing.status === 'suspended'
              ? 'suspended'
              : 'expired';

        return {
          user_id: '',
          plan: billing.plan,
          status,
          is_active: isActive,
          days_remaining: isActive ? toDaysRemaining(accessUntil) : 0,
          billing_type: billing.source === 'stripe' ? 'stripe' : billing.source,
          cancel_at_period_end: Boolean(subscription?.cancel_at_period_end),
          next_billing_date: subscription?.current_period_end ?? null,
          last_payment_at: null,
          trial_started_at: null,
          trial_ends_at: isTrial ? accessUntil : null,
          subscription_started_at: subscription?.current_period_start ?? null,
          subscription_ends_at: accessUntil,
          scheduled_plan: subscription?.scheduled_plan ?? null,
          scheduled_plan_at: null,
          manual_access_until: billing.source === 'manual' || billing.source === 'goodwill'
            ? accessUntil
            : null,
          manual_access_plan: billing.source === 'manual' || billing.source === 'goodwill'
            ? billing.plan
            : null,
          manual_access_reason: billing.source === 'manual' || billing.source === 'goodwill'
            ? 'Cortesia administrativa'
            : null,
          manual_access_granted_at: null,
          created_at: subscription?.current_period_start ?? billing.subscription?.updated_at ?? new Date(0).toISOString(),
          updated_at: billing.subscription?.updated_at ?? new Date(0).toISOString(),
        };
      })()
    : null;

  const refetch = useCallback(async () => {
    await billingOverview.refetch();
  }, [billingOverview]);

  const forceRefresh = useCallback(() => {
    void billingOverview.refetch();
  }, [billingOverview]);

  return {
    subscriptionInfo,
    loading: billingOverview.isLoading,
    error: billingOverview.error instanceof Error ? billingOverview.error.message : null,
    refetch,
    forceRefresh,
  };
}
