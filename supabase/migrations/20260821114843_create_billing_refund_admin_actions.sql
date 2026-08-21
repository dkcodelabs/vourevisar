-- Append-only operational audit for administrative reconciliation of consumer
-- withdrawal requests. It is intentionally private to service-role Edge
-- Functions: browser roles never receive Stripe identifiers or mutation access.

CREATE TABLE public.billing_refund_admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_request_id uuid NOT NULL UNIQUE,
  billing_refund_request_id uuid NOT NULL
    REFERENCES public.billing_refund_requests(id) ON DELETE RESTRICT,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  livemode boolean NOT NULL,
  action text NOT NULL DEFAULT 'reconcile'
    CHECK (action = 'reconcile'),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 10 AND 500),
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'succeeded', 'no_change', 'failed')),
  request_status_before text NOT NULL,
  request_status_after text,
  error_code text CHECK (error_code IS NULL OR length(error_code) <= 250),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX billing_refund_admin_actions_active_request_key
  ON public.billing_refund_admin_actions (billing_refund_request_id)
  WHERE status = 'processing';

CREATE INDEX billing_refund_admin_actions_created_idx
  ON public.billing_refund_admin_actions (created_at DESC);

ALTER TABLE public.billing_refund_admin_actions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.billing_refund_admin_actions
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.billing_refund_admin_actions TO service_role;
