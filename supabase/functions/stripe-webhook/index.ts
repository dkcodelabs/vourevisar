import Stripe from "npm:stripe@22.4.0";
import {
  createServiceClient,
  createStripeClient,
  fromUnixSeconds,
  getPlanFromPriceId,
  getStripeLivemode,
  jsonResponse,
  requireEnv,
  safeErrorCode,
  syncStripeCustomerDetails,
} from "../_shared/stripeBilling.ts";
import { sendSubscriptionConfirmation } from "../_shared/billingEmail.ts";

type ServiceClient = ReturnType<typeof createServiceClient>;

const getExpandableId = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") {
    return value.id;
  }
  return null;
};

const getInvoiceSubscriptionId = (invoice: Stripe.Invoice): string | null => {
  const candidate = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
    parent?: {
      subscription_details?: {
        subscription?: string | Stripe.Subscription | null;
      } | null;
    } | null;
  };

  return getExpandableId(candidate.parent?.subscription_details?.subscription)
    ?? getExpandableId(candidate.subscription);
};

const getChargeInvoiceId = (charge: Stripe.Charge) => {
  const candidate = charge as Stripe.Charge & {
    invoice?: string | Stripe.Invoice | null;
  };
  return getExpandableId(candidate.invoice);
};

const getPaymentIntentInvoiceId = (paymentIntent: Stripe.PaymentIntent) => {
  const candidate = paymentIntent as Stripe.PaymentIntent & {
    invoice?: string | Stripe.Invoice | null;
    payment_details?: {
      order_reference?: string | Stripe.Invoice | null;
    } | null;
  };
  return getExpandableId(candidate.invoice)
    ?? getExpandableId(candidate.payment_details?.order_reference);
};

const resolveChargeInvoiceId = async (stripe: Stripe, charge: Stripe.Charge) => {
  const chargeInvoiceId = getChargeInvoiceId(charge);
  if (chargeInvoiceId) return chargeInvoiceId;

  // Newer Stripe event payloads can omit Charge.invoice. The PaymentIntent
  // remains the stable path back to the invoice and its subscription.
  const paymentIntentId = getExpandableId(charge.payment_intent);
  if (!paymentIntentId) return null;

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return getPaymentIntentInvoiceId(paymentIntent);
};

const resolveBillingCustomer = async (
  supabase: ServiceClient,
  stripe: Stripe,
  stripeCustomerId: string,
  livemode: boolean,
  metadataUserId?: string | null,
) => {
  const { data: existing, error: existingError } = await supabase
    .from("billing_customers")
    .select("id,user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .eq("livemode", livemode)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const customer = await stripe.customers.retrieve(stripeCustomerId);
  if ("deleted" in customer && customer.deleted) {
    throw new Error("stripe_customer_deleted");
  }
  if (customer.livemode !== livemode) {
    throw new Error("stripe_customer_mode_mismatch");
  }

  const userId = metadataUserId || customer.metadata.supabase_user_id;
  if (!userId) throw new Error("stripe_customer_user_missing");

  const { data: inserted, error: insertError } = await supabase
    .from("billing_customers")
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        livemode,
      },
      { onConflict: "user_id,livemode" },
    )
    .select("id,user_id")
    .single();

  if (insertError) throw insertError;
  return inserted;
};

