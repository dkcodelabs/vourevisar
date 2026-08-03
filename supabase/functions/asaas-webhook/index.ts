import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
};

type SubscriptionRow = {
  user_id: string;
  plan: string | null;
  status: string | null;
  billing_type: string | null;
  asaas_subscription_id: string | null;
  asaas_payment_id: string | null;
  subscription_ends_at: string | null;
  next_billing_date: string | null;
  cancel_at_period_end: boolean;
  manual_access_until: string | null;
};

type AsaasSubscription = {
  id?: string;
  status?: string;
  cycle?: string;
  billingType?: string;
  nextDueDate?: string;
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const webhookToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!webhookToken || !supabaseUrl || !serviceRoleKey) throw new Error('Configurações de ambiente ausentes');
    if (req.headers.get('asaas-access-token') !== webhookToken) return new Response('Não autorizado', { status: 401 });

    const body = await req.json();
    const event = String(body.event ?? '');
    const payment = body.payment ?? {};
    const subscriptionPayload = body.subscription ?? {};
    const subscriptionId = payment.subscription ? String(payment.subscription) : subscriptionPayload.id ? String(subscriptionPayload.id) : null;
    const paymentId = payment.id ? String(payment.id) : null;
    if (!event || (!subscriptionId && !paymentId)) return new Response('Ignorado: evento sem cobrança vinculada', { status: 200 });

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const query = supabase.from('user_subscriptions').select('user_id, plan, status, billing_type, asaas_subscription_id, asaas_payment_id, subscription_ends_at, next_billing_date, cancel_at_period_end, manual_access_until');
    const { data: subscription, error } = await (subscriptionId
      ? query.eq('asaas_subscription_id', subscriptionId)
      : query.eq('asaas_payment_id', paymentId))
      .maybeSingle<SubscriptionRow>();
    if (error || !subscription) {
      console.error('[asaas-webhook] vínculo não encontrado', { event, subscriptionId, paymentId, error });
      return new Response('Vínculo não encontrado', { status: 200 });
    }

    const apiKey = Deno.env.get('ASAAS_API_KEY');
    const asaasUrl = Deno.env.get('ASAAS_API_URL') || 'https://api-sandbox.asaas.com/v3';
    const asaasSubscription = apiKey && subscriptionId ? await fetchSubscription(asaasUrl, apiKey, subscriptionId) : null;
    const billingType = payment.billingType || asaasSubscription?.billingType || subscription.billing_type || null;
    const plan = mapCycle(asaasSubscription?.cycle) || subscription.plan || 'monthly';
    const currentPaymentIsEntitlement = !subscription.asaas_payment_id || !paymentId || subscription.asaas_payment_id === paymentId;
    const update = (payload: Record<string, unknown>) => supabase.from('user_subscriptions').update(payload).eq('user_id', subscription.user_id);

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const paidAt = payment.clientPaymentDate || payment.paymentDate || new Date().toISOString();
      const periodEnd = billingType === 'CREDIT_CARD' && asaasSubscription?.nextDueDate
        ? asaasSubscription.nextDueDate
        : calculatePeriodEnd(payment.dueDate || paidAt, plan);
      const { error: updateError } = await update({
        asaas_payment_id: paymentId || subscription.asaas_payment_id,
        status: 'active',
        plan,
        billing_type: billingType,
        subscription_started_at: paidAt,
        subscription_ends_at: periodEnd,
        next_billing_date: billingType === 'CREDIT_CARD' && asaasSubscription ? periodEnd : null,
        last_payment_at: paidAt,
        cancel_at_period_end: false,
        canceled_at: null,
        updated_at: new Date().toISOString(),
      });
      if (updateError) throw updateError;
    } else if (event === 'PAYMENT_OVERDUE') {
      const { error: updateError } = await update({ status: 'suspended', updated_at: new Date().toISOString() });
      if (updateError) throw updateError;
    } else if (event === 'PAYMENT_REFUND_IN_PROGRESS' || event === 'PAYMENT_REFUND_DENIED' || event === 'PAYMENT_PARTIALLY_REFUNDED') {
      console.log('[asaas-webhook] estorno não revoga acesso neste estado', { event, paymentId });
    } else if (event === 'PAYMENT_REFUNDED' || event === 'PAYMENT_CHARGEBACK_REQUESTED' || event === 'PAYMENT_CHARGEBACK_DISPUTE') {
      if (currentPaymentIsEntitlement) {
        if (asaasSubscription?.status === 'ACTIVE' && apiKey && subscriptionId) {
          await deactivateAsaasSubscription(asaasUrl, apiKey, subscriptionId);
        }
        const { error: updateError } = await update({
          status: 'canceled',
          cancel_at_period_end: true,
          canceled_at: new Date().toISOString(),
          subscription_ends_at: new Date().toISOString(),
          next_billing_date: null,
          updated_at: new Date().toISOString(),
        });
        if (updateError) throw updateError;
      } else {
        console.log('[asaas-webhook] estorno antigo ignorado para preservar acesso válido', { paymentId });
      }
    } else if (event === 'SUBSCRIPTION_INACTIVATED' || event === 'SUBSCRIPTION_DELETED') {
      const periodEnd = subscription.subscription_ends_at || subscription.next_billing_date;
      const hasPaidAccess = Boolean(periodEnd && new Date(periodEnd).getTime() > Date.now());
      const { error: updateError } = await update({
        status: hasPaidAccess ? 'active' : 'canceled',
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
        next_billing_date: null,
        updated_at: new Date().toISOString(),
      });
      if (updateError) throw updateError;
    } else if (event === 'SUBSCRIPTION_UPDATED') {
      const { error: updateError } = await update({
        next_billing_date: asaasSubscription?.nextDueDate || subscription.next_billing_date,
        updated_at: new Date().toISOString(),
      });
      if (updateError) throw updateError;
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[asaas-webhook] erro', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchSubscription(url: string, apiKey: string, id: string): Promise<AsaasSubscription | null> {
  const response = await fetch(`${url}/subscriptions/${id}`, { headers: { accept: 'application/json', access_token: apiKey } });
  return response.ok ? await response.json() as AsaasSubscription : null;
}

async function deactivateAsaasSubscription(url: string, apiKey: string, id: string) {
  const response = await fetch(`${url}/subscriptions/${id}`, {
    method: 'PUT',
    headers: { accept: 'application/json', 'Content-Type': 'application/json', access_token: apiKey },
    body: JSON.stringify({ status: 'INACTIVE' }),
  });
  if (!response.ok) throw new Error('Não foi possível encerrar a recorrência após revogar o acesso.');
}

function mapCycle(cycle?: string | null) {
  if (cycle?.toUpperCase() === 'YEARLY') return 'annual' as const;
  if (cycle?.toUpperCase() === 'MONTHLY') return 'monthly' as const;
  return null;
}

function calculatePeriodEnd(start: string, plan: string) {
  const [year, month, day] = start.slice(0, 10).split('-').map(Number);
  const end = new Date(Date.UTC(year, month - 1, day));
  if (plan === 'annual') end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return end.toISOString().slice(0, 10);
}
