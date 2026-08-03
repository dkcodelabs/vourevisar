import {
  BillingHttpError,
  createServiceClient,
  createStripeClient,
  fromUnixSeconds,
  handleOptions,
  jsonResponse,
  requireAuthenticatedUser,
  safeErrorCode,
} from "../_shared/stripeBilling.ts";

type InvoiceHistoryStatus = "paid" | "pending" | "closed";

const toHistoryStatus = (status: string | null): InvoiceHistoryStatus => {
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
    const { data: customer, error } = await supabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    if (!customer?.stripe_customer_id) return jsonResponse(request, { invoices: [] });

    const stripe = createStripeClient();
    const result = await stripe.invoices.list({ customer: customer.stripe_customer_id, limit: 8 });

    // Display-only projection: no provider IDs, hosted links or payment URLs.
    const invoices = result.data.map((invoice) => ({
      status: toHistoryStatus(invoice.status),
      amount_cents: invoice.status === "paid" ? invoice.amount_paid : invoice.amount_due,
      currency: invoice.currency,
      occurred_at: fromUnixSeconds(invoice.status_transitions.paid_at ?? invoice.due_date ?? invoice.created),
    }));

    return jsonResponse(request, { invoices });
  } catch (error) {
    const code = safeErrorCode(error);
    const status = error instanceof BillingHttpError ? error.status : 500;
    console.error("[stripe-invoice-history]", { code });
    return jsonResponse(request, { error: code }, status);
  }
});
