import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Loader2, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminBillingOperations } from '@/features/billing/hooks/useAdminBilling';
import type { AdminBillingOperation, AdminBillingOperationType } from '@/features/billing/services/adminBillingService';

const labels: Record<AdminBillingOperationType, string> = {
  payment_confirmed: 'Pagamento confirmado',
  renewal_cancel_scheduled: 'Renovação cancelada',
  subscription_canceled: 'Assinatura encerrada',
  withdrawal_requested: 'Arrependimento solicitado',
  refund_succeeded: 'Reembolso confirmado',
  refund_pending: 'Reembolso pendente',
  refund_failed: 'Reembolso com falha',
  refund_manual_review: 'Reembolso em revisão',
  reconciliation_succeeded: 'Reconciliação concluída',
  reconciliation_no_change: 'Reconciliação sem alteração',
  reconciliation_failed: 'Reconciliação com falha',
};

const attentionTypes = new Set<AdminBillingOperationType>([
  'refund_pending',
  'refund_failed',
  'refund_manual_review',
  'reconciliation_failed',
]);

const formatDateTime = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(value));

const formatAmount = (event: AdminBillingOperation) => (
  event.amount_cents === null || !event.currency
    ? null
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: event.currency.toUpperCase() }).format(event.amount_cents / 100)
);

const operationIcon = (type: AdminBillingOperationType) => {
  if (attentionTypes.has(type)) return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
  if (type.startsWith('reconciliation')) return <RotateCcw className="h-4 w-4 text-primary" />;
  if (type.includes('refund') || type.includes('withdrawal')) return <ShieldCheck className="h-4 w-4 text-primary" />;
  if (type.includes('cancel')) return <Clock3 className="h-4 w-4 text-muted-foreground" />;
  return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
};

export const AdminBillingOperationTimeline = () => {
  const query = useAdminBillingOperations();
  const [showAttentionOnly, setShowAttentionOnly] = useState(false);
  const operations = useMemo(
    () => (query.data?.events ?? []).filter((event) => !showAttentionOnly || attentionTypes.has(event.type)),
    [query.data?.events, showAttentionOnly],
  );
  const livemodeLabel = query.data?.livemode ? 'Produção (Live)' : 'Teste';

  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-border/60 bg-card">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-foreground">Linha do tempo operacional</h2>
            <Badge variant="outline" className="shadow-none">{livemodeLabel}</Badge>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Registro somente-leitura das operações financeiras deste ambiente. Não exibe IDs Stripe, payloads ou ações internas ao aluno.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={showAttentionOnly ? 'default' : 'outline'} size="sm" onClick={() => setShowAttentionOnly((current) => !current)} className="h-10 rounded-xl">
            {showAttentionOnly ? 'Mostrando atenção' : 'Filtrar atenção'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()} disabled={query.isFetching} className="h-10 gap-2 rounded-xl">
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />Atualizar
          </Button>
        </div>
      </div>

      {query.isLoading && <div className="flex min-h-28 items-center justify-center gap-2 text-sm font-semibold text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" />Carregando operações</div>}
      {query.isError && <div className="m-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-semibold text-red-700 dark:text-red-400">Não foi possível carregar a linha do tempo. Nenhuma operação foi alterada.</div>}
      {!query.isLoading && !query.isError && operations.length === 0 && <div className="px-6 py-10 text-center text-sm font-semibold text-muted-foreground">Nenhuma operação encontrada neste ambiente.</div>}

      <div className="divide-y divide-border/60">
        {operations.map((event) => {
          const attention = attentionTypes.has(event.type);
          const amount = formatAmount(event);
          return (
            <article key={event.id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className="mt-0.5">{operationIcon(event.type)}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-foreground">{labels[event.type]}</strong>
                    <Badge variant="outline" className={attention ? 'border-amber-500/30 text-amber-700 dark:text-amber-400' : 'shadow-none'}>{event.plan === 'annual' ? 'Anual' : event.plan === 'monthly' ? 'Mensal' : event.status}</Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{event.user_name || event.user_email || 'Usuário sem identificação'}{event.user_email && event.user_name ? ` · ${event.user_email}` : ''}</p>
                  {event.error_code && <p className="mt-1 break-all text-xs font-semibold text-red-700 dark:text-red-400">Código: {event.error_code}</p>}
                </div>
              </div>
              <div className="shrink-0 text-left text-xs font-semibold text-muted-foreground sm:text-right">
                {amount && <div className="text-foreground">{amount}</div>}
                <time dateTime={event.occurred_at}>{formatDateTime(event.occurred_at)}</time>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
