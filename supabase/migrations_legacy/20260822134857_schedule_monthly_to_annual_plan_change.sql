-- A scheduled upgrade is a distinct contractual operation. Keep its audit
-- trail private and separate from checkout attempts and refund requests: it
-- changes an existing Stripe subscription instead of creating a new one.
CREATE TABLE public.billing_plan_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  billing_subscription_id uuid NOT NULL
    REFERENCES public.billing_subscriptions(id) ON DELETE RESTRICT,
  livemode boolean NOT NULL,
  from_plan_code text NOT NULL CHECK (from_plan_code = 'monthly'),
  to_plan_code text NOT NULL CHECK (to_plan_code = 'annual'),
  effective_at timestamptz NOT NULL,
  stripe_schedule_id text UNIQUE,
  status text NOT NULL DEFAULT 'creating' CHECK (
    status IN ('creating', 'scheduled', 'canceled', 'applied', 'failed')
  ),
  terms_version text NOT NULL CHECK (length(terms_version) BETWEEN 1 AND 80),
  privacy_version text NOT NULL CHECK (length(privacy_version) BETWEEN 1 AND 80),
  refund_policy_version text NOT NULL CHECK (length(refund_policy_version) BETWEEN 1 AND 80),
  terms_sha256 text NOT NULL CHECK (terms_sha256 ~ '^[a-f0-9]{64}$'),
  refund_policy_sha256 text NOT NULL CHECK (refund_policy_sha256 ~ '^[a-f0-9]{64}$'),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  scheduled_at timestamptz,
  canceled_at timestamptz,
  applied_at timestamptz,
  confirmation_email_sent_at timestamptz,
  error_code text CHECK (error_code IS NULL OR length(error_code) <= 250),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_at > created_at),
  CHECK (
    (status = 'scheduled' AND stripe_schedule_id IS NOT NULL AND scheduled_at IS NOT NULL)
    OR status <> 'scheduled'
  )
);

-- One future self-service change can own a subscription at a time. This is a
-- database backstop for double-clicks and retries; Stripe idempotency keys are
-- the corresponding provider-side backstop.
CREATE UNIQUE INDEX billing_plan_change_requests_one_open_subscription
  ON public.billing_plan_change_requests (billing_subscription_id)
  WHERE status IN ('creating', 'scheduled');

CREATE INDEX billing_plan_change_requests_user_created_idx
  ON public.billing_plan_change_requests (user_id, created_at DESC);

ALTER TABLE public.billing_plan_change_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.billing_plan_change_requests
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.billing_plan_change_requests TO service_role;

CREATE TRIGGER billing_plan_change_requests_set_updated_at
BEFORE UPDATE ON public.billing_plan_change_requests
FOR EACH ROW EXECUTE FUNCTION private.set_billing_updated_at();
