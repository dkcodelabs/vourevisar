import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createStripePortal,
  getStripeBillingOverview,
  getStripeCatalog,
} from '@/features/billing/services/stripeBillingService';

export const stripeBillingKeys = {
  all: ['stripe-billing'] as const,
  catalog: () => [...stripeBillingKeys.all, 'catalog'] as const,
  overview: () => [...stripeBillingKeys.all, 'overview'] as const,
};

export const useStripeCatalog = () =>
  useQuery({
    queryKey: stripeBillingKeys.catalog(),
    queryFn: getStripeCatalog,
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

export const useStripePortal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStripePortal,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: stripeBillingKeys.overview() });
    },
  });
};
