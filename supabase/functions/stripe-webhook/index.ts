import Stripe from "npm:stripe@22.4.0";
import {
  createServiceClient,
  createStripeClient,
  fromUnixSeconds,
  getPlanFromPriceId,
  jsonResponse,
  requireEnv,
  safeErrorCode,
} from "../_shared/stripeBilling.ts";

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

const resolveBillingCustomer = async (
  supabase: ServiceClient,
  stripe: Stripe,
  stripeCustomerId: string,
  metadataUserId?: string | null,
) => {
  const { data: existing, error: existingError } = await supabase
    .from("billing_customers")
    .select("id,user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const customer = await stripe.customers.retrieve(stripeCustomerId);
  if ("deleted" in customer && customer.deleted) {
    throw new Error("stripe_customer_deleted");
  }

  const userId = metadataUserId || customer.metadata.supabase_user_id;
  if (!userId) throw new Error("stripe_customer_user_missing");

  const { data: inserted, error: insertError } = await supabase
    .from("billing_customers")
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        livemode: customer.livemode,
      },
      { onConflict: "user_id" },
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
) => {
  if (!subscriptionId) return "ignored";
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method", "latest_invoice"],
  });
  return syncSubscription(supabase, stripe, subscription, eventCreated);
};

const getSubscriptionIdFromCharge = async (stripe: Stripe, charge: Stripe.Charge) => {
  const invoiceId = getChargeInvoiceId(charge);
  if (!invoiceId) return null;
  const invoice = await stripe.invoices.retrieve(invoiceId);
  return getInvoiceSubscriptionId(invoice);
};

const chargeSustainsCurrentAccess = async (
  supabase: ServiceClient,
  subscriptionId: string,
  charge: Stripe.Charge,
) => {
  const invoiceId = getChargeInvoiceId(charge);
  if (!invoiceId) return false;

  const { data, error } = await supabase
    .from("billing_subscriptions")
    .select("latest_invoice_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (error) throw error;
  return data?.latest_invoice_id === invoiceId;
};

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { "Allow": "POST" } });
  }

  const stripe = createStripeClient();
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
        await supabase
          .from("billing_checkout_attempts")
          .update({
            status: "complete",
            completed_at: new Date().toISOString(),
          })
          .eq("stripe_checkout_session_id", session.id);

        const subscriptionId = getExpandableId(session.subscription);
        if (subscriptionId) {
          const result = await syncSubscriptionById(
            supabase,
            stripe,
            subscriptionId,
            event.created,
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
        );
        processingStatus = result.startsWith("ignored") ? "ignored" : "processed";
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        if (charge.amount_refunded >= charge.amount) {
          const subscriptionId = await getSubscriptionIdFromCharge(stripe, charge);
          if (
            subscriptionId &&
            await chargeSustainsCurrentAccess(supabase, subscriptionId, charge)
          ) {
            const canceled = await stripe.subscriptions.cancel(subscriptionId);
            await syncSubscription(supabase, stripe, canceled, event.created);
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
          !await chargeSustainsCurrentAccess(supabase, subscriptionId, charge)
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
          !await chargeSustainsCurrentAccess(supabase, subscriptionId, charge)
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
          await syncSubscription(supabase, stripe, canceled, event.created);
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
