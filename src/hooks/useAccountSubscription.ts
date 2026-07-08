import { useQuery } from '@tanstack/react-query';

import { getAccountSubscription } from '@/services/accountSubscriptionService';

export const accountSubscriptionQueryKey = ['account-subscription'] as const;

export function useAccountSubscription() {
  return useQuery({
    queryKey: accountSubscriptionQueryKey,
    queryFn: getAccountSubscription,
    staleTime: 60_000,
  });
}
