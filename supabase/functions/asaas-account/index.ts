import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type AccountRequest = {
  action?: string;
};

type UserSubscriptionRow = {
  plan: string | null;
  status: string | null;
  billing_type: string | null;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
  asaas_payment_id: string | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  next_billing_date: string | null;
  last_payment_at: string | null;
  scheduled_plan: string | null;
  scheduled_plan_at: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  manual_access_until: string | null;
  manual_access_plan: string | null;
  manual_access_reason: string | null;
  manual_access_granted_at: string | null;
};

type AsaasSubscriptionResponse = {
  status?: string;
  value?: number;
  cycle?: string;
  billingType?: string;
  nextDueDate?: string;
  creditCardNumber?: string;
  creditCardBrand?: string;
};

type AsaasPaymentResponse = {
  id?: string;
  dateCreated?: string;
  status?: string;
  value?: number;
  dueDate?: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  billingType?: string;
  creditCardNumber?: string;
  creditCardBrand?: string;
};

type AsaasPaymentsListResponse = {
  data?: AsaasPaymentResponse[];
};

type LocalSubscriptionStatus = 'trial' | 'active' | 'expired' | 'canceled' | 'suspended';
type SyncedAsaasSubscription = {
  status: string | null;
  cycle: string | null;
  billingType: string | null;
  nextDueDate: string | null;
};
type SyncedAsaasPayment = {
  id?: string | null;
  dateCreated: string | null;
  status: string | null;
  dueDate: string | null;
  paymentDate: string | null;
  clientPaymentDate: string | null;
};
type SubscriptionUpdatePayload = {
  plan?: string | null;
  status?: string | null;
  billing_type?: string | null;
  asaas_payment_id?: string | null;
  subscription_started_at?: string | null;
  next_billing_date?: string | null;
  last_payment_at?: string | null;
  updated_at: string;
  cancel_at_period_end?: boolean;
  canceled_at?: string | null;
  subscription_ends_at?: string | null;
  scheduled_plan?: string | null;
  scheduled_plan_at?: string | null;
};
type SubscriptionUpdateQuery = PromiseLike<{ error: Error | null }> & {
  eq: (column: string, value: string) => SubscriptionUpdateQuery;
};
type SupabaseSubscriptionSyncClient = {
  from: (table: 'user_subscriptions') => {
    update: (payload: SubscriptionUpdatePayload) => SubscriptionUpdateQuery;
  };
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ success: false, error: 'Nao autorizado' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Configuracao Supabase ausente');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (userError || !user) return json({ success: false, error: 'Sessao invalida' }, 401);

    const body = (await req.json().catch(() => ({}))) as AccountRequest;
    if (body.action !== 'get_account_subscription' && body.action !== 'cancel_renewal') {
      return json({ success: false, error: 'Acao de conta nao permitida' }, 400);
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select([
        'plan',
        'status',
        'billing_type',
        'asaas_customer_id',
        'asaas_subscription_id',
        'asaas_payment_id',
        'subscription_started_at',
        'subscription_ends_at',
        'trial_started_at',
        'trial_ends_at',
        'next_billing_date',
        'last_payment_at',
        'scheduled_plan',
        'scheduled_plan_at',
        'cancel_at_period_end',
        'canceled_at',
        'created_at',
        'updated_at',
        'manual_access_until',
        'manual_access_plan',
        'manual_access_reason',
        'manual_access_granted_at',
      ].join(', '))
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle<UserSubscriptionRow>();

    if (subscriptionError) {
      return json({ success: false, error: subscriptionError.message }, 400);
    }

    if (body.action === 'cancel_renewal') {
      if (!subscription) return json({ success: false, error: 'Assinatura não encontrada' }, 404);
      return await cancelRenewal(supabase, user.id, subscription);
    }

    const asaas = await loadAsaasData(subscription);
    let localSubscription = subscription ? mapLocalSubscription(subscription) : null;

    if (subscription && asaas.available && asaas.subscription) {
      const syncedSubscription = mergeLocalSubscriptionFromAsaas(subscription, asaas.subscription, asaas.payments);
      await syncLocalSubscriptionFromAsaas(supabase, user.id, syncedSubscription);
      localSubscription = mapLocalSubscription(syncedSubscription);
    }

    return json({
      success: true,
      data: {
        subscription: localSubscription,
        asaas,
      },
    });
  } catch (error) {
    console.error('[asaas-account]', error);
    const message = error instanceof Error ? error.message : 'Erro interno';
    return json({ success: false, error: message }, 500);
  }
});

