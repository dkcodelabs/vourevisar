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

const sendBillingEmail = async ({
  email,
  subject,
  html,
  idempotencyKey,
}: {
  email: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: "vouRevisar <noreply@vourevisar.com.br>",
      to: [email],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`billing_email_failed:${response.status}:${body.slice(0, 120)}`);
  }
};

/**
 * Internal operational notices are deliberately separate from customer email.
 * A missing or failed operations recipient must never affect payment,
 * cancellation, refund, or webhook processing.
 */
export const sendBillingOperationsAlert = async ({
  eventKey,
  title,
  details,
}: {
  eventKey: string;
  title: string;
  details: Array<{ label: string; value: string }>;
}) => {
  const recipient = Deno.env.get("BILLING_OPERATIONS_EMAIL")?.trim();
  if (!recipient) return false;

  await sendBillingEmail({
    email: recipient,
    subject: `${title} — operação vouRevisar`,
    idempotencyKey: `billing-operations:${eventKey}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2040;max-width:600px;margin:auto">
        <h1>${escapeHtml(title)}</h1>
        <p>Registro operacional automático. Confira os detalhes na área administrativa antes de tomar qualquer ação manual.</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          ${details.map(({ label, value }) => `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#667085">${escapeHtml(label)}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600">${escapeHtml(value)}</td></tr>`).join("")}
        </table>
      </div>
    `,
  });
  return true;
};

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
  await sendBillingEmail({
    email,
    subject: "Assinatura confirmada — vouRevisar",
    idempotencyKey: `stripe-event:${eventId}`,
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
  });
};

/**
 * The annual schedule has its own acceptance record. Send this once when the
 * first annual invoice is paid; it is not a generic renewal receipt.
 */
export const sendPlanChangeConfirmation = async ({
  eventId,
  email,
  customerName,
  amountCents,
  currency,
  periodEnd,
  contract,
}: Omit<SubscriptionConfirmation, "planLabel">) => {
  const appUrl = requireEnv("APP_URL").replace(/\/$/, "");
  const recipient = escapeHtml(email);
  const greeting = escapeHtml(customerName?.trim() || "Olá");
  const amount = escapeHtml(formatAmount(amountCents, currency));
  const period = periodEnd
    ? escapeHtml(new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(periodEnd))
    : "não informado";
  const contractSummary = contract
    ? `
      <div style="background:#f6f3ff;border-radius:12px;padding:16px;margin:20px 0">
        <p style="margin:0 0 8px"><strong>Confirmação da alteração</strong></p>
        <p style="margin:0;font-size:14px">Aceite registrado em ${escapeHtml(new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(contract.acceptedAt))}.</p>
        <p style="margin:8px 0 0;font-size:13px;color:#555">
          <a href="${appUrl}/termos">Termos de Uso ${escapeHtml(contract.termsVersion)}</a> ·
          <a href="${appUrl}/privacidade">Privacidade ${escapeHtml(contract.privacyVersion)}</a> ·
          <a href="${appUrl}/cancelamento-e-reembolso">Cancelamento e Reembolso ${escapeHtml(contract.refundPolicyVersion)}</a>
        </p>
      </div>
    `
    : "";

  await sendBillingEmail({
    email,
    subject: "Plano anual confirmado — vouRevisar",
    idempotencyKey: `stripe-plan-change:${eventId}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2040;max-width:600px;margin:auto">
        <h1>Seu plano anual está confirmado</h1>
        <p>${greeting}, a Stripe confirmou o pagamento da mudança para o plano anual.</p>
        <p><strong>Plano anual</strong><br>Valor: <strong>${amount}</strong><br>Próxima renovação prevista em: ${period}</p>
        <p>Não houve segunda assinatura: sua assinatura mensal foi substituída no fim do período já pago.</p>
        ${contractSummary}
        <p><a href="${appUrl}/conta/assinatura" style="display:inline-block;background:#5b45f5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Ver minha assinatura</a></p>
        <p style="font-size:13px;color:#666">Você recebeu este e-mail em ${recipient} porque confirmou uma alteração de plano no vouRevisar.</p>
      </div>
    `,
  });
};

type WithdrawalEmail = {
  requestId: string;
  email: string;
  customerName: string | null;
  amountCents: number;
  currency: string;
  requestedAt: Date;
  deadline: Date;
};

export const sendWithdrawalReceivedEmail = async ({
  requestId,
  email,
  customerName,
  amountCents,
  currency,
  requestedAt,
  deadline,
}: WithdrawalEmail) => {
  const appUrl = requireEnv("APP_URL").replace(/\/$/, "");
  const greeting = escapeHtml(customerName?.trim() || "Olá");
  const amount = escapeHtml(formatAmount(amountCents, currency));
  const requested = escapeHtml(new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(requestedAt));
  const legalDeadline = escapeHtml(new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(deadline));

  await sendBillingEmail({
    email,
    subject: "Recebemos seu pedido de cancelamento e reembolso — vouRevisar",
    idempotencyKey: `withdrawal-received:${requestId}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2040;max-width:600px;margin:auto">
        <h1>Solicitação recebida</h1>
        <p>${greeting}, registramos seu pedido em ${requested}, dentro da janela informada até ${legalDeadline}.</p>
        <p>O pedido corresponde ao reembolso integral de <strong>${amount}</strong> e ao cancelamento imediato da assinatura paga.</p>
        <p>O processamento do crédito depende da Stripe, da bandeira e do banco emissor. Este e-mail confirma o recebimento do pedido, não a conclusão do crédito.</p>
        <p><a href="${appUrl}/conta/assinatura" style="display:inline-block;background:#5b45f5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Acompanhar solicitação</a></p>
      </div>
    `,
  });
};

export const sendWithdrawalResultEmail = async ({
  requestId,
  email,
  customerName,
  amountCents,
  currency,
  requestedAt,
  deadline,
  status,
}: WithdrawalEmail & { status: "succeeded" | "failed" | "manual_review" }) => {
  const appUrl = requireEnv("APP_URL").replace(/\/$/, "");
  const greeting = escapeHtml(customerName?.trim() || "Olá");
  const amount = escapeHtml(formatAmount(amountCents, currency));
  const succeeded = status === "succeeded";
  const title = succeeded ? "Reembolso confirmado" : "Seu pedido precisa de acompanhamento";
  const description = succeeded
    ? `A Stripe confirmou o reembolso integral de <strong>${amount}</strong>. O prazo para aparecer na fatura depende da bandeira e do banco emissor.`
    : `O cancelamento foi registrado, mas o reembolso de <strong>${amount}</strong> precisa ser concluído ou conferido pela equipe. Você não precisa enviar outro pedido.`;

  await sendBillingEmail({
    email,
    subject: `${title} — vouRevisar`,
    idempotencyKey: `withdrawal-result:${requestId}:${status}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2040;max-width:600px;margin:auto">
        <h1>${title}</h1>
        <p>${greeting}, ${description}</p>
        <p><a href="${appUrl}/conta/assinatura" style="display:inline-block;background:#5b45f5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Ver minha assinatura</a></p>
      </div>
    `,
  });
};
