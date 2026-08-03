import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  grantManualBillingAccess,
  listAdminBillingUsers,
  revokeManualBillingAccess,
  type AdminBillingPlan,
} from '@/features/billing/services/adminBillingService';

const adminBillingKey = ['admin-billing-users'] as const;

export const useAdminBillingUsers = () =>
  useQuery({ queryKey: adminBillingKey, queryFn: listAdminBillingUsers, staleTime: 30_000 });

export const useGrantManualBillingAccess = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, plan }: { userId: string; plan: AdminBillingPlan }) => grantManualBillingAccess(userId, plan),
    onSuccess: (users) => queryClient.setQueryData(adminBillingKey, users),
  });
};

export const useRevokeManualBillingAccess = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => revokeManualBillingAccess(userId),
    onSuccess: (users) => queryClient.setQueryData(adminBillingKey, users),
  });
};
