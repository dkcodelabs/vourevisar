import { requireEnv } from "./stripeBilling.ts";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character] ?? character));

const formatAmount = (amountCents: number, currency: string) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);

export type SubscriptionConfirmation = {
  eventId: string;
  email: string;
  customerName: string | null;
  amountCents: number;
  currency: string;
  planLabel: string;
  periodEnd: Date | null;
};

/**
 * Sends only the first paid invoice confirmation. Renewal emails remain under
 * Stripe's own receipt preferences, so webhook retries cannot spam students.
 */
export const sendSubscriptionConfirmation = async ({
  eventId,
  email,
  customerName,
  amountCents,
  currency,
  planLabel,
  periodEnd,
}: SubscriptionConfirmation) => {
  const appUrl = requireEnv("APP_URL").replace(/\/$/, "");
  const recipient = escapeHtml(email);
  const greeting = escapeHtml(customerName?.trim() || "Olá");
  const amount = escapeHtml(formatAmount(amountCents, currency));
  const safePlan = escapeHtml(planLabel);
  const period = periodEnd
    ? escapeHtml(new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(periodEnd))
    : "não informado";
  const link = `${appUrl}/conta/assinatura`;
  const apiKey = requireEnv("RESEND_API_KEY");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `stripe-event:${eventId}`,
    },
    body: JSON.stringify({
      from: "vouRevisar <noreply@vourevisar.com.br>",
      to: [email],
      subject: "Assinatura confirmada — vouRevisar",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2040;max-width:600px;margin:auto">
          <h1>Seu acesso está confirmado</h1>
          <p>${greeting}, recebemos seu pagamento e sua assinatura está ativa.</p>
          <p><strong>${safePlan}</strong><br>Valor: <strong>${amount}</strong><br>Próximo período até: ${period}</p>
          <p><a href="${link}" style="display:inline-block;background:#5b45f5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Ver minha assinatura</a></p>
          <p style="font-size:13px;color:#666">Você recebeu este e-mail em ${recipient} porque concluiu uma assinatura no vouRevisar.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`billing_email_failed:${response.status}:${body.slice(0, 120)}`);
  }
};
