import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptStripeContract,
  createStripePortal,
  getStripeBillingOverview,
  getStripeInvoiceHistory,
  getStripeCatalog,
} from '@/features/billing/services/stripeBillingService';

export const stripeBillingKeys = {
  all: ['stripe-billing'] as const,
  catalog: () => [...stripeBillingKeys.all, 'catalog'] as const,
  overview: () => [...stripeBillingKeys.all, 'overview'] as const,
  invoiceHistory: () => [...stripeBillingKeys.all, 'invoice-history'] as const,
};

export const useStripeCatalog = (enabled = true) =>
  useQuery({
    queryKey: stripeBillingKeys.catalog(),
    queryFn: getStripeCatalog,
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

export const useStripeBillingOverview = (enabled = true) =>
  useQuery({
    queryKey: stripeBillingKeys.overview(),
    queryFn: getStripeBillingOverview,
    enabled,
    retry: false,
    // O Customer Portal vive fora da aplicação. Ao voltar dele, o resumo
    // financeiro precisa ser relido para refletir cancelamentos e reativações
    // confirmados pelo webhook, sem depender do cache da navegação anterior.
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

export const useStripeInvoiceHistory = (enabled: boolean) =>
  useQuery({
    queryKey: stripeBillingKeys.invoiceHistory(),
    queryFn: getStripeInvoiceHistory,
    enabled,
    staleTime: 60 * 1000,
    retry: false,
  });

export const useStripePortal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStripePortal,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: stripeBillingKeys.overview() });
    },
  });
};

export const useStripeContractAcceptance = () =>
  useMutation({
    mutationFn: acceptStripeContract,
  });
