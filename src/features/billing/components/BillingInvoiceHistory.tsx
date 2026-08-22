import { CheckCircle2, Clock3, FileText, RotateCcw, TriangleAlert, XCircle } from 'lucide-react';
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
  paid: { label: 'Pagamento confirmado', Icon: CheckCircle2, className: 'bg-[#eef9df] text-[#315d18]' },
  pending: { label: 'Cobrança em aberto', Icon: Clock3, className: 'bg-[#fff7e8] text-[#8a5615]' },
  closed: { label: 'Cobrança encerrada', Icon: XCircle, className: 'bg-[#f1eef8] text-[#625a71]' },
  refund_pending: { label: 'Reembolso em processamento', Icon: Clock3, className: 'bg-[#fff7e8] text-[#8a5615]' },
  refunded: { label: 'Reembolso confirmado pela Stripe', Icon: RotateCcw, className: 'bg-[#eeeaff] text-[#5138c9]' },
  refund_attention: { label: 'Reembolso em análise', Icon: TriangleAlert, className: 'bg-[#fff0ef] text-[#9f3028]' },
} as const;

interface BillingInvoiceHistoryProps {
  invoices: BillingInvoiceHistoryItem[];
  isLoading: boolean;
  isError: boolean;
}

export const BillingInvoiceHistory = ({ invoices, isLoading, isError }: BillingInvoiceHistoryProps) => (
  <section id="historico-financeiro" className="mt-6 scroll-mt-6 rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_55px_-40px_rgba(36,24,77,0.55)] sm:p-6">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#eeeaff] text-[#6048ed]">
        <FileText className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-black tracking-[-0.025em] text-[#211a35]">Histórico financeiro</h2>
        <p className="mt-1 text-sm font-medium leading-6 text-[#6d657d]">
          Consulte as cobranças e os reembolsos registrados nesta conta.
        </p>
      </div>
    </div>

    {isLoading ? (
      <div className="mt-5 h-16 animate-pulse rounded-2xl bg-[#f3f0fa]" />
    ) : isError ? (
      <p className="mt-5 rounded-2xl bg-[#f7f4fb] p-4 text-sm font-semibold leading-6 text-[#625a71]">
        Não foi possível carregar o histórico agora. Isso não altera sua assinatura nem seus dados.
      </p>
    ) : invoices.length === 0 ? (
      <p className="mt-5 rounded-2xl bg-[#f7f4fb] p-4 text-sm font-semibold text-[#625a71]">
        Nenhuma cobrança anterior para exibir.
      </p>
    ) : (
      <ul className="mt-5 divide-y divide-[#ece8f5] rounded-2xl border border-[#ece8f5] bg-white px-4">
        {invoices.map((invoice, index) => {
          const state = invoiceState[invoice.status];
          const Icon = state.Icon;
          return (
            <li key={`${invoice.occurred_at ?? 'invoice'}-${index}`} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="text-sm font-black text-[#211a35]">{formatBillingPrice(invoice.amount_cents, invoice.currency)}</p>
                <p className="mt-1 text-xs font-semibold text-[#766d86]">
                  Cobrado em {formatDate(invoice.occurred_at)}
                </p>
                {invoice.status_at && invoice.status.startsWith('refund') && (
                  <p className="mt-1 text-xs font-semibold text-[#766d86]">
                    Reembolso atualizado em {formatDate(invoice.status_at)}
                  </p>
                )}
                {invoice.status === 'refunded' && (
                  <p className="mt-1 max-w-sm text-xs font-semibold leading-5 text-[#766d86]">
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
