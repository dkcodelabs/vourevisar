-- Auditable saga for the consumer-withdrawal flow. Browser roles cannot read
-- or mutate provider identifiers; only service-role Edge Functions own it.

CREATE TABLE public.billing_refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  billing_subscription_id uuid NOT NULL
    REFERENCES public.billing_subscriptions(id) ON DELETE RESTRICT,
  billing_contract_acceptance_id uuid NOT NULL UNIQUE
    REFERENCES public.billing_contract_acceptances(id) ON DELETE RESTRICT,
  livemode boolean NOT NULL,
  request_reason text NOT NULL DEFAULT 'consumer_withdrawal'
    CHECK (request_reason = 'consumer_withdrawal'),
  eligibility_started_at timestamptz NOT NULL,
  eligibility_deadline timestamptz NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
  stripe_invoice_id text,
  stripe_payment_intent_id text,
  stripe_refund_id text,
  status text NOT NULL DEFAULT 'requested' CHECK (
    status IN (
      'requested',
      'processing',
      'pending',
      'succeeded',
      'failed',
      'manual_review',
      'rejected'
    )
  ),
  subscription_cancel_status text NOT NULL DEFAULT 'pending' CHECK (
    subscription_cancel_status IN ('pending', 'succeeded', 'failed')
  ),
  processing_started_at timestamptz,
  processing_attempts integer NOT NULL DEFAULT 0 CHECK (processing_attempts >= 0),
  last_stripe_event_created_at timestamptz,
  error_code text CHECK (error_code IS NULL OR length(error_code) <= 250),
  received_email_sent_at timestamptz,
  result_email_sent_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (eligibility_deadline > eligibility_started_at)
);

CREATE INDEX billing_refund_requests_user_created_idx
  ON public.billing_refund_requests (user_id, created_at DESC);

CREATE UNIQUE INDEX billing_refund_requests_invoice_mode_key
  ON public.billing_refund_requests (livemode, stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

CREATE UNIQUE INDEX billing_refund_requests_payment_intent_mode_key
  ON public.billing_refund_requests (livemode, stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE UNIQUE INDEX billing_refund_requests_refund_mode_key
  ON public.billing_refund_requests (livemode, stripe_refund_id)
  WHERE stripe_refund_id IS NOT NULL;

CREATE INDEX billing_refund_requests_operational_idx
  ON public.billing_refund_requests (status, updated_at)
  WHERE status IN ('requested', 'processing', 'pending', 'failed', 'manual_review');

ALTER TABLE public.billing_refund_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.billing_refund_requests
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.billing_refund_requests TO service_role;

CREATE TRIGGER billing_refund_requests_set_updated_at
BEFORE UPDATE ON public.billing_refund_requests
FOR EACH ROW EXECUTE FUNCTION private.set_billing_updated_at();

CREATE OR REPLACE FUNCTION public.claim_billing_refund_request(
  p_refund_request_id uuid,
  p_user_id uuid,
  p_livemode boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claimed_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.billing_refund_requests
  SET
    status = 'processing',
    processing_started_at = now(),
    processing_attempts = processing_attempts + 1,
    error_code = NULL
  WHERE id = p_refund_request_id
    AND user_id = p_user_id
    AND livemode = p_livemode
    AND (
      status = 'requested'
      OR (
        status = 'processing'
        AND processing_started_at < now() - interval '5 minutes'
      )
    )
  RETURNING id INTO claimed_id;

  RETURN claimed_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_billing_refund_request(uuid, uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_billing_refund_request(uuid, uuid, boolean)
  TO service_role;
