import { CheckCircle2, Clock3, CreditCard, FileText, RotateCcw, TriangleAlert, XCircle } from 'lucide-react';
import type { BillingInvoiceHistoryItem } from '@/features/billing/types';
import { formatBillingPrice } from '@/features/billing/services/stripeBillingService';

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(value))
  : 'Data não disponível';

const invoiceState = {
  paid: { label: 'Pagamento confirmado', Icon: CheckCircle2, className: 'bg-success/15 text-success' },
  pending: { label: 'Cobrança em aberto', Icon: Clock3, className: 'bg-warning/15 text-warning' },
  closed: { label: 'Cobrança encerrada', Icon: XCircle, className: 'bg-muted text-muted-foreground' },
  refund_pending: { label: 'Reembolso em processamento', Icon: Clock3, className: 'bg-warning/15 text-warning' },
  refunded: { label: 'Reembolso confirmado pela Stripe', Icon: RotateCcw, className: 'bg-primary/15 text-primary' },
  refund_attention: { label: 'Reembolso em análise', Icon: TriangleAlert, className: 'bg-destructive/15 text-destructive' },
} as const;

interface BillingInvoiceHistoryProps {
  invoices: BillingInvoiceHistoryItem[];
  isLoading: boolean;
  isError: boolean;
}

export const BillingInvoiceHistory = ({
  invoices,
  isLoading,
  isError,
}: BillingInvoiceHistoryProps) => (
  <section id="historico-financeiro" className="mt-5 scroll-mt-6 rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-[0_18px_55px_-40px_rgba(15,23,42,0.22)] sm:p-6">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <FileText className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-black tracking-[-0.025em]">Histórico financeiro</h2>
        <p className="mt-1 text-sm font-medium leading-6 text-muted-foreground">
          Consulte as cobranças e os reembolsos registrados nesta conta.
        </p>
      </div>
    </div>

    {isLoading ? (
      <div className="mt-5 h-16 animate-pulse rounded-2xl bg-muted" />
    ) : isError ? (
      <p className="mt-5 rounded-2xl bg-muted p-4 text-sm font-semibold leading-6 text-muted-foreground">
        Não foi possível carregar o histórico agora. Isso não altera sua assinatura nem seus dados.
      </p>
    ) : invoices.length === 0 ? (
      <p className="mt-5 rounded-2xl bg-muted p-4 text-sm font-semibold text-muted-foreground">
        Nenhuma cobrança anterior para exibir.
      </p>
    ) : (
      <ul className="mt-5 divide-y divide-border rounded-2xl border border-border bg-background px-4">
        {invoices.map((invoice, index) => {
          const state = invoiceState[invoice.status];
          const Icon = state.Icon;
          return (
            <li key={`${invoice.occurred_at ?? 'invoice'}-${index}`} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div>
                <p className="text-sm font-black">{formatBillingPrice(invoice.amount_cents, invoice.currency)}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  Cobrado em {formatDate(invoice.occurred_at)}
                </p>
                {invoice.payment_method_label && (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <CreditCard className="h-3.5 w-3.5" />
                    Pago com {invoice.payment_method_label}
                  </p>
                )}
                {invoice.status_at && invoice.status.startsWith('refund') && (
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    Reembolso atualizado em {formatDate(invoice.status_at)}
                  </p>
                )}
                {invoice.status === 'refunded' && (
                  <p className="mt-1 max-w-sm text-xs font-semibold leading-5 text-muted-foreground">
                    A Stripe confirmou o reembolso; o banco pode exibir um crédito ou remover o lançamento original da fatura.
                  </p>
                )}
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${state.className}`}>
                <Icon className="h-3.5 w-3.5" />
                {state.label}
              </span>
            </li>
          );
        })}
      </ul>
    )}
  </section>
);
