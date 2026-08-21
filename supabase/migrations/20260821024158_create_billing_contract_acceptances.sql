-- Versioned proof of the commercial terms shown immediately before a Stripe
-- Checkout confirmation. The browser never reads or writes this table
-- directly; authenticated Edge Functions own the complete mutation path.

CREATE TABLE public.billing_contract_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  checkout_attempt_id uuid NOT NULL UNIQUE
    REFERENCES public.billing_checkout_attempts(id) ON DELETE RESTRICT,
  livemode boolean NOT NULL,
  plan_code text NOT NULL CHECK (plan_code IN ('monthly', 'annual')),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
  billing_interval text NOT NULL CHECK (billing_interval IN ('month', 'year')),
  terms_version text NOT NULL CHECK (length(terms_version) BETWEEN 1 AND 80),
  privacy_version text NOT NULL CHECK (length(privacy_version) BETWEEN 1 AND 80),
  refund_policy_version text NOT NULL
    CHECK (length(refund_policy_version) BETWEEN 1 AND 80),
  terms_sha256 text NOT NULL CHECK (terms_sha256 ~ '^[a-f0-9]{64}$'),
  refund_policy_sha256 text NOT NULL
    CHECK (refund_policy_sha256 ~ '^[a-f0-9]{64}$'),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  contracted_at timestamptz,
  withdrawal_deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (contracted_at IS NULL AND withdrawal_deadline IS NULL)
    OR (
      contracted_at IS NOT NULL
      AND withdrawal_deadline IS NOT NULL
      AND withdrawal_deadline > contracted_at
    )
  )
);

CREATE INDEX billing_contract_acceptances_user_created_idx
  ON public.billing_contract_acceptances (user_id, created_at DESC);

CREATE INDEX billing_contract_acceptances_deadline_idx
  ON public.billing_contract_acceptances (withdrawal_deadline)
  WHERE contracted_at IS NOT NULL;

ALTER TABLE public.billing_contract_acceptances ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.billing_contract_acceptances
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.billing_contract_acceptances TO service_role;

CREATE TRIGGER billing_contract_acceptances_set_updated_at
BEFORE UPDATE ON public.billing_contract_acceptances
FOR EACH ROW EXECUTE FUNCTION private.set_billing_updated_at();