async function loadAsaasData(subscription: UserSubscriptionRow | null) {
  if (!subscription?.asaas_subscription_id && !subscription?.asaas_payment_id) {
    return unavailable('asaas_not_linked');
  }

  const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
  if (!asaasApiKey) {
    return unavailable('asaas_not_configured');
  }

  const asaasUrl = Deno.env.get('ASAAS_API_URL') || 'https://api-sandbox.asaas.com/v3';
  const headers = {
    accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'vourevisar/1.0 (Supabase Edge Function; sandbox)',
    access_token: asaasApiKey,
  };

  try {
    if (!subscription.asaas_subscription_id && subscription.asaas_payment_id) {
      const paymentResponse = await fetch(`${asaasUrl}/payments/${subscription.asaas_payment_id}`, { headers });
      if (!paymentResponse.ok) return unavailable('asaas_payment_not_found');
      const payment = await paymentResponse.json() as AsaasPaymentResponse;
      return {
        available: true,
        subscription: null,
        payments: [{
          id: String(payment.id ?? subscription.asaas_payment_id),
          dateCreated: payment.dateCreated ?? null,
          status: payment.status ?? null,
          value: typeof payment.value === 'number' ? payment.value : null,
          dueDate: payment.dueDate ?? null,
          paymentDate: payment.paymentDate ?? null,
          clientPaymentDate: payment.clientPaymentDate ?? null,
          billingType: payment.billingType ?? null,
          creditCardLast4: payment.creditCardNumber?.slice(-4) ?? null,
          creditCardBrand: payment.creditCardBrand ?? null,
        }],
      };
    }
    const subscriptionResponse = await fetch(`${asaasUrl}/subscriptions/${subscription.asaas_subscription_id}`, { headers });

    if (!subscriptionResponse.ok) {
      console.error('[asaas-account] Asaas request failed', {
        subscriptionStatus: subscriptionResponse.status,
      });
      return unavailable('asaas_http_error');
    }

    const asaasSubscription = (await subscriptionResponse.json()) as AsaasSubscriptionResponse;
    const paymentsResponse = await fetch(`${asaasUrl}/subscriptions/${subscription.asaas_subscription_id}/payments`, { headers });
    let payments: AsaasPaymentResponse[] = [];

    if (paymentsResponse.ok) {
      const paymentsList = (await paymentsResponse.json()) as AsaasPaymentsListResponse;
      payments = Array.isArray(paymentsList.data) ? paymentsList.data.slice(0, 5) : [];
    } else {
      console.error('[asaas-account] Asaas payments request failed', {
        paymentsStatus: paymentsResponse.status,
      });
    }

    const latestCardPayment = payments.find((payment) => payment.creditCardNumber);

    return {
      available: true,
      subscription: {
        status: asaasSubscription.status ?? null,
        value: typeof asaasSubscription.value === 'number' ? asaasSubscription.value : null,
        cycle: asaasSubscription.cycle ?? null,
        billingType: asaasSubscription.billingType ?? null,
        nextDueDate: asaasSubscription.nextDueDate ?? null,
        creditCardLast4: asaasSubscription.creditCardNumber?.slice(-4) ?? latestCardPayment?.creditCardNumber?.slice(-4) ?? null,
        creditCardBrand: asaasSubscription.creditCardBrand ?? latestCardPayment?.creditCardBrand ?? null,
      },
      payments: payments.map((payment) => ({
          id: String(payment.id ?? crypto.randomUUID()),
          dateCreated: payment.dateCreated ?? null,
          status: payment.status ?? null,
          value: typeof payment.value === 'number' ? payment.value : null,
          dueDate: payment.dueDate ?? null,
          paymentDate: payment.paymentDate ?? null,
          clientPaymentDate: payment.clientPaymentDate ?? null,
          billingType: payment.billingType ?? null,
          creditCardLast4: payment.creditCardNumber?.slice(-4) ?? null,
          creditCardBrand: payment.creditCardBrand ?? null,
        })),
    };
  } catch (error) {
    console.error('[asaas-account] Asaas fetch failed', error);
    return unavailable('asaas_request_failed');
  }
}

