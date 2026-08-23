-- Private ledger for invitation-only affiliate codes.
-- Stripe remains the only authority for discounts and collected amounts.
-- Browser roles never read or mutate these tables directly; the owner-only
-- admin Edge Function returns a sanitized projection.

CREATE TABLE public.billing_affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 120),
  code text NOT NULL CHECK (code ~ '^[A-Z0-9][A-Z0-9-]{2,31}$'),
  stripe_coupon_id text NOT NULL,
  stripe_promotion_code_id text NOT NULL,
  discount_percent smallint NOT NULL DEFAULT 20
    CHECK (discount_percent BETWEEN 1 AND 100),
  commission_percent smallint NOT NULL DEFAULT 30
    CHECK (commission_percent BETWEEN 1 AND 100),
  livemode boolean NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX billing_affiliates_code_mode_key
  ON public.billing_affiliates (lower(code), livemode);

CREATE UNIQUE INDEX billing_affiliates_promotion_mode_key
  ON public.billing_affiliates (stripe_promotion_code_id, livemode);

CREATE TABLE public.billing_affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL
    REFERENCES public.billing_affiliates(id) ON DELETE RESTRICT,
  livemode boolean NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  conversion_count integer NOT NULL CHECK (conversion_count > 0),
  payment_reference text CHECK (
    payment_reference IS NULL OR char_length(payment_reference) <= 160
  ),
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);

CREATE TABLE public.billing_affiliate_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL
    REFERENCES public.billing_affiliates(id) ON DELETE RESTRICT,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  billing_subscription_id uuid
    REFERENCES public.billing_subscriptions(id) ON DELETE SET NULL,
  payout_id uuid
    REFERENCES public.billing_affiliate_payouts(id) ON DELETE SET NULL,
  stripe_invoice_id text NOT NULL,
  stripe_checkout_session_id text,
  plan_code text NOT NULL CHECK (plan_code IN ('monthly', 'annual')),
  gross_amount_cents integer NOT NULL CHECK (gross_amount_cents >= 0),
  discount_amount_cents integer NOT NULL CHECK (discount_amount_cents >= 0),
  paid_amount_cents integer NOT NULL CHECK (paid_amount_cents >= 0),
  commission_percent smallint NOT NULL CHECK (commission_percent BETWEEN 1 AND 100),
  commission_amount_cents integer NOT NULL CHECK (commission_amount_cents >= 0),
  currency text NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'refunded', 'disputed', 'paid')
  ),
  paid_at timestamptz NOT NULL,
  eligible_at timestamptz NOT NULL,
  provider_updated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (eligible_at >= paid_at)
);

-- Stripe invoice ids are unique across the account and differ between Test and
-- Live. The affiliate relation additionally enforces the financial mode.
CREATE UNIQUE INDEX billing_affiliate_conversions_invoice_key
  ON public.billing_affiliate_conversions (stripe_invoice_id);

CREATE INDEX billing_affiliate_conversions_affiliate_paid_idx
  ON public.billing_affiliate_conversions (affiliate_id, paid_at DESC);

CREATE INDEX billing_affiliate_conversions_payout_ready_idx
  ON public.billing_affiliate_conversions (affiliate_id, eligible_at, paid_at)
  WHERE status = 'pending' AND payout_id IS NULL;

ALTER TABLE public.billing_affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_affiliate_payouts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.billing_affiliates FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.billing_affiliate_conversions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.billing_affiliate_payouts FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.billing_affiliates TO service_role;
GRANT ALL ON TABLE public.billing_affiliate_conversions TO service_role;
GRANT ALL ON TABLE public.billing_affiliate_payouts TO service_role;

CREATE TRIGGER billing_affiliates_set_updated_at
BEFORE UPDATE ON public.billing_affiliates
FOR EACH ROW EXECUTE FUNCTION private.set_billing_updated_at();

CREATE TRIGGER billing_affiliate_conversions_set_updated_at
BEFORE UPDATE ON public.billing_affiliate_conversions
FOR EACH ROW EXECUTE FUNCTION private.set_billing_updated_at();

-- Atomically closes one manual Pix payout. Only confirmed conversions whose
-- legal hold has ended can enter the batch. Refunds and disputes are excluded.
CREATE OR REPLACE FUNCTION public.record_billing_affiliate_payout(
  p_affiliate_id uuid,
  p_livemode boolean,
  p_period_start date,
  p_period_end date,
  p_payment_reference text,
  p_created_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  payout_record public.billing_affiliate_payouts%ROWTYPE;
  conversion_ids uuid[];
  total_cents integer;
BEGIN
  IF p_period_end < p_period_start THEN
    RAISE EXCEPTION 'invalid_payout_period' USING ERRCODE = '22023';
  END IF;

  WITH locked_conversions AS (
    SELECT conversion.id, conversion.paid_at, conversion.commission_amount_cents
    FROM public.billing_affiliate_conversions AS conversion
    JOIN public.billing_affiliates AS affiliate
      ON affiliate.id = conversion.affiliate_id
    WHERE conversion.affiliate_id = p_affiliate_id
      AND affiliate.livemode = p_livemode
      AND conversion.status = 'pending'
      AND conversion.payout_id IS NULL
      AND conversion.eligible_at <= now()
      AND (conversion.paid_at AT TIME ZONE 'America/Sao_Paulo')::date
        BETWEEN p_period_start AND p_period_end
    FOR UPDATE OF conversion
  )
  SELECT
    array_agg(locked.id ORDER BY locked.paid_at),
    sum(locked.commission_amount_cents)::integer
  INTO conversion_ids, total_cents
  FROM locked_conversions AS locked;

  IF conversion_ids IS NULL OR total_cents IS NULL OR total_cents <= 0 THEN
    RAISE EXCEPTION 'no_eligible_affiliate_conversions' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.billing_affiliate_payouts (
    affiliate_id,
    livemode,
    period_start,
    period_end,
    amount_cents,
    conversion_count,
    payment_reference,
    created_by
  )
  VALUES (
    p_affiliate_id,
    p_livemode,
    p_period_start,
    p_period_end,
    total_cents,
    cardinality(conversion_ids),
    nullif(trim(p_payment_reference), ''),
    p_created_by
  )
  RETURNING * INTO payout_record;

  UPDATE public.billing_affiliate_conversions
  SET status = 'paid', payout_id = payout_record.id
  WHERE id = ANY(conversion_ids);

  RETURN jsonb_build_object(
    'id', payout_record.id,
    'amount_cents', payout_record.amount_cents,
    'conversion_count', payout_record.conversion_count,
    'paid_at', payout_record.paid_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_billing_affiliate_payout(
  uuid, boolean, date, date, text, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_billing_affiliate_payout(
  uuid, boolean, date, date, text, uuid
) TO service_role;
