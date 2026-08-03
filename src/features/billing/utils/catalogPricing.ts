import type {
  BillingCatalogPlan,
  BillingPricingPlans,
} from '@/features/billing/types';

export const buildStripePricingPlans = (
  catalog: BillingCatalogPlan[] | undefined,
): BillingPricingPlans | null => {
  const monthly = catalog?.find((plan) => plan.code === 'monthly');
  const annual = catalog?.find((plan) => plan.code === 'annual');

  if (!monthly || !annual) return null;

  return {
    monthly: {
      name: monthly.name,
      value: monthly.amountCents / 100,
      features: [
        'Acesso completo ao app',
        '5 extrações com IA por mês',
        'Catálogo e criação manual sem limite',
        'Suporte prioritário',
      ],
      badge: null,
    },
    annual: {
      name: annual.name,
      value: annual.amountCents / 100,
      features: [
        'Tudo do plano mensal',
        '10 extrações com IA por mês',
        'Acesso por 12 meses',
        'Prioridade em melhorias e suporte',
      ],
      badge: 'Melhor custo-benefício',
    },
  };
};
