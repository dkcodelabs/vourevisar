import { FunctionsHttpError } from '@supabase/supabase-js';
import { invokeUserRpc } from '@/services/userRpcService';
import { supabase } from '@/integrations/supabase/client';
import type {
  BillingCatalogPlan,
  BillingInvoiceHistoryItem,
  BillingOverview,
  BillingPlanCode,
  BillingWithdrawalResult,
  BillingWithdrawalEmailResult,
} from '@/features/billing/types';
import { billingContractVersions } from '@/features/billing/legal/billingLegalDocuments';

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
  contract_acceptance_not_enabled: 'A contratação está temporariamente indisponível enquanto atualizamos os documentos do serviço.',
  invalid_contract_acceptance: 'Não conseguimos registrar sua confirmação. Revise os documentos e tente novamente.',
  checkout_attempt_not_found: 'Esta sessão de pagamento não está mais disponível. Volte e inicie novamente.',
  checkout_not_open: 'Esta sessão de pagamento não está mais aberta. Volte e inicie novamente.',
  checkout_expired: 'Esta sessão de pagamento expirou. Volte e inicie novamente.',
  checkout_contract_mismatch: 'Os dados desta contratação mudaram. Volte e inicie novamente para sua segurança.',
  checkout_price_mismatch: 'O plano ou valor desta sessão mudou. Nenhuma cobrança foi feita.',
  contract_version_outdated: 'Os documentos desta contratação foram atualizados. Recarregue a página antes de continuar.',
  contract_version_conflict: 'Esta sessão usa uma versão anterior dos documentos. Volte e inicie novamente.',
  withdrawal_not_enabled: 'O pedido online está temporariamente indisponível. Fale com o suporte para registrar sua solicitação.',
  invalid_withdrawal_request: 'Não foi possível registrar sua solicitação. Recarregue a página e tente novamente.',
  withdrawal_subscription_not_found: 'Não encontramos uma assinatura paga elegível para este pedido.',
  withdrawal_mode_mismatch: 'Os dados da assinatura não correspondem a este ambiente. Nenhuma operação foi realizada.',
  withdrawal_subscription_mismatch: 'Não foi possível confirmar a titularidade desta assinatura.',
  withdrawal_contract_not_found: 'Não encontramos o aceite contratual desta assinatura.',
  withdrawal_contract_not_ready: 'Sua contratação ainda está sendo confirmada. Aguarde alguns instantes e tente novamente.',
  withdrawal_window_expired: 'A janela de arrependimento desta contratação terminou. Você ainda pode cancelar futuras renovações.',
  withdrawal_payment_not_found: 'O pagamento inicial não foi localizado. Fale com o suporte para análise.',
  withdrawal_result_not_found: 'Não encontramos um resultado de cancelamento para enviar.',
  withdrawal_email_missing: 'Sua conta não possui um e-mail válido para receber este comprovante.',
  withdrawal_email_send_failed: 'Não conseguimos enviar o comprovante agora. Tente novamente em alguns instantes.',
  plan_change_not_enabled: 'A troca de plano está temporariamente indisponível enquanto finalizamos uma atualização de segurança.',
  invalid_plan_change_request: 'Não conseguimos identificar esta troca de plano. Recarregue a página e tente novamente.',
  plan_change_contract_version_outdated: 'Os documentos desta contratação foram atualizados. Recarregue a página antes de continuar.',
  plan_change_subscription_not_found: 'Não encontramos uma assinatura ativa para esta troca.',
  plan_change_monthly_subscription_required: 'A troca para anual está disponível somente para uma assinatura mensal ativa.',
  plan_change_renewal_already_canceled: 'Sua renovação já foi cancelada. O plano anual poderá ser escolhido ao fim do período atual.',
  plan_change_request_in_progress: 'Uma troca de plano já está sendo preparada. Aguarde alguns segundos.',
  plan_change_request_not_open: 'Esta solicitação de troca não está mais disponível. Recarregue a página e tente novamente.',
  plan_change_subscription_mismatch: 'Não conseguimos confirmar a assinatura atual. Nenhuma alteração foi feita.',
  plan_change_subscription_unsupported: 'Esta assinatura não pode ser alterada automaticamente. Fale com o suporte para análise.',
  plan_change_period_unavailable: 'O período atual está sendo atualizado. Aguarde alguns instantes e tente novamente.',
  plan_change_conflict: 'Já existe uma alteração agendada para esta assinatura. Recarregue a página para ver os detalhes.',
  plan_change_schedule_mismatch: 'Não conseguimos preparar a troca com segurança. Nenhuma cobrança foi criada.',
  plan_change_mode_mismatch: 'Os dados desta assinatura não correspondem a este ambiente. Nenhuma alteração foi feita.',
  plan_change_not_scheduled: 'Não há uma troca de plano agendada para desfazer.',
  plan_change_not_reversible: 'Esta troca já está em andamento ou foi concluída. Recarregue a página para ver o plano atual.',
};