const syncSubscription = async (
  supabase: ServiceClient,
  stripe: Stripe,
  subscription: Stripe.Subscription,
  eventCreated: number,
  livemode: boolean,
) => {
  const item = subscription.items.data[0];
  if (!item) throw new Error("stripe_subscription_item_missing");

  const planCode = getPlanFromPriceId(item.price.id);
  if (!planCode) throw new Error("stripe_price_not_allowed");

  const eventCreatedAt = fromUnixSeconds(eventCreated);
  const { data: current, error: currentError } = await supabase
    .from("billing_subscriptions")
    .select("last_event_created_at")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (currentError) throw currentError;
  if (
    current?.last_event_created_at &&
    eventCreatedAt &&
    new Date(current.last_event_created_at).getTime() > new Date(eventCreatedAt).getTime()
  ) {
    return "ignored_out_of_order";
  }

  const stripeCustomerId = getExpandableId(subscription.customer);
  if (!stripeCustomerId) throw new Error("stripe_subscription_customer_missing");

  const customer = await resolveBillingCustomer(
    supabase,
    stripe,
    stripeCustomerId,
    livemode,
    subscription.metadata.supabase_user_id,
  );

  const paymentMethodId = getExpandableId(subscription.default_payment_method);
  let cardBrand: string | null = null;
  let cardLast4: string | null = null;

  if (paymentMethodId) {
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.type === "card" && paymentMethod.card) {
      cardBrand = paymentMethod.card.brand;
      cardLast4 = paymentMethod.card.last4;
    }
  }

  // Keep the Stripe Customer aligned with the real account data. This is
  // deliberately non-blocking: a profile sync must never turn a valid
  // financial webhook into a failed payment event.
  try {
    const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(
      customer.user_id,
    );
    if (authUserError || !authUser.user) {
      throw authUserError ?? new Error("billing_user_missing");
    }
    await syncStripeCustomerDetails(
      supabase,
      stripe,
      authUser.user,
      stripeCustomerId,
      paymentMethodId,
    );
  } catch (error) {
    console.error("[stripe-webhook] customer_details_sync_failed", {
      code: safeErrorCode(error),
      stripe_customer_id: stripeCustomerId,
    });
  }

  const scheduleId = getExpandableId(subscription.schedule);
  const latestInvoiceId = getExpandableId(subscription.latest_invoice);
  const amountCents = item.price.unit_amount;
  if (amountCents === null) throw new Error("stripe_price_amount_missing");

  const status = subscription.status;
  const acceptedStatuses = new Set([
    "incomplete",
    "incomplete_expired",
    "trialing",
    "active",
    "past_due",
    "canceled",
    "unpaid",
    "paused",
  ]);
  if (!acceptedStatuses.has(status)) throw new Error("stripe_subscription_status_unknown");

  const { error } = await supabase
    .from("billing_subscriptions")
    .upsert(
      {
        user_id: customer.user_id,
        billing_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        stripe_product_id: getExpandableId(item.price.product),
        stripe_price_id: item.price.id,
        plan_code: planCode,
        status,
        amount_cents: amountCents,
        currency: item.price.currency,
        billing_interval: item.price.recurring?.interval,
        current_period_start: fromUnixSeconds(item.current_period_start),
        current_period_end: fromUnixSeconds(item.current_period_end),
        cancel_at_period_end: subscription.cancel_at_period_end,
        cancel_at: fromUnixSeconds(subscription.cancel_at),
        canceled_at: fromUnixSeconds(subscription.canceled_at),
        stripe_schedule_id: scheduleId,
        latest_invoice_id: latestInvoiceId,
        default_payment_method_id: paymentMethodId,
        card_brand: cardBrand,
        card_last4: cardLast4,
        provider_created_at: fromUnixSeconds(subscription.created),
        last_event_created_at: eventCreatedAt,
      },
      { onConflict: "stripe_subscription_id" },
    );

  if (error) throw error;
  return "processed";
};

const syncSubscriptionById = async (
  supabase: ServiceClient,
  stripe: Stripe,
  subscriptionId: string | null,
  eventCreated: number,
  livemode: boolean,
) => {
  if (!subscriptionId) return "ignored";
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method", "latest_invoice"],
  });
  return syncSubscription(supabase, stripe, subscription, eventCreated, livemode);
};

const cancelSubscriptionIfNeeded = async (
  stripe: Stripe,
  subscriptionId: string,
  idempotencyKey?: string,
) => {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method", "latest_invoice"],
  });
  if (subscription.status === "canceled") return subscription;

  return stripe.subscriptions.cancel(
    subscriptionId,
    { invoice_now: false, prorate: false },
    idempotencyKey ? { idempotencyKey } : undefined,
  );
};