function mapLocalSubscription(subscription: UserSubscriptionRow) {
  return {
    plan: subscription.plan,
    status: subscription.status,
    billingType: subscription.billing_type,
    subscriptionStartedAt: subscription.subscription_started_at,
    subscriptionEndsAt: subscription.subscription_ends_at,
    trialStartedAt: subscription.trial_started_at,
    trialEndsAt: subscription.trial_ends_at,
    nextBillingDate: subscription.next_billing_date,
    lastPaymentAt: subscription.last_payment_at,
    scheduledPlan: subscription.scheduled_plan,
    scheduledPlanAt: subscription.scheduled_plan_at,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at,
    asaasPaymentId: subscription.asaas_payment_id,
    manualAccessUntil: subscription.manual_access_until,
    manualAccessPlan: subscription.manual_access_plan,
    manualAccessReason: subscription.manual_access_reason,
    manualAccessGrantedAt: subscription.manual_access_granted_at,
    createdAt: subscription.created_at,
    updatedAt: subscription.updated_at,
  };
}

function mergeLocalSubscriptionFromAsaas(
  subscription: UserSubscriptionRow,
  asaasSubscription: SyncedAsaasSubscription,
  payments: SyncedAsaasPayment[],
): UserSubscriptionRow {
  const paidPayment = payments
    .filter((payment) => payment.status === 'RECEIVED' || payment.status === 'CONFIRMED')
    .sort(comparePaymentRecency)[0];
  const latestRefund = payments
    .filter((payment) => payment.status === 'REFUNDED')
    .sort(comparePaymentRecency)[0];
  const latestSuccessfulPayment = payments
    .filter((payment) => payment.status === 'RECEIVED' || payment.status === 'CONFIRMED')
    .sort(comparePaymentRecency)[0];
  const currentPaymentIsRefunded = !subscription.asaas_payment_id ||
    latestRefund?.id === subscription.asaas_payment_id;
  const newerSuccessfulPaymentExists = Boolean(
    latestRefund &&
    latestSuccessfulPayment &&
    comparePaymentRecency(latestSuccessfulPayment, latestRefund) < 0,
  );
  const refundRevokesAccess = Boolean(
    latestRefund &&
    currentPaymentIsRefunded &&
    !newerSuccessfulPaymentExists,
  );
  const paidPlan = mapAsaasCycleToPlan(asaasSubscription.cycle) ?? subscription.plan;
  const hasAutomaticRenewal = (asaasSubscription.billingType ?? subscription.billing_type)?.toUpperCase() === 'CREDIT_CARD';
  const renewalCanceled = subscription.cancel_at_period_end || asaasSubscription.status === 'INACTIVE';
  const paidAt = paidPayment?.paymentDate ?? paidPayment?.clientPaymentDate ?? paidPayment?.dueDate;
  const paidPeriodEndFromPayment = paidAt && paidPlan
    ? calculatePaidPeriodEnd(paidAt, paidPlan)
    : subscription.subscription_ends_at;
  const paidPeriodEnd = refundRevokesAccess
    ? new Date().toISOString()
    : paidPayment
      ? hasAutomaticRenewal
        ? asaasSubscription.nextDueDate ?? paidPeriodEndFromPayment
        : paidPeriodEndFromPayment
      : subscription.subscription_ends_at;
  const hasPaidPeriod = Boolean(
    paidPayment &&
    paidPeriodEnd &&
    new Date(paidPeriodEnd).getTime() > Date.now(),
  );
  const localStatus = refundRevokesAccess
    ? 'canceled'
    : hasPaidPeriod
    ? 'active'
    : subscription.cancel_at_period_end || asaasSubscription.status === 'INACTIVE'
      ? 'canceled'
      : mapAsaasStatusToLocal(asaasSubscription.status) ?? subscription.status;
  const lastPaymentAt = getMostRecentPaymentDate(payments) ?? subscription.last_payment_at;

  return {
    ...subscription,
    plan: paidPlan,
    status: localStatus,
    billing_type: asaasSubscription.billingType ?? subscription.billing_type,
    asaas_payment_id: paidPayment?.id ?? subscription.asaas_payment_id,
    next_billing_date: refundRevokesAccess || renewalCanceled || !hasAutomaticRenewal
      ? null
      : asaasSubscription.nextDueDate ?? subscription.next_billing_date,
    subscription_started_at: hasPaidPeriod
      ? paidPayment?.paymentDate ?? subscription.subscription_started_at
      : subscription.subscription_started_at,
    subscription_ends_at: paidPeriodEnd,
    last_payment_at: lastPaymentAt,
    cancel_at_period_end: renewalCanceled || refundRevokesAccess,
    canceled_at: refundRevokesAccess ? subscription.canceled_at ?? new Date().toISOString() : renewalCanceled ? subscription.canceled_at : null,
    scheduled_plan: renewalCanceled || refundRevokesAccess ? null : hasPaidPeriod ? null : subscription.scheduled_plan,
    scheduled_plan_at: renewalCanceled || refundRevokesAccess ? null : hasPaidPeriod ? null : subscription.scheduled_plan_at,
  };
}

