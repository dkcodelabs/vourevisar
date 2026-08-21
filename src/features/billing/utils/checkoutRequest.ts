import type { BillingPlanCode } from '@/features/billing/types';

export const getCheckoutBackNavigation = (source: string | null) =>
  source === 'subscription'
    ? { to: '/conta/assinatura', label: 'Voltar à assinatura' }
    : { to: '/planos', label: 'Voltar aos planos' };

const storageKey = (plan: BillingPlanCode) => `stripe-checkout-request:${plan}`;

export const getCheckoutRequestId = (plan: BillingPlanCode) => {
  const current = window.sessionStorage.getItem(storageKey(plan));
  if (current) return current;

  const requestId = crypto.randomUUID();
  window.sessionStorage.setItem(storageKey(plan), requestId);
  return requestId;
};

export const clearCheckoutRequestIds = () => {
  window.sessionStorage.removeItem(storageKey('monthly'));
  window.sessionStorage.removeItem(storageKey('annual'));
};