export const isBillingError = (error: unknown, code: keyof typeof errorMessages) =>
  error instanceof Error && error.message === errorMessages[code];

const fallbackBillingMessage =
  'Não foi possível concluir esta ação agora. Nenhuma alteração foi feita. Tente novamente em alguns instantes.';

/**
 * Edge Functions return only allowlisted domain messages. Network and browser
 * errors, however, must never be rendered directly because they can disclose
 * provider, CORS or infrastructure details to the customer.
 */
export const getSafeBillingErrorMessage = (error: unknown, fallback = fallbackBillingMessage) => {
  const candidate = error instanceof Error ? error.message : '';
  return Object.values(errorMessages).includes(candidate) ? candidate : fallback;
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
  throw new Error(errorMessages[code] ?? fallbackBillingMessage);
};

export const getStripeCatalog = async (): Promise<BillingCatalogPlan[]> => {
  const response = await invokeBillingFunction<{ plans: BillingCatalogPlan[] }>('stripe-catalog');
  return response.plans;
};

export const createStripeCheckout = async (
  plan: BillingPlanCode,
  requestId: string,
) =>
  invokeBillingFunction<{ clientSecret: string; requestId: string; reused: boolean }>('stripe-create-checkout', {
    plan,
    requestId,
  });

export const createStripePortal = async () =>
  invokeBillingFunction<{ url: string }>('stripe-create-portal');

export const acceptStripeContract = async (requestId: string) =>
  invokeBillingFunction<{ accepted: boolean; reused: boolean }>('stripe-accept-contract', {
    requestId,
    ...billingContractVersions,
  });

export const requestStripeWithdrawal = async (requestId: string) =>
  invokeBillingFunction<BillingWithdrawalResult>('stripe-request-withdrawal', { requestId });

export const ensureStripeWithdrawalResultEmail = async () =>
  invokeBillingFunction<BillingWithdrawalEmailResult>('stripe-request-withdrawal', {
    action: 'ensure_result_email',
  });

export type BillingPlanChangeResult = {
  scheduled: boolean;
  reused?: boolean;
  effectiveAt: string;
};

export const scheduleStripeAnnualPlanChange = (requestId: string) =>
  invokeBillingFunction<BillingPlanChangeResult>('stripe-schedule-plan-change', {
    action: 'schedule_annual',
    requestId,
    ...billingContractVersions,
  });

export const cancelStripeScheduledPlanChange = () =>
  invokeBillingFunction<BillingPlanChangeResult>('stripe-schedule-plan-change', {
    action: 'cancel_scheduled_change',
  });

export const getStripeInvoiceHistory = async (): Promise<BillingInvoiceHistoryItem[]> => {
  const response = await invokeBillingFunction<{ invoices: BillingInvoiceHistoryItem[] }>(
    'stripe-invoice-history',
  );
  return response.invoices;
};

export const getConfiguredStripeLivemode = () => {
  const explicit = import.meta.env.VITE_STRIPE_LIVEMODE?.trim().toLowerCase();
  if (explicit === 'true' || explicit === 'false') return explicit === 'true';

  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
  if (publishableKey?.startsWith('pk_live_')) return true;
  if (publishableKey?.startsWith('pk_test_')) return false;

  throw new Error('billing_mode_not_configured');
};

export const getStripeBillingOverview = async (): Promise<BillingOverview> => {
  // Keep the client mode explicit so a Live frontend can never read Test
  // billing rows (and vice versa) after the deployment switch.
  const data = await invokeUserRpc<BillingOverview>('get_stripe_billing_overview', {
    p_livemode: getConfiguredStripeLivemode(),
  });

  if (!data) throw new Error('Nenhuma informação de assinatura foi encontrada.');
  return data;
};

export const formatBillingPrice = (amountCents: number, currency: string) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
