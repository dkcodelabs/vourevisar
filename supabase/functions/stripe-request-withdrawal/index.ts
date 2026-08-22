import Stripe from "npm:stripe@22.4.0";
import {
  sendBillingOperationsAlert,
  sendWithdrawalReceivedEmail,
  sendWithdrawalResultEmail,
} from "../_shared/billingEmail.ts";
import { isBillingWithdrawalEnabled } from "../_shared/billingContract.ts";
import { isWithinWithdrawalWindow } from "../_shared/billingWithdrawal.ts";
import {
  BillingHttpError,
  createServiceClient,
  createStripeClient,
  getStripeLivemode,
  handleOptions,
  isUuid,
  jsonResponse,
  requireAuthenticatedUser,
  safeErrorCode,
  safeStripeErrorFingerprint,
} from "../_shared/stripeBilling.ts";

const getExpandableId = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") {
    return value.id;
  }
  return null;
};

const toPublicStatus = (status: string) => {
  if (status === "succeeded") return "succeeded";
  if (status === "failed" || status === "manual_review") return "manual_review";
  return "processing";
};

interface RefundEmailRecord {
  id: string;
  status: string;
  result_email_status: string | null;
  requested_at: string;
  amount_cents: number;
  currency: string;
  eligibility_deadline: string;
}

