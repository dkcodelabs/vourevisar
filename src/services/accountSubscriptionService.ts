import { supabase } from '@/integrations/supabase/client';

export type LocalAccountSubscription = {
  plan: string | null;
  status: string | null;
  billingType: string | null;
  subscriptionStartedAt?: string | null;
  subscriptionEndsAt?: string | null;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  nextBillingDate?: string | null;
  lastPaymentAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AccountAsaasSubscription = {
  status: string | null;
  value: number | null;
  cycle: string | null;
  billingType: string | null;
  nextDueDate: string | null;
};

export type AccountAsaasPayment = {
  id: string;
  status: string | null;
  value: number | null;
  dueDate: string | null;
  paymentDate: string | null;
  billingType: string | null;
};

export type AccountAsaasData = {
  available: boolean;
  unavailableReason?: string;
  subscription: AccountAsaasSubscription | null;
  payments: AccountAsaasPayment[];
};

export type AccountSubscription = {
  subscription: LocalAccountSubscription | null;
  asaas: AccountAsaasData;
};

type AccountSubscriptionResponse = {
  success?: boolean;
  data?: AccountSubscription;
  error?: string;
};

export async function getAccountSubscription(): Promise<AccountSubscription> {
  const { data, error } = await supabase.functions.invoke<AccountSubscriptionResponse>('asaas-account', {
    body: { action: 'get_account_subscription' },
  });

  if (error) {
    throw new Error(error.message || 'Nao foi possivel carregar a assinatura');
  }

  if (!data?.success || !data.data) {
    throw new Error(data?.error || 'Nao foi possivel carregar a assinatura');
  }

  return data.data;
}
