import { useCallback } from 'react';
import { useStripeBillingOverview } from '@/features/billing/hooks/useStripeBilling';
import { getBillingAccessLabel } from '@/features/billing/utils/billingAccessLabel';
import { useUserRole } from '@/hooks/useUserRole';

export type UserAccessBlockReason = 'subscription_required' | 'subscription_expired' | 'unknown';

export function useUserAccess() {
  const roleData = useUserRole();
  const billingOverview = useStripeBillingOverview();
  const { refetch: refetchRoles } = roleData;
  const { refetch: refetchBilling } = billingOverview;

  const refetch = useCallback(async () => {
    await Promise.all([refetchRoles(), refetchBilling()]);
  }, [refetchBilling, refetchRoles]);

  const billing = billingOverview.data;
  const hasInternalAccess = roleData.isOwner || roleData.isAdmin;
  const hasFullAccess = hasInternalAccess || Boolean(billing?.is_active);
  const isTrial = billing?.source === 'trial' || billing?.plan === 'free_trial';
  const isPaid = Boolean(billing?.is_active && !isTrial);

  const accessLevel = roleData.isOwner
    ? 'owner'
    : roleData.isAdmin
      ? 'admin'
      : roleData.isModerator
        ? 'moderator'
        : isPaid
          ? 'paid'
          : billing?.is_active
            ? 'trial'
            : 'none';

  const accessMessage = roleData.isOwner
    ? 'Acesso total como proprietário'
    : roleData.isAdmin
      ? 'Acesso administrativo'
      : roleData.isModerator
        ? 'Acesso de moderador'
        : billing?.is_active
          ? getBillingAccessLabel(billing)
          : billingOverview.isError
            ? 'Não foi possível confirmar o acesso'
            : 'Sem acesso';

  const blockedReason: UserAccessBlockReason = !billing
    ? 'unknown'
    : billing.status === 'expired' || billing.status === 'canceled'
      ? 'subscription_expired'
      : 'subscription_required';

  return {
    loading: roleData.loading || billingOverview.isLoading,
    error: billingOverview.error instanceof Error ? billingOverview.error.message : null,
    roles: roleData,
    subscription: billingOverview,
    hasFullAccess,
    canAccessPremiumFeatures: hasInternalAccess || isPaid,
    canManageUsers: roleData.isAdmin || roleData.isOwner,
    accessLevel,
    accessMessage,
    blockedReason,
    refetch,
  };
}
