import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Loader2, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useAdminRefundRequests,
  useReconcileAdminRefundRequest,
} from '@/features/billing/hooks/useAdminBilling';
import type {
  AdminRefundRequest,
  AdminRefundRequestStatus,
} from '@/features/billing/services/adminBillingService';
import { toastGate } from '@/lib/errors/toastGate';
import { toast } from '@/lib/toast';

const RECONCILABLE_STATUSES = new Set<AdminRefundRequestStatus>([
  'processing',
  'pending',
  'failed',
  'manual_review',
]);

const canReconcile = (request: AdminRefundRequest) => {
  if (!RECONCILABLE_STATUSES.has(request.status)) return false;
  if (request.status !== 'processing') return true;
  return new Date(request.updated_at).getTime() <= Date.now() - 5 * 60 * 1000;
};

const statusLabel: Record<AdminRefundRequestStatus, string> = {
  requested: 'Recebido',
  processing: 'Processando',
  pending: 'Pendente na Stripe',
  succeeded: 'Confirmado',
  failed: 'Falhou',
  manual_review: 'Revisão manual',
  rejected: 'Recusado',
};

const formatAmount = (amountCents: number, currency: string) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));

const statusBadge = (status: AdminRefundRequestStatus) => {
  if (status === 'succeeded') {
    return <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 shadow-none dark:text-emerald-400"><CheckCircle2 className="mr-1 h-3 w-3" />Confirmado</Badge>;
  }
  if (status === 'failed' || status === 'manual_review') {
    return <Badge className="border-red-500/20 bg-red-500/10 text-red-700 shadow-none dark:text-red-400"><AlertTriangle className="mr-1 h-3 w-3" />{statusLabel[status]}</Badge>;
  }
  return <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-700 shadow-none dark:text-amber-400"><Clock3 className="mr-1 h-3 w-3" />{statusLabel[status]}</Badge>;
};

export const AdminBillingRefundQueue = () => {
  const requestsQuery = useAdminRefundRequests(true);
  const reconcile = useReconcileAdminRefundRequest();
  const [selected, setSelected] = useState<AdminRefundRequest | null>(null);
  const [reason, setReason] = useState('');
  const [actionRequestId, setActionRequestId] = useState<string | null>(null);
  const orderedRequests = useMemo(() => [...(requestsQuery.data ?? [])].sort((left, right) => {
    const leftOpen = canReconcile(left) ? 0 : 1;
    const rightOpen = canReconcile(right) ? 0 : 1;
    return leftOpen - rightOpen || new Date(right.requested_at).getTime() - new Date(left.requested_at).getTime();
  }), [requestsQuery.data]);

  const openReconciliation = (request: AdminRefundRequest) => {
    setSelected(request);
    setReason('');
    setActionRequestId(crypto.randomUUID());
  };

  const closeReconciliation = () => {
    if (reconcile.isPending) return;
    setSelected(null);
    setReason('');
    setActionRequestId(null);
  };

  const submitReconciliation = async () => {
    if (!selected || !actionRequestId || reason.trim().length < 10) return;
    try {
      await reconcile.mutateAsync({
        refundRequestId: selected.id,
        actionRequestId,
        reason: reason.trim(),
      });
      toast.success('Estado reconciliado sem criar um novo reembolso automaticamente.');
      closeReconciliation();
    } catch (error) {
      toastGate.notifyError(
        error instanceof Error ? error.message : 'Não foi possível reconciliar o pedido.',
        'ADMIN-BILLING-REFUND-RECONCILE',
        { severity: 'high' },
      );
    }
  };

  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-border/60 bg-card">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
        <div>
          <h2 className="text-lg font-black text-foreground">Reembolsos e arrependimentos</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Fila isolada por ambiente. Reconciliar consulta o mesmo Refund na Stripe e reaplica somente o cancelamento idempotente; nunca cria um segundo reembolso automaticamente.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void requestsQuery.refetch()} disabled={requestsQuery.isFetching} className="h-10 gap-2 rounded-xl">
          <RefreshCw className={`h-4 w-4 ${requestsQuery.isFetching ? 'animate-spin' : ''}`} />Atualizar fila
        </Button>
      </div>

      {requestsQuery.isLoading && (
        <div className="flex min-h-28 items-center justify-center gap-2 text-sm font-semibold text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" />Carregando pedidos
        </div>
      )}
      {requestsQuery.isError && (
        <div className="m-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-semibold text-red-700 dark:text-red-400">
          Não foi possível carregar a fila financeira. Nenhuma ação foi executada.
        </div>
      )}
      {!requestsQuery.isLoading && !requestsQuery.isError && orderedRequests.length === 0 && (
        <div className="px-6 py-10 text-center text-sm font-semibold text-muted-foreground">Nenhum pedido registrado neste ambiente.</div>
      )}

      <div className="divide-y divide-border/60">
        {orderedRequests.map((request) => (
          <article key={request.id} className="flex flex-col gap-4 px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="truncate text-sm text-foreground">{request.user_name || request.user_email || 'Usuário sem identificação'}</strong>
                {statusBadge(request.status)}
                <Badge variant="outline" className="shadow-none">{request.plan === 'annual' ? 'Anual' : request.plan === 'monthly' ? 'Mensal' : 'Plano não identificado'}</Badge>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">{request.user_email}</p>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                {formatAmount(request.amount_cents, request.currency)} · solicitado em {formatDateTime(request.requested_at)} · cancelamento {request.subscription_cancel_status === 'succeeded' ? 'confirmado' : request.subscription_cancel_status === 'failed' ? 'com falha' : 'pendente'}
              </p>
              {request.error_code && <code className="mt-2 block break-all text-[11px] text-red-700 dark:text-red-400">{request.error_code}</code>}
            </div>
            {canReconcile(request) && (
              <Button variant="outline" onClick={() => openReconciliation(request)} className="shrink-0 rounded-xl">
                Reconciliar estado
              </Button>
            )}
          </article>
        ))}
      </div>

      <AlertDialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) closeReconciliation(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reconciliar este pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              A ação consulta o reembolso existente na Stripe, confere valor e ambiente e tenta concluir o cancelamento. Se nenhum Refund for encontrado, o pedido continuará em revisão manual. Nenhum novo reembolso será criado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="space-y-2 text-sm font-bold text-foreground">
            Motivo operacional
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={10}
              maxLength={500}
              rows={4}
              placeholder="Ex.: Conferência após falha de webhook informada pelo suporte."
              className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <p className="text-xs text-muted-foreground">O motivo, administrador, resultado e horário serão gravados no histórico financeiro.</p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reconcile.isPending}>Voltar</AlertDialogCancel>
            <Button
              onClick={() => void submitReconciliation()}
              disabled={reconcile.isPending || reason.trim().length < 10}
              className="gap-2"
            >
              {reconcile.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar reconciliação
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
