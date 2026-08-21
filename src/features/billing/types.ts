export type BillingPlanCode = 'monthly' | 'annual';

export interface BillingCatalogPlan {
  code: BillingPlanCode;
  name: string;
  amountCents: number;
  currency: string;
  interval: 'month' | 'year';
  metadata: Record<string, string>;
}

export interface BillingPricingPlanView {
  name: string;
  value: number;
  features: string[];
  badge: string | null;
}

export interface BillingPricingPlans {
  monthly: BillingPricingPlanView;
  annual: BillingPricingPlanView;
}

export interface BillingSubscription {
  plan: BillingPlanCode;
  status:
    | 'incomplete'
    | 'incomplete_expired'
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'unpaid'
    | 'paused';
  amount_cents: number;
  currency: string;
  billing_interval: 'month' | 'year';
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancel_at: string | null;
  canceled_at: string | null;
  scheduled_plan: BillingPlanCode | null;
  card_brand: string | null;
  card_last4: string | null;
  access_suspended_at: string | null;
  access_suspension_reason: string | null;
  updated_at: string;
}

export interface BillingWithdrawal {
    eligible: boolean;
    deadline: string | null;
    status:
      | 'requested'
      | 'processing'
      | 'pending'
      | 'succeeded'
      | 'failed'
      | 'manual_review'
      | 'rejected'
      | null;
    requested_at: string | null;
    result_at: string | null;
}

export interface BillingOverview {
  is_active: boolean;
  source: 'stripe' | 'trial' | 'manual' | 'goodwill' | 'none';
  plan: BillingPlanCode | 'free_trial';
  status: string;
  access_until: string | null;
  subscription: BillingSubscription | null;
  /** Optional during the coordinated backend/frontend rollout. */
  withdrawal?: BillingWithdrawal;
}

export interface BillingWithdrawalResult {
  received: boolean;
  reused: boolean;
  status: 'processing' | 'succeeded' | 'manual_review';
}

export interface BillingWithdrawalEmailResult {
  sent: boolean;
  alreadySent: boolean;
  status: 'processing' | 'succeeded' | 'manual_review';
}

/** Sanitized read-only history. It never exposes Stripe IDs or payment URLs. */
export interface BillingInvoiceHistoryItem {
  status: 'paid' | 'pending' | 'closed' | 'refund_pending' | 'refunded' | 'refund_attention';
  amount_cents: number;
  currency: string;
  occurred_at: string | null;
  status_at: string | null;
}
