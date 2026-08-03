import type { BillingOverview } from '@/features/billing/types';

export const getBillingAccessLabel = (overview: BillingOverview | null | undefined) => {
  if (!overview) return 'Status indisponível';
  if (!overview.is_active) return 'Sem plano ativo';
  if (overview.source === 'trial' || overview.plan === 'free_trial') return 'Teste gratuito';
  return overview.plan === 'annual' ? 'Plano anual' : 'Plano mensal';
};
