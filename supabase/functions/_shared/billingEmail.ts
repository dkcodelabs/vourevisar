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
  contract?: {
    termsVersion: string;
    privacyVersion: string;
    refundPolicyVersion: string;
    acceptedAt: Date;
  } | null;
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
  contract,
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
  const contractSummary = contract
    ? `
      <div style="background:#f6f3ff;border-radius:12px;padding:16px;margin:20px 0">
        <p style="margin:0 0 8px"><strong>Confirmação contratual</strong></p>
        <p style="margin:0;font-size:14px">Aceite registrado em ${escapeHtml(new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(contract.acceptedAt))}.</p>
        <p style="margin:8px 0 0;font-size:13px;color:#555">
          <a href="${appUrl}/termos">Termos de Uso ${escapeHtml(contract.termsVersion)}</a> ·
          <a href="${appUrl}/privacidade">Privacidade ${escapeHtml(contract.privacyVersion)}</a> ·
          <a href="${appUrl}/cancelamento-e-reembolso">Cancelamento e Reembolso ${escapeHtml(contract.refundPolicyVersion)}</a>
        </p>
      </div>
    `
    : "";
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
          <p><strong>${safePlan}</strong><br>Valor: <strong>${amount}</strong><br>Próxima renovação prevista em: ${period}</p>
          ${contractSummary}
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