const syncRefundRequest = async (
  supabase: ServiceClient,
  stripe: Stripe,
  refund: Stripe.Refund,
  event: Stripe.Event,
  eventCreatedAt: string,
): Promise<"processed" | "ignored"> => {
  const refundRequestId = refund.metadata?.billing_refund_request_id;
  if (!refundRequestId) return "ignored";

  const { data: requestRecord, error: requestError } = await supabase
    .from("billing_refund_requests")
    .select("id,user_id,billing_subscription_id,billing_contract_acceptance_id,livemode,amount_cents,currency,stripe_refund_id,last_stripe_event_created_at,subscription_cancel_status")
    .eq("id", refundRequestId)
    .eq("livemode", event.livemode)
    .maybeSingle();
  if (requestError) throw requestError;
  if (!requestRecord) return "ignored";

  if (
    requestRecord.last_stripe_event_created_at &&
    new Date(requestRecord.last_stripe_event_created_at).getTime() >
      new Date(eventCreatedAt).getTime()
  ) {
    return "ignored";
  }

  if (
    refund.amount !== requestRecord.amount_cents ||
    refund.currency !== requestRecord.currency ||
    (requestRecord.stripe_refund_id && requestRecord.stripe_refund_id !== refund.id)
  ) {
    const { error: mismatchError } = await supabase
      .from("billing_refund_requests")
      .update({
        status: "manual_review",
        error_code: "refund_event_mismatch",
        last_stripe_event_created_at: eventCreatedAt,
      })
      .eq("id", requestRecord.id);
    if (mismatchError) throw mismatchError;
    return "processed";
  }

  const { data: localSubscription, error: localSubscriptionError } = await supabase
    .from("billing_subscriptions")
    .select("stripe_subscription_id")
    .eq("id", requestRecord.billing_subscription_id)
    .eq("user_id", requestRecord.user_id)
    .maybeSingle();
  if (localSubscriptionError) throw localSubscriptionError;
  if (!localSubscription) throw new Error("refund_subscription_missing");

  const canceled = await cancelSubscriptionIfNeeded(
    stripe,
    localSubscription.stripe_subscription_id,
    `billing-withdrawal-cancel:v1:${event.livemode ? "live" : "test"}:${requestRecord.billing_contract_acceptance_id}`,
  );
  await syncSubscription(supabase, stripe, canceled, event.created, event.livemode);
  const cancelStatus = "succeeded";

  const status = refund.status === "succeeded" && cancelStatus === "succeeded"
    ? "succeeded"
    : refund.status === "failed" || refund.status === "canceled"
    ? "failed"
    : "pending";
  const failureReason = refund.failure_reason
    ?.toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .slice(0, 180);
  const { error: updateError } = await supabase
    .from("billing_refund_requests")
    .update({
      stripe_refund_id: refund.id,
      status,
      subscription_cancel_status: cancelStatus,
      error_code: status === "failed" ? `refund_failed:${failureReason ?? "unknown"}` : null,
      last_stripe_event_created_at: eventCreatedAt,
      processed_at: status === "succeeded" || status === "failed" ? eventCreatedAt : null,
    })
    .eq("id", requestRecord.id);
  if (updateError) throw updateError;
  return "processed";
};

const getSubscriptionIdFromCharge = async (stripe: Stripe, charge: Stripe.Charge) => {
  const invoiceId = await resolveChargeInvoiceId(stripe, charge);
  if (!invoiceId) return null;
  const invoice = await stripe.invoices.retrieve(invoiceId);
  return getInvoiceSubscriptionId(invoice);
};