async function cancelRenewal(
  supabase: SupabaseSubscriptionSyncClient,
  userId: string,
  subscription: UserSubscriptionRow,
) {
  if (subscription.cancel_at_period_end) {
    return json({ success: true, alreadyCanceled: true });
  }
  if (!subscription.asaas_subscription_id) {
    return json({ success: true, alreadyCanceled: true, automaticRenewal: false });
  }
  if (subscription.status !== 'active') {
    return json({ success: false, error: 'Esta assinatura não possui renovação automática ativa.' }, 409);
  }

  const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
  if (!asaasApiKey) return json({ success: false, error: 'A integração de cobrança não está configurada.' }, 500);
  const asaasUrl = Deno.env.get('ASAAS_API_URL') || 'https://api-sandbox.asaas.com/v3';
  const headers = {
    accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'vourevisar/1.0 (Supabase Edge Function; sandbox)',
    access_token: asaasApiKey,
  };

  const currentResponse = await fetch(`${asaasUrl}/subscriptions/${subscription.asaas_subscription_id}`, { headers });
  const current = await currentResponse.json();
  if (!currentResponse.ok || current.status !== 'ACTIVE') {
    return json({ success: false, error: 'A assinatura não está ativa no Asaas. Atualize a página e tente novamente.' }, 409);
  }

  const endDate = current.nextDueDate || subscription.next_billing_date || subscription.subscription_ends_at;
  if (!endDate) return json({ success: false, error: 'Não foi possível identificar o fim do período pago.' }, 409);

  const updateResponse = await fetch(`${asaasUrl}/subscriptions/${subscription.asaas_subscription_id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ status: 'INACTIVE' }),
  });
  if (!updateResponse.ok) {
    console.error('[asaas-account] Failed to cancel renewal', updateResponse.status, await updateResponse.text());
    return json({ success: false, error: 'O Asaas não confirmou o cancelamento da renovação.' }, 502);
  }

  const canceledAt = new Date().toISOString();
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'active',
      cancel_at_period_end: true,
      canceled_at: canceledAt,
      subscription_ends_at: endDate,
      next_billing_date: null,
      updated_at: canceledAt,
    })
    .eq('user_id', userId)
    .eq('asaas_subscription_id', subscription.asaas_subscription_id);

  if (error) {
    console.error('[asaas-account] Failed to persist cancellation', error);
    const rollbackResponse = await fetch(`${asaasUrl}/subscriptions/${subscription.asaas_subscription_id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    if (!rollbackResponse.ok) console.error('[asaas-account] Failed to rollback Asaas cancellation');
    return json({ success: false, error: 'Não foi possível registrar o cancelamento. Nenhuma alteração foi mantida.' }, 500);
  }

  return json({ success: true, canceledAt, subscriptionEndsAt: endDate });
}

async function syncLocalSubscriptionFromAsaas(
  supabase: SupabaseSubscriptionSyncClient,
  userId: string,
  subscription: UserSubscriptionRow,
) {
  if (!subscription.asaas_subscription_id) return;

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      plan: subscription.plan,
      status: subscription.status,
      billing_type: subscription.billing_type,
      asaas_payment_id: subscription.asaas_payment_id,
      next_billing_date: subscription.next_billing_date,
      last_payment_at: subscription.last_payment_at,
      subscription_started_at: subscription.subscription_started_at,
      subscription_ends_at: subscription.subscription_ends_at,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at,
      scheduled_plan: subscription.scheduled_plan,
      scheduled_plan_at: subscription.scheduled_plan_at,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('asaas_subscription_id', subscription.asaas_subscription_id);

  if (error) {
    console.error('[asaas-account] Failed to sync local subscription from Asaas', error);
  }
}

function mapAsaasCycleToPlan(cycle?: string | null) {
  const normalizedCycle = cycle?.toUpperCase();
  if (normalizedCycle === 'YEARLY') return 'annual';
  if (normalizedCycle === 'MONTHLY') return 'monthly';
  return null;
}

function mapAsaasStatusToLocal(status?: string | null): LocalSubscriptionStatus | null {
  const normalizedStatus = status?.toUpperCase();
  if (!normalizedStatus) return null;

  const statusMap: Record<string, LocalSubscriptionStatus> = {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    INACTIVE: 'expired',
    EXPIRED: 'expired',
    CANCELED: 'canceled',
    CANCELLED: 'canceled',
  };

  return statusMap[normalizedStatus] ?? null;
}

function getMostRecentPaymentDate(payments: SyncedAsaasPayment[]) {
  return payments
    .filter((payment) => payment.status === 'RECEIVED' || payment.status === 'CONFIRMED')
    .map((payment) => payment.paymentDate ?? payment.clientPaymentDate ?? payment.dateCreated)
    .filter((paymentDate): paymentDate is string => Boolean(paymentDate))
    .sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function comparePaymentRecency(left: SyncedAsaasPayment, right: SyncedAsaasPayment) {
  const leftDate = getPaymentRecencyDate(left);
  const rightDate = getPaymentRecencyDate(right);
  return rightDate.localeCompare(leftDate);
}

function getPaymentRecencyDate(payment: SyncedAsaasPayment) {
  return payment.clientPaymentDate ?? payment.paymentDate ?? payment.dateCreated ?? payment.dueDate ?? '';
}

function calculatePaidPeriodEnd(start: string, plan: string) {
  const [year, month, day] = start.slice(0, 10).split('-').map(Number);
  const end = new Date(Date.UTC(year, month - 1, day));
  if (plan === 'annual') end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return end.toISOString().slice(0, 10);
}

function unavailable(reason: string) {
  return {
    available: false,
    unavailableReason: reason,
    subscription: null,
    payments: [],
  };
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
