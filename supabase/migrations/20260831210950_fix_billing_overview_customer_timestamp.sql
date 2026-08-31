-- A customer update must not hide a valid active subscription.
-- Ownership and Stripe-mode filtering remain enforced inside the SECURITY DEFINER RPC.

CREATE OR REPLACE FUNCTION public.get_stripe_billing_overview(p_livemode boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  current_customer_id uuid;
  subscription_record public.billing_subscriptions%ROWTYPE;
  grant_record public.billing_access_grants%ROWTYPE;
  acceptance_record public.billing_contract_acceptances%ROWTYPE;
  refund_record public.billing_refund_requests%ROWTYPE;
  effective_plan text;
  effective_status text;
  effective_source text;
  effective_end timestamptz;
  subscription_effective_end timestamptz;
  is_active boolean := false;
  withdrawal_eligible boolean := false;
  withdrawal_canceled boolean := false;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT id
  INTO current_customer_id
  FROM public.billing_customers
  WHERE user_id = caller_id
    AND livemode = p_livemode
  LIMIT 1;

  SELECT subscription.*
  INTO subscription_record
  FROM public.billing_subscriptions AS subscription
  JOIN public.billing_customers AS customer
    ON customer.id = subscription.billing_customer_id
  WHERE subscription.user_id = caller_id
    AND customer.livemode = p_livemode
    AND subscription.billing_customer_id = current_customer_id
  ORDER BY
    CASE subscription.status
      WHEN 'active' THEN 1
      WHEN 'trialing' THEN 2
      WHEN 'past_due' THEN 3
      WHEN 'incomplete' THEN 4
      ELSE 5
    END,
    subscription.updated_at DESC
  LIMIT 1;

  IF subscription_record.id IS NOT NULL THEN
    subscription_effective_end := CASE
      WHEN subscription_record.cancel_at IS NOT NULL
        AND subscription_record.current_period_end IS NOT NULL
        THEN LEAST(subscription_record.cancel_at, subscription_record.current_period_end)
      ELSE COALESCE(subscription_record.cancel_at, subscription_record.current_period_end)
    END;

    SELECT acceptance.*
    INTO acceptance_record
    FROM public.billing_contract_acceptances AS acceptance
    WHERE acceptance.user_id = caller_id
      AND acceptance.livemode = p_livemode
      AND acceptance.billing_subscription_id = subscription_record.id
    ORDER BY acceptance.created_at DESC
    LIMIT 1;

    IF acceptance_record.id IS NOT NULL THEN
      SELECT refund.*
      INTO refund_record
      FROM public.billing_refund_requests AS refund
      WHERE refund.user_id = caller_id
        AND refund.livemode = p_livemode
        AND refund.billing_contract_acceptance_id = acceptance_record.id
      ORDER BY refund.created_at DESC
      LIMIT 1;

      withdrawal_canceled := refund_record.id IS NOT NULL
        AND refund_record.subscription_cancel_status = 'succeeded';
    END IF;
  END IF;

  SELECT access_grant.*
  INTO grant_record
  FROM public.billing_access_grants AS access_grant
  WHERE access_grant.user_id = caller_id
    AND access_grant.revoked_at IS NULL
    AND access_grant.starts_at <= now()
    AND access_grant.ends_at > now()
    AND NOT (
      access_grant.source = 'trial'
      AND subscription_record.id IS NOT NULL
      AND NOT withdrawal_canceled
    )
  ORDER BY
    CASE access_grant.source
      WHEN 'manual' THEN 1
      WHEN 'goodwill' THEN 2
      WHEN 'migration' THEN 3
      ELSE 4
    END,
    access_grant.ends_at DESC
  LIMIT 1;

  IF subscription_record.id IS NOT NULL
    AND NOT withdrawal_canceled
    AND subscription_record.status IN ('active', 'trialing', 'past_due')
    AND subscription_record.access_suspended_at IS NULL
    AND subscription_effective_end IS NOT NULL
    AND subscription_effective_end > now()
  THEN
    is_active := true;
    effective_plan := subscription_record.plan_code;
    effective_status := subscription_record.status;
    effective_source := 'stripe';
    effective_end := subscription_effective_end;
  ELSIF grant_record.id IS NOT NULL THEN
    is_active := true;
    effective_plan := grant_record.plan_code;
    effective_status := CASE
      WHEN grant_record.source = 'trial' THEN 'trial'
      ELSE 'active'
    END;
    effective_source := grant_record.source;
    effective_end := grant_record.ends_at;
  ELSE
    effective_plan := COALESCE(subscription_record.plan_code, 'free_trial');
    effective_status := CASE
      WHEN withdrawal_canceled THEN 'canceled'
      ELSE COALESCE(subscription_record.status, 'inactive')
    END;
    effective_source := CASE
      WHEN subscription_record.id IS NOT NULL THEN 'stripe'
      ELSE 'none'
    END;
    effective_end := CASE
      WHEN withdrawal_canceled THEN refund_record.requested_at
      ELSE subscription_effective_end
    END;
  END IF;

  withdrawal_eligible := effective_source = 'stripe'
    AND NOT withdrawal_canceled
    AND subscription_record.status IN ('active', 'trialing', 'past_due')
    AND acceptance_record.id IS NOT NULL
    AND acceptance_record.contracted_at IS NOT NULL
    AND acceptance_record.withdrawal_deadline IS NOT NULL
    AND now() >= acceptance_record.contracted_at
    AND now() <= acceptance_record.withdrawal_deadline
    AND refund_record.id IS NULL;

  RETURN jsonb_build_object(
    'is_active', is_active,
    'source', effective_source,
    'plan', effective_plan,
    'status', effective_status,
    'access_until', effective_end,
    'withdrawal', jsonb_build_object(
      'eligible', withdrawal_eligible,
      'deadline', acceptance_record.withdrawal_deadline,
      'status', refund_record.status,
      'requested_at', refund_record.requested_at,
      'result_at', refund_record.processed_at
    ),
    -- The historical subscription remains sanitized and read-only so the
    -- account can show its refunded financial history without presenting the
    -- old plan or card as the current source of access.
    'subscription', CASE
      WHEN subscription_record.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'plan', subscription_record.plan_code,
        'status', CASE
          WHEN withdrawal_canceled THEN 'canceled'
          ELSE subscription_record.status
        END,
        'amount_cents', subscription_record.amount_cents,
        'currency', subscription_record.currency,
        'billing_interval', subscription_record.billing_interval,
        'current_period_start', subscription_record.current_period_start,
        'current_period_end', subscription_record.current_period_end,
        'cancel_at_period_end', (
          withdrawal_canceled
          OR subscription_record.cancel_at_period_end
          OR subscription_record.cancel_at IS NOT NULL
        ),
        'cancel_at', CASE
          WHEN withdrawal_canceled THEN refund_record.requested_at
          ELSE subscription_record.cancel_at
        END,
        'canceled_at', COALESCE(
          subscription_record.canceled_at,
          CASE WHEN withdrawal_canceled THEN refund_record.requested_at ELSE NULL END
        ),
        'scheduled_plan', subscription_record.scheduled_plan_code,
        'card_brand', subscription_record.card_brand,
        'card_last4', subscription_record.card_last4,
        'access_suspended_at', subscription_record.access_suspended_at,
        'access_suspension_reason', subscription_record.access_suspension_reason,
        'updated_at', subscription_record.updated_at
      )
    END
  );
END;
$function$