const chargeSustainsCurrentAccess = async (
  supabase: ServiceClient,
  stripe: Stripe,
  subscriptionId: string,
  charge: Stripe.Charge,
) => {
  const invoiceId = await resolveChargeInvoiceId(stripe, charge);
  if (!invoiceId) return false;

  const { data, error } = await supabase
    .from("billing_subscriptions")
    .select("latest_invoice_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (error) throw error;
  return data?.latest_invoice_id === invoiceId;
};

const sendFirstPaymentConfirmation = async (
  supabase: ServiceClient,
  stripe: Stripe,
  invoice: Stripe.Invoice,
  eventId: string,
  livemode: boolean,
) => {
  if (invoice.billing_reason !== "subscription_create") return;

  const subscriptionId = getInvoiceSubscriptionId(invoice);
  const customerId = getExpandableId(invoice.customer);
  const email = invoice.customer_email?.trim();
  if (!subscriptionId || !customerId || !email) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price", "customer"],
  });
  const item = subscription.items.data[0];
  if (!item) return;

  const customer = await stripe.customers.retrieve(customerId);
  const customerName = !("deleted" in customer && customer.deleted)
    ? customer.name ?? null
    : null;
  const planCode = getPlanFromPriceId(item.price.id);
  if (!planCode || item.price.unit_amount === null) return;

  const requestId = subscription.metadata.request_id;
  const userId = subscription.metadata.supabase_user_id;
  let contract: {
    termsVersion: string;
    privacyVersion: string;
    refundPolicyVersion: string;
    acceptedAt: Date;
  } | null = null;

  if (requestId && userId) {
    const { data: attempt, error: attemptError } = await supabase
      .from("billing_checkout_attempts")
      .select("id")
      .eq("request_id", requestId)
      .eq("user_id", userId)
      .maybeSingle();
    if (attemptError) throw attemptError;

    if (attempt) {
      const { data: acceptance, error: acceptanceError } = await supabase
        .from("billing_contract_acceptances")
        .select("terms_version,privacy_version,refund_policy_version,accepted_at")
        .eq("checkout_attempt_id", attempt.id)
        .eq("user_id", userId)
        .eq("livemode", livemode)
        .maybeSingle();
      if (acceptanceError) throw acceptanceError;
      if (acceptance) {
        contract = {
          termsVersion: acceptance.terms_version,
          privacyVersion: acceptance.privacy_version,
          refundPolicyVersion: acceptance.refund_policy_version,
          acceptedAt: new Date(acceptance.accepted_at),
        };
      }
    }
  }

  await sendSubscriptionConfirmation({
    eventId,
    email,
    customerName,
    amountCents: invoice.amount_paid,
    currency: invoice.currency,
    planLabel: planCode === "annual" ? "Plano anual" : "Plano mensal",
    periodEnd: item.current_period_end
      ? new Date(item.current_period_end * 1000)
      : null,
    contract,
  });
};

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { "Allow": "POST" } });
  }

  const stripe = createStripeClient();
  const configuredLivemode = getStripeLivemode();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("missing_signature", { status: 400 });

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      requireEnv("STRIPE_WEBHOOK_SECRET"),
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch {
    return new Response("invalid_signature", { status: 400 });
  }

  const supabase = createServiceClient();
  const eventCreatedAt = fromUnixSeconds(event.created);
  if (!eventCreatedAt) return new Response("invalid_event_time", { status: 400 });
  if (event.livemode !== configuredLivemode) {
    return new Response("stripe_mode_mismatch", { status: 400 });
  }

  const object = event.data.object as { id?: string };
  const { error: eventInsertError } = await supabase
    .from("billing_webhook_events")
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      stripe_object_id: object.id ?? null,
      livemode: event.livemode,
      event_created_at: eventCreatedAt,
      processing_status: "processing",
    });

  if (eventInsertError?.code === "23505") {
    const { data: existing } = await supabase
      .from("billing_webhook_events")
      .select("processing_status,attempts")
      .eq("stripe_event_id", event.id)
      .single();

    if (existing?.processing_status === "processed" || existing?.processing_status === "ignored") {
      return jsonResponse(request, { received: true, duplicate: true });
    }

    await supabase
      .from("billing_webhook_events")
      .update({
        processing_status: "processing",
        attempts: (existing?.attempts ?? 1) + 1,
        error_code: null,
      })
      .eq("stripe_event_id", event.id);
  } else if (eventInsertError) {
    console.error("[stripe-webhook] ledger_insert_failed", { code: eventInsertError.code });
    return new Response("ledger_failure", { status: 500 });
  }

  let processingStatus: "processed" | "ignored" = "processed";

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { data: completedAttempt, error: completedAttemptError } = await supabase
          .from("billing_checkout_attempts")
          .update({
            status: "complete",
            completed_at: eventCreatedAt,
          })
          .eq("stripe_checkout_session_id", session.id)
          .select("id,user_id")
          .maybeSingle();
        if (completedAttemptError) throw completedAttemptError;

        const acceptanceId = session.metadata?.contract_acceptance_id;
        if (completedAttempt && acceptanceId) {
          const withdrawalDeadline = new Date(
            event.created * 1000 + 7 * 24 * 60 * 60 * 1000,
          ).toISOString();
          const { error: acceptanceError } = await supabase
            .from("billing_contract_acceptances")
            .update({
              contracted_at: eventCreatedAt,
              withdrawal_deadline: withdrawalDeadline,
            })
            .eq("id", acceptanceId)
            .eq("checkout_attempt_id", completedAttempt.id)
            .eq("user_id", completedAttempt.user_id);
          if (acceptanceError) throw acceptanceError;
        }

        const subscriptionId = getExpandableId(session.subscription);
        if (subscriptionId) {
          const result = await syncSubscriptionById(
            supabase,
            stripe,
            subscriptionId,
            event.created,
            event.livemode,
          );
          processingStatus = result.startsWith("ignored") ? "ignored" : "processed";
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await supabase
          .from("billing_checkout_attempts")
          .update({ status: "expired" })
          .eq("stripe_checkout_session_id", session.id);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        const result = await syncSubscription(
          supabase,
          stripe,
          event.data.object as Stripe.Subscription,
          event.created,
          event.livemode,
        );
        processingStatus = result.startsWith("ignored") ? "ignored" : "processed";
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed":
      case "invoice.marked_uncollectible": {
        const invoice = event.data.object as Stripe.Invoice;
        const result = await syncSubscriptionById(
          supabase,
          stripe,
          getInvoiceSubscriptionId(invoice),
          event.created,
          event.livemode,
        );
        processingStatus = result.startsWith("ignored") ? "ignored" : "processed";
        if (event.type === "invoice.paid") {
          try {
            await sendFirstPaymentConfirmation(
              supabase,
              stripe,
              invoice,
              event.id,
              event.livemode,
            );
          } catch (error) {
            console.error("[stripe-webhook] billing_confirmation_email_failed", {
              code: safeErrorCode(error),
              event_id: event.id,
            });
          }
        }
        break;
      }

      case "refund.created":
      case "refund.updated":
      case "refund.failed": {
        processingStatus = await syncRefundRequest(
          supabase,
          stripe,
          event.data.object as Stripe.Refund,
          event,
          eventCreatedAt,
        );
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        if (charge.amount_refunded >= charge.amount) {
          const subscriptionId = await getSubscriptionIdFromCharge(stripe, charge);
          if (
            subscriptionId &&
            await chargeSustainsCurrentAccess(supabase, stripe, subscriptionId, charge)
          ) {
            const canceled = await cancelSubscriptionIfNeeded(stripe, subscriptionId);
            await syncSubscription(supabase, stripe, canceled, event.created, event.livemode);
          } else {
            processingStatus = "ignored";
          }
        } else {
          processingStatus = "ignored";
        }
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = getExpandableId(dispute.charge);
        if (!chargeId) {
          processingStatus = "ignored";
          break;
        }
        const charge = await stripe.charges.retrieve(chargeId);
        const subscriptionId = await getSubscriptionIdFromCharge(stripe, charge);
        if (
          !subscriptionId ||
          !await chargeSustainsCurrentAccess(supabase, stripe, subscriptionId, charge)
        ) {
          processingStatus = "ignored";
          break;
        }
        await supabase
          .from("billing_subscriptions")
          .update({
            access_suspended_at: new Date().toISOString(),
            access_suspension_reason: "charge_dispute",
            access_restored_at: null,
          })
          .eq("stripe_subscription_id", subscriptionId);
        break;
      }

      case "charge.dispute.closed": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = getExpandableId(dispute.charge);
        if (!chargeId) {
          processingStatus = "ignored";
          break;
        }
        const charge = await stripe.charges.retrieve(chargeId);
        const subscriptionId = await getSubscriptionIdFromCharge(stripe, charge);
        if (
          !subscriptionId ||
          !await chargeSustainsCurrentAccess(supabase, stripe, subscriptionId, charge)
        ) {
          processingStatus = "ignored";
          break;
        }

        if (dispute.status === "won") {
          await supabase
            .from("billing_subscriptions")
            .update({
              access_suspended_at: null,
              access_suspension_reason: null,
              access_restored_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId);
        } else if (dispute.status === "lost") {
          const canceled = await stripe.subscriptions.cancel(subscriptionId);
          await syncSubscription(supabase, stripe, canceled, event.created, event.livemode);
        } else {
          processingStatus = "ignored";
        }
        break;
      }

      default:
        processingStatus = "ignored";
    }

    await supabase
      .from("billing_webhook_events")
      .update({
        processing_status: processingStatus,
        processed_at: new Date().toISOString(),
        error_code: null,
      })
      .eq("stripe_event_id", event.id);

    return jsonResponse(request, { received: true });
  } catch (error) {
    const code = safeErrorCode(error);
    console.error("[stripe-webhook]", { eventType: event.type, code });
    await supabase
      .from("billing_webhook_events")
      .update({
        processing_status: "failed",
        error_code: code,
      })
      .eq("stripe_event_id", event.id);
    return new Response("processing_failed", { status: 500 });
  }
});
