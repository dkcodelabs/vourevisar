import {
  BillingHttpError,
  createServiceClient,
  createStripeClient,
  fromUnixSeconds,
  getStripeLivemode,
  handleOptions,
  jsonResponse,
  requireAuthenticatedUser,
  safeErrorCode,
  safeStripeErrorDetails,
} from "../_shared/stripeBilling.ts";

type InvoiceHistoryStatus =
  | "paid"
  | "pending"
  | "closed"
  | "refund_pending"
  | "refunded"
  | "refund_attention";

const toHistoryStatus = (
  status: string | null,
  refundStatus?: string,
): InvoiceHistoryStatus => {
  if (refundStatus === "succeeded") return "refunded";
  if (["requested", "processing", "pending"].includes(refundStatus ?? "")) {
    return "refund_pending";
  }
  if (["failed", "manual_review", "rejected"].includes(refundStatus ?? "")) {
    return "refund_attention";
  }
  if (status === "paid") return "paid";
  if (status === "open" || status === "draft") return "pending";
  return "closed";
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (request.method !== "POST") return jsonResponse(request, { error: "method_not_allowed" }, 405);

  try {
    const supabase = createServiceClient();
    const user = await requireAuthenticatedUser(request, supabase);
    const livemode = getStripeLivemode();
    const { data: customer, error } = await supabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .eq("livemode", livemode)
      .maybeSingle();

    if (error) throw error;
    if (!customer?.stripe_customer_id) return jsonResponse(request, { invoices: [] });

    const stripe = createStripeClient();
    const result = await (async () => {
      try {
        return await stripe.invoices.list({ customer: customer.stripe_customer_id, limit: 8 });
      } catch (error) {
        // Customer IDs are account-scoped. After changing Stripe accounts,
        // the old mapping has no invoices in the current account. Preserve the
        // read-only history contract instead of exposing a provider error.
        if (safeStripeErrorDetails(error)?.code === "resource_missing") {
          return null;
        }
        throw error;
      }
    })();
    if (!result) return jsonResponse(request, { invoices: [] });

    const invoiceIds = result.data.map((invoice) => invoice.id);
    const { data: refundRequests, error: refundError } = invoiceIds.length > 0
      ? await supabase
        .from("billing_refund_requests")
        .select("stripe_invoice_id,status,requested_at,processed_at")
        .eq("user_id", user.id)
        .eq("livemode", livemode)
        .in("stripe_invoice_id", invoiceIds)
      : { data: [], error: null };
    if (refundError) throw refundError;

    const refundByInvoice = new Map(
      (refundRequests ?? []).map((refund) => [refund.stripe_invoice_id, refund]),
    );

    // Display-only projection: no provider IDs, hosted links or payment URLs.
    const invoices = result.data.map((invoice) => {
      const refund = refundByInvoice.get(invoice.id);
      return {
        status: toHistoryStatus(invoice.status, refund?.status),
        amount_cents: invoice.status === "paid" ? invoice.amount_paid : invoice.amount_due,
        currency: invoice.currency,
        occurred_at: fromUnixSeconds(invoice.status_transitions.paid_at ?? invoice.due_date ?? invoice.created),
        status_at: refund?.processed_at ?? refund?.requested_at ?? null,
      };
    });

    return jsonResponse(request, { invoices });
  } catch (error) {
    const code = safeErrorCode(error);
    const status = error instanceof BillingHttpError ? error.status : 500;
    console.error("[stripe-invoice-history]", { code });
    return jsonResponse(request, { error: code }, status);
  }
});
