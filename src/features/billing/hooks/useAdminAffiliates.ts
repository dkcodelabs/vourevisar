import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminAffiliate,
  listAdminAffiliateLedger,
  recordAdminAffiliatePayout,
  setAdminAffiliateActive,
} from '@/features/billing/services/adminAffiliateService';

export const adminAffiliateLedgerKey = ['admin-affiliate-ledger'] as const;

export const useAdminAffiliateLedger = () => useQuery({
  queryKey: adminAffiliateLedgerKey,
  queryFn: listAdminAffiliateLedger,
  staleTime: 15_000,
  retry: false,
});

const useLedgerMutation = <T,>(mutationFn: (input: T) => ReturnType<typeof listAdminAffiliateLedger>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (ledger) => queryClient.setQueryData(adminAffiliateLedgerKey, ledger),
  });
};

export const useCreateAdminAffiliate = () => useLedgerMutation(createAdminAffiliate);
export const useSetAdminAffiliateActive = () => useLedgerMutation(setAdminAffiliateActive);
export const useRecordAdminAffiliatePayout = () => useLedgerMutation(recordAdminAffiliatePayout);
