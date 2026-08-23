import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AffiliateConversionStatus = 'pending' | 'eligible' | 'refunded' | 'disputed' | 'paid';

export interface BillingAffiliate {
  id: string;
  name: string;
  code: string;
  discount_percent: number;
  commission_percent: number;
  active: boolean;
  created_at: string;
}

export interface BillingAffiliateConversion {
  id: string;
  affiliate_id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  plan_code: 'monthly' | 'annual';
  gross_amount_cents: number;
  discount_amount_cents: number;
  paid_amount_cents: number;
  commission_percent: number;
  commission_amount_cents: number;
  currency: string;
  status: Exclude<AffiliateConversionStatus, 'eligible'>;
  payout_status: AffiliateConversionStatus;
  paid_at: string;
  eligible_at: string;
  payout_id: string | null;
  created_at: string;
}

export interface BillingAffiliatePayout {
  id: string;
  affiliate_id: string;
  period_start: string;
  period_end: string;
  amount_cents: number;
  conversion_count: number;
  payment_reference: string | null;
  paid_at: string;
}

export interface AdminAffiliateLedger {
  livemode: boolean;
  policy: {
    discountPercent: number;
    commissionPercent: number;
    commissionScope: 'first_subscription_invoice';
  };
  affiliates: BillingAffiliate[];
  conversions: BillingAffiliateConversion[];
  payouts: BillingAffiliatePayout[];
}

type AdminAffiliateAction = 'list' | 'create' | 'set_active' | 'record_payout';

const messages: Record<string, string> = {
  authentication_required: 'Sua sessão expirou. Entre novamente para continuar.',
  invalid_session: 'Sua sessão expirou. Entre novamente para continuar.',
  owner_access_required: 'Esta área é exclusiva do proprietário.',
  invalid_affiliate_details: 'Informe um nome e um código de 3 a 32 caracteres, usando letras, números ou hífen.',
  invalid_affiliate_request_id: 'Não foi possível identificar esta criação. Tente novamente.',
  affiliate_code_already_exists: 'Este código já existe neste ambiente.',
  invalid_affiliate_status_request: 'Não foi possível alterar o código selecionado.',
  affiliate_not_found: 'O divulgador não foi encontrado neste ambiente.',
  invalid_affiliate_payout_request: 'Confira o divulgador e o período do repasse.',
  no_eligible_affiliate_conversions: 'Não há comissões liberadas neste período.',
};

const invoke = async (action: AdminAffiliateAction, payload: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.functions.invoke<AdminAffiliateLedger>('admin-affiliates', {
    body: { action, ...payload },
  });
  if (!error && data) return data;

  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null) as { error?: string } | null;
    if (body?.error) {
      throw new Error(messages[body.error] ?? 'Não foi possível concluir a operação. Nenhuma cobrança foi alterada.');
    }
  }
  throw new Error('Não foi possível carregar os dados de divulgação. Tente novamente.');
};

export const listAdminAffiliateLedger = () => invoke('list');

export const createAdminAffiliate = (input: { name: string; code: string }) =>
  invoke('create', { ...input, requestId: crypto.randomUUID() });

export const setAdminAffiliateActive = (input: { affiliateId: string; active: boolean }) =>
  invoke('set_active', input);

export const recordAdminAffiliatePayout = (input: {
  affiliateId: string;
  periodStart: string;
  periodEnd: string;
  paymentReference: string;
}) => invoke('record_payout', input);