const cancelSubscriptionImmediately = async (
  stripe: Stripe,
  subscription: Stripe.Subscription,
  livemode: boolean,
  acceptanceId: string,
) => {
  if (subscription.status === "canceled") return;
  await stripe.subscriptions.cancel(
    subscription.id,
    { invoice_now: false, prorate: false },
    {
      idempotencyKey: `billing-withdrawal-cancel:v1:${livemode ? "live" : "test"}:${acceptanceId}`,
    },
  );
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { "Allow": "POST" } });
  }

  try {
    if (!isBillingWithdrawalEnabled()) {
      throw new BillingHttpError(503, "withdrawal_not_enabled");
    }

    const body = await request.json().catch(() => null) as {
      action?: unknown;
      requestId?: unknown;
    } | null;
    const isResultEmailRecovery = body?.action === "ensure_result_email";
    if (!body || (!isResultEmailRecovery && !isUuid(body.requestId))) {
      throw new BillingHttpError(400, "invalid_withdrawal_request");
    }

    const supabase = createServiceClient();
    const user = await requireAuthenticatedUser(request, supabase);
    const livemode = getStripeLivemode();

    const sendResultEmailIfNeeded = async (
      refundRequest: RefundEmailRecord,
      status: "succeeded" | "failed" | "manual_review",
      required = false,
    ) => {
      if (refundRequest.result_email_status === status) return false;
      if (!user.email) {
        if (required) throw new BillingHttpError(409, "withdrawal_email_missing");
        return false;
      }
      try {
        await sendWithdrawalResultEmail({
          requestId: refundRequest.id,
          email: user.email,
          customerName: typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name
            : null,
          amountCents: refundRequest.amount_cents,
          currency: refundRequest.currency,
          requestedAt: new Date(refundRequest.requested_at),
          deadline: new Date(refundRequest.eligibility_deadline),
          status,
        });
        const { error: emailStatusError } = await supabase
          .from("billing_refund_requests")
          .update({
            result_email_sent_at: new Date().toISOString(),
            result_email_status: status,
          })
          .eq("id", refundRequest.id)
          .eq("user_id", user.id);
        if (emailStatusError) throw emailStatusError;
        refundRequest.result_email_status = status;
        return true;
      } catch (error) {
        console.error("[stripe-request-withdrawal] result_email_failed", {
          code: safeErrorCode(error),
          status,
        });
        if (required) {
          throw new BillingHttpError(502, "withdrawal_email_send_failed");
        }
        return false;
      }
    };

    const notifyOperations = async (
      eventKey: string,
      title: string,
      amountCents: number,
      currency: string,
      status: string,
    ) => {
      try {
        await sendBillingOperationsAlert({
          eventKey,
          title,
          details: [
            { label: "Status", value: status },
            { label: "Valor", value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency.toUpperCase() }).format(amountCents / 100) },
            { label: "Cliente", value: user.email ?? user.id },
          ],
        });
      } catch (error) {
        console.error("[stripe-request-withdrawal] operations_alert_failed", { code: safeErrorCode(error) });
      }
    };

    if (isResultEmailRecovery) {
      const { data: terminalRequest, error: terminalRequestError } = await supabase
        .from("billing_refund_requests")
        .select("id,status,result_email_status,requested_at,amount_cents,currency,eligibility_deadline")
        .eq("user_id", user.id)
        .eq("livemode", livemode)
        .in("status", ["succeeded", "failed", "manual_review"])
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (terminalRequestError) throw terminalRequestError;
      if (!terminalRequest) {
        throw new BillingHttpError(404, "withdrawal_result_not_found");
      }

      const terminalStatus = terminalRequest.status as "succeeded" | "failed" | "manual_review";
      const sent = await sendResultEmailIfNeeded(terminalRequest, terminalStatus, true);
      return jsonResponse(request, {
        sent,
        alreadySent: !sent,
        status: toPublicStatus(terminalStatus),
      });
    }

    const { data: localSubscription, error: subscriptionError } = await supabase
      .from("billing_subscriptions")
      .select("id,stripe_subscription_id,status,billing_customer_id,billing_customers!inner(stripe_customer_id,livemode)")
      .eq("user_id", user.id)
      .eq("billing_customers.livemode", livemode)
      .in("status", ["active", "trialing", "past_due"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (!localSubscription) {
      throw new BillingHttpError(409, "withdrawal_subscription_not_found");
    }

    const customerRelation = localSubscription.billing_customers as unknown as {
      stripe_customer_id: string;
      livemode: boolean;
    };
    if (customerRelation.livemode !== livemode) {
      throw new BillingHttpError(409, "withdrawal_mode_mismatch");
    }

    const stripe = createStripeClient();
    const subscription = await stripe.subscriptions.retrieve(
      localSubscription.stripe_subscription_id,
      { expand: ["items.data.price"] },
    );
    if (
      subscription.livemode !== livemode ||
      getExpandableId(subscription.customer) !== customerRelation.stripe_customer_id ||
      subscription.metadata.supabase_user_id !== user.id
    ) {
      throw new BillingHttpError(409, "withdrawal_subscription_mismatch");
    }

    const checkoutRequestId = subscription.metadata.request_id;
    if (!checkoutRequestId) {
      throw new BillingHttpError(409, "withdrawal_contract_not_found");
    }

    const { data: attempt, error: attemptError } = await supabase
      .from("billing_checkout_attempts")
      .select("id")
      .eq("request_id", checkoutRequestId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (attemptError) throw attemptError;
    if (!attempt) throw new BillingHttpError(409, "withdrawal_contract_not_found");

    const { data: acceptance, error: acceptanceError } = await supabase
      .from("billing_contract_acceptances")
      .select("id,livemode,contracted_at,withdrawal_deadline")
      .eq("checkout_attempt_id", attempt.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (acceptanceError) throw acceptanceError;
    if (!acceptance?.contracted_at || !acceptance.withdrawal_deadline) {
      throw new BillingHttpError(409, "withdrawal_contract_not_ready");
    }
    if (acceptance.livemode !== livemode) {
      throw new BillingHttpError(409, "withdrawal_mode_mismatch");
    }
    if (!isWithinWithdrawalWindow(
      Date.now(),
      acceptance.contracted_at,
      acceptance.withdrawal_deadline,
    )) {
      throw new BillingHttpError(409, "withdrawal_window_expired");
    }

    const invoices = await stripe.invoices.list({
      subscription: subscription.id,
      status: "paid",
      limit: 100,
    });
    const firstInvoice = invoices.data.find((invoice) =>
      invoice.billing_reason === "subscription_create" && invoice.amount_paid > 0
    );
    if (!firstInvoice || firstInvoice.livemode !== livemode) {
      throw new BillingHttpError(409, "withdrawal_payment_not_found");
    }

    const invoicePayments = await stripe.invoicePayments.list({
      invoice: firstInvoice.id,
      status: "paid",
      limit: 10,
    });
    const paidPaymentIntents = invoicePayments.data.filter((payment) =>
      payment.payment.type === "payment_intent" &&
      getExpandableId(payment.payment.payment_intent) &&
      (payment.amount_paid ?? 0) > 0
    );
    const invoicePayment = paidPaymentIntents.length === 1 ? paidPaymentIntents[0] : null;
    const paymentIntentId = getExpandableId(invoicePayment?.payment.payment_intent);
    const paymentIntent = paymentIntentId
      ? await stripe.paymentIntents.retrieve(paymentIntentId)
      : null;
    const supportsAutomaticRefund = Boolean(
      invoicePayment &&
      paymentIntentId &&
      invoicePayment.amount_paid === firstInvoice.amount_paid &&
      paymentIntent?.livemode === livemode &&
      paymentIntent?.status === "succeeded" &&
      paymentIntent?.currency === firstInvoice.currency &&
      paymentIntent?.amount_received >= firstInvoice.amount_paid &&
      getExpandableId(paymentIntent?.customer) === customerRelation.stripe_customer_id
    );

    const requestRecord = {
      request_id: body.requestId,
      user_id: user.id,
      billing_subscription_id: localSubscription.id,
      billing_contract_acceptance_id: acceptance.id,
      livemode,
      eligibility_started_at: acceptance.contracted_at,
      eligibility_deadline: acceptance.withdrawal_deadline,
      amount_cents: firstInvoice.amount_paid,
      currency: firstInvoice.currency,
      stripe_invoice_id: firstInvoice.id,
      stripe_payment_intent_id: paymentIntentId,
      status: supportsAutomaticRefund ? "requested" : "manual_review",
      error_code: supportsAutomaticRefund ? null : "withdrawal_payment_requires_manual_review",
    };

    let reusedRequest = false;
    let { data: refundRequest, error: refundRequestError } = await supabase
      .from("billing_refund_requests")
      .insert(requestRecord)
      .select("id,status,subscription_cancel_status,stripe_refund_id,received_email_sent_at,result_email_status,requested_at,amount_cents,currency,eligibility_deadline")
      .single();

    if (refundRequestError?.code === "23505") {
      reusedRequest = true;
      const existingResult = await supabase
        .from("billing_refund_requests")
        .select("id,status,subscription_cancel_status,stripe_refund_id,received_email_sent_at,result_email_status,requested_at,amount_cents,currency,eligibility_deadline")
        .eq("billing_contract_acceptance_id", acceptance.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existingResult.error) throw existingResult.error;
      refundRequest = existingResult.data;
      refundRequestError = null;
    }
    if (refundRequestError) throw refundRequestError;
    if (!refundRequest) throw new BillingHttpError(500, "withdrawal_request_missing");

    if (!reusedRequest) {
      await notifyOperations(
        `withdrawal-request:${refundRequest.id}`,
        "Pedido de arrependimento recebido",
        refundRequest.amount_cents,
        refundRequest.currency,
        refundRequest.status,
      );
    }

    if (!refundRequest.received_email_sent_at && user.email) {
      try {
        await sendWithdrawalReceivedEmail({
          requestId: refundRequest.id,
          email: user.email,
          customerName: typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name
            : null,
          amountCents: refundRequest.amount_cents,
          currency: refundRequest.currency,
          requestedAt: new Date(refundRequest.requested_at),
          deadline: new Date(refundRequest.eligibility_deadline),
        });
        await supabase
          .from("billing_refund_requests")
          .update({ received_email_sent_at: new Date().toISOString() })
          .eq("id", refundRequest.id)
          .is("received_email_sent_at", null);
      } catch (error) {
        console.error("[stripe-request-withdrawal] receipt_email_failed", {
          code: safeErrorCode(error),
        });
      }
    }

    if (refundRequest.status === "manual_review") {
      let cancelStatus: "succeeded" | "failed" = "succeeded";
      let cancelErrorCode: string | null = null;
      try {
        await cancelSubscriptionImmediately(stripe, subscription, livemode, acceptance.id);
      } catch (error) {
        cancelStatus = "failed";
        cancelErrorCode = safeStripeErrorFingerprint(error, "subscription_cancel");
      }
      const { error: manualReviewUpdateError } = await supabase
        .from("billing_refund_requests")
        .update({
          subscription_cancel_status: cancelStatus,
          error_code: cancelErrorCode ?? "withdrawal_payment_requires_manual_review",
        })
        .eq("id", refundRequest.id)
        .eq("user_id", user.id);
      if (manualReviewUpdateError) throw manualReviewUpdateError;

      await sendResultEmailIfNeeded(refundRequest, "manual_review");

      return jsonResponse(request, {
        received: true,
        reused: reusedRequest,
        status: "manual_review",
      });
    }

    if (refundRequest.status !== "requested" && refundRequest.status !== "processing") {
      if (["succeeded", "failed", "manual_review"].includes(refundRequest.status)) {
        await sendResultEmailIfNeeded(
          refundRequest,
          refundRequest.status as "succeeded" | "failed" | "manual_review",
        );
      }
      return jsonResponse(request, {
        received: true,
        reused: true,
        status: toPublicStatus(refundRequest.status),
      });
    }

    const { data: claimed, error: claimError } = await supabase.rpc(
      "claim_billing_refund_request",
      {
        p_refund_request_id: refundRequest.id,
        p_user_id: user.id,
        p_livemode: livemode,
      },
    );
    if (claimError) throw claimError;
    if (!claimed) {
      return jsonResponse(request, { received: true, reused: true, status: "processing" });
    }

    let refund: Stripe.Refund | null = null;
    let refundErrorCode: string | null = null;
    try {
      refund = await stripe.refunds.create(
        {
          payment_intent: paymentIntentId!,
          amount: firstInvoice.amount_paid,
          reason: "requested_by_customer",
          metadata: {
            billing_refund_request_id: refundRequest.id,
            withdrawal_version: "v1",
          },
        },
        {
          idempotencyKey: `billing-withdrawal:v1:${livemode ? "live" : "test"}:${acceptance.id}`,
        },
      );
    } catch (error) {
      refundErrorCode = safeStripeErrorFingerprint(error, "refund_create");
    }

    let cancelStatus: "succeeded" | "failed" = "succeeded";
    try {
      await cancelSubscriptionImmediately(stripe, subscription, livemode, acceptance.id);
    } catch (error) {
      cancelStatus = "failed";
      refundErrorCode = refundErrorCode ?? safeStripeErrorFingerprint(error, "subscription_cancel");
    }

    const refundStatus = refund?.status;
    const finalStatus = !refund
      ? "manual_review"
      : cancelStatus === "failed"
      ? "manual_review"
      : refundStatus === "succeeded"
      ? "succeeded"
      : refundStatus === "failed" || refundStatus === "canceled"
      ? "failed"
      : "pending";
    const { error: resultError } = await supabase
      .from("billing_refund_requests")
      .update({
        stripe_refund_id: refund?.id ?? null,
        status: finalStatus,
        subscription_cancel_status: cancelStatus,
        error_code: refundErrorCode,
        processed_at: finalStatus === "succeeded" || finalStatus === "failed"
          ? new Date().toISOString()
          : null,
      })
      .eq("id", refundRequest.id)
      .eq("user_id", user.id);
    if (resultError) throw resultError;

    if (["succeeded", "failed", "manual_review"].includes(finalStatus)) {
      await sendResultEmailIfNeeded(
        refundRequest,
        finalStatus as "succeeded" | "failed" | "manual_review",
      );
      await notifyOperations(
        `refund:${refundRequest.id}:${finalStatus}`,
        finalStatus === "succeeded" ? "Reembolso confirmado" : "Reembolso exige atenção",
        refundRequest.amount_cents,
        refundRequest.currency,
        finalStatus,
      );
    }

    return jsonResponse(request, {
      received: true,
      reused: reusedRequest,
      status: toPublicStatus(finalStatus),
    });
  } catch (error) {
    const code = safeErrorCode(error);
    const status = error instanceof BillingHttpError ? error.status : 500;
    console.error("[stripe-request-withdrawal]", { code });
    return jsonResponse(request, { error: code }, status);
  }
});
