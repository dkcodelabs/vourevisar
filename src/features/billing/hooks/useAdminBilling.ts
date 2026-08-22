import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  grantManualBillingAccess,
  listAdminBillingOperations,
  listAdminRefundRequests,
  listAdminBillingUsers,
  reconcileAdminRefundRequest,
  revokeManualBillingAccess,
  type AdminBillingPlan,
} from '@/features/billing/services/adminBillingService';

const adminBillingKey = ['admin-billing-users'] as const;
const adminRefundRequestsKey = ['admin-billing-refund-requests'] as const;
const adminBillingOperationsKey = ['admin-billing-operations'] as const;

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

export const useAdminRefundRequests = (enabled: boolean) =>
  useQuery({
    queryKey: adminRefundRequestsKey,
    queryFn: listAdminRefundRequests,
    enabled,
    staleTime: 15_000,
    retry: false,
  });

export const useAdminBillingOperations = () =>
  useQuery({
    queryKey: adminBillingOperationsKey,
    queryFn: listAdminBillingOperations,
    staleTime: 15_000,
    retry: false,
  });

export const useReconcileAdminRefundRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reconcileAdminRefundRequest,
    onSuccess: (refundRequests) =>
      queryClient.setQueryData(adminRefundRequestsKey, refundRequests),
  });
};
