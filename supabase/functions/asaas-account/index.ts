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
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  next_billing_date: string | null;
  last_payment_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type AsaasSubscriptionResponse = {
  status?: string;
  value?: number;
  cycle?: string;
  billingType?: string;
  nextDueDate?: string;
};

type AsaasPaymentResponse = {
  id?: string;
  status?: string;
  value?: number;
  dueDate?: string;
  paymentDate?: string;
  billingType?: string;
};

type AsaasPaymentsListResponse = {
  data?: AsaasPaymentResponse[];
};

type LocalSubscriptionStatus = 'trial' | 'active' | 'expired' | 'canceled' | 'suspended';
type SyncedAsaasSubscription = {
  status: string | null;
  billingType: string | null;
  nextDueDate: string | null;
};
type SyncedAsaasPayment = {
  status: string | null;
  paymentDate: string | null;
};
type SubscriptionUpdatePayload = {
  status: string | null;
  billing_type: string | null;
  next_billing_date: string | null;
  last_payment_at: string | null;
  updated_at: string;
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
    if (body.action !== 'get_account_subscription') {
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
        'subscription_started_at',
        'subscription_ends_at',
        'trial_started_at',
        'trial_ends_at',
        'next_billing_date',
        'last_payment_at',
        'created_at',
        'updated_at',
      ].join(', '))
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle<UserSubscriptionRow>();

    if (subscriptionError) {
      return json({ success: false, error: subscriptionError.message }, 400);
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
  if (!subscription?.asaas_subscription_id) {
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

    return {
      available: true,
      subscription: {
        status: asaasSubscription.status ?? null,
        value: typeof asaasSubscription.value === 'number' ? asaasSubscription.value : null,
        cycle: asaasSubscription.cycle ?? null,
        billingType: asaasSubscription.billingType ?? null,
        nextDueDate: asaasSubscription.nextDueDate ?? null,
      },
      payments: payments.map((payment) => ({
          id: String(payment.id ?? crypto.randomUUID()),
          status: payment.status ?? null,
          value: typeof payment.value === 'number' ? payment.value : null,
          dueDate: payment.dueDate ?? null,
          paymentDate: payment.paymentDate ?? null,
          billingType: payment.billingType ?? null,
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
    createdAt: subscription.created_at,
    updatedAt: subscription.updated_at,
  };
}

function mergeLocalSubscriptionFromAsaas(
  subscription: UserSubscriptionRow,
  asaasSubscription: SyncedAsaasSubscription,
  payments: SyncedAsaasPayment[],
): UserSubscriptionRow {
  const localStatus = mapAsaasStatusToLocal(asaasSubscription.status) ?? subscription.status;
  const lastPaymentAt = getMostRecentPaymentDate(payments) ?? subscription.last_payment_at;

  return {
    ...subscription,
    status: localStatus,
    billing_type: asaasSubscription.billingType ?? subscription.billing_type,
    next_billing_date: asaasSubscription.nextDueDate ?? subscription.next_billing_date,
    last_payment_at: lastPaymentAt,
  };
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
      status: subscription.status,
      billing_type: subscription.billing_type,
      next_billing_date: subscription.next_billing_date,
      last_payment_at: subscription.last_payment_at,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('asaas_subscription_id', subscription.asaas_subscription_id);

  if (error) {
    console.error('[asaas-account] Failed to sync local subscription from Asaas', error);
  }
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
    .map((payment) => payment.paymentDate)
    .filter((paymentDate): paymentDate is string => Boolean(paymentDate))
    .sort((left, right) => right.localeCompare(left))[0] ?? null;
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
