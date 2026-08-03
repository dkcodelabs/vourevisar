import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type {
  BillingCatalogPlan,
  BillingOverview,
  BillingPlanCode,
} from '@/features/billing/types';

interface FunctionErrorBody {
  error?: string;
}

const errorMessages: Record<string, string> = {
  authentication_required: 'Sua sessão expirou. Entre novamente para continuar.',
  invalid_session: 'Sua sessão expirou. Entre novamente para continuar.',
  billing_not_configured: 'Os pagamentos estão temporariamente indisponíveis. Tente novamente mais tarde.',
  invalid_checkout_request: 'Não foi possível identificar o plano escolhido.',
  subscription_already_active: 'Seu plano já está ativo. Acesse Minha assinatura para gerenciá-lo.',
  checkout_request_in_progress: 'Seu pagamento já está sendo preparado. Aguarde alguns segundos.',
  stripe_client_secret_missing: 'Não conseguimos preparar o pagamento agora. Nenhuma cobrança foi iniciada. Tente novamente.',
  billing_customer_not_found: 'Ainda não há uma assinatura ativa para gerenciar.',
};

const getFunctionErrorCode = async (error: unknown) => {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as FunctionErrorBody;
      if (body.error) return body.error;
    } catch {
      return 'billing_request_failed';
    }
  }
  return 'billing_request_failed';
};

const invokeBillingFunction = async <T>(
  name: string,
  body: Record<string, unknown> = {},
): Promise<T> => {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (!error) return data;

  const code = await getFunctionErrorCode(error);
  throw new Error(errorMessages[code] ?? 'Não foi possível concluir esta ação. Nenhuma alteração foi feita. Tente novamente.');
};

export const getStripeCatalog = async (): Promise<BillingCatalogPlan[]> => {
  const response = await invokeBillingFunction<{ plans: BillingCatalogPlan[] }>('stripe-catalog');
  return response.plans;
};

export const createStripeCheckout = async (
  plan: BillingPlanCode,
  requestId: string,
) =>
  invokeBillingFunction<{ clientSecret: string; reused: boolean }>('stripe-create-checkout', {
    plan,
    requestId,
  });

export const createStripePortal = async () =>
  invokeBillingFunction<{ url: string }>('stripe-create-portal');

export const getStripeBillingOverview = async (): Promise<BillingOverview> => {
  // The RPC is introduced by the Stripe migration. Keep the generated database
  // types untouched until the migration is applied and types are regenerated.
  const billingClient = supabase as unknown as {
    rpc: (
      name: 'get_stripe_billing_overview',
    ) => Promise<{ data: BillingOverview | null; error: { message: string } | null }>;
  };
  const { data, error } = await billingClient.rpc('get_stripe_billing_overview');

  if (error) throw new Error('Não foi possível carregar os dados da assinatura.');
  if (!data) throw new Error('Nenhuma informação de assinatura foi encontrada.');
  return data;
};

export const formatBillingPrice = (amountCents: number, currency: string) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
