import { useRef, useState } from 'react';
import { CircleAlert, Clock3, Loader2, MailCheck, RotateCcw, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useStripeWithdrawal,
  useStripeWithdrawalResultEmail,
} from '@/features/billing/hooks/useStripeBilling';
import { getSafeBillingErrorMessage } from '@/features/billing/services/stripeBillingService';
import type { BillingWithdrawal } from '@/features/billing/types';

interface BillingWithdrawalPanelProps {
  withdrawal: BillingWithdrawal;
  amountLabel: string;
}

const formatDeadline = (value: string | null) => value
  ? new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(value))
  : '—';

export const BillingWithdrawalPanel = ({
  withdrawal,
  amountLabel,
}: BillingWithdrawalPanelProps) => {
  const [open, setOpen] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const request = useStripeWithdrawal();
  const resultEmail = useStripeWithdrawalResultEmail();
  const currentStatus = request.data?.status ?? withdrawal.status;

  const handleConfirm = async () => {
    try {
      await request.mutateAsync(requestId.current);
      setOpen(false);
    } catch {
      // The mutation keeps a sanitized error for the dialog.
    }
  };

  if (currentStatus) {
    const succeeded = currentStatus === 'succeeded';
    const needsReview = currentStatus === 'failed' ||
      currentStatus === 'manual_review' ||
      currentStatus === 'rejected';
    return (
      <section className="rounded-[2rem] border border-border bg-card p-6 text-card-foreground shadow-[0_24px_70px_-42px_rgba(15,23,42,0.16)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {succeeded ? <ShieldCheck className="h-6 w-6" /> : needsReview ? <CircleAlert className="h-6 w-6" /> : <Clock3 className="h-6 w-6" />}
        </div>
        <h2 className="mt-5 text-xl font-black">
          {succeeded ? 'Reembolso confirmado' : needsReview ? 'Precisamos concluir seu pedido' : 'Solicitação recebida'}
        </h2>
        <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
          {succeeded
            ? 'A Stripe confirmou o reembolso. O crédito pode aparecer depois, conforme a bandeira e o banco emissor.'
            : needsReview
              ? 'Seu pedido está registrado e não deve ser enviado novamente. A equipe precisa acompanhar a conclusão do reembolso.'
              : 'O cancelamento foi solicitado e o reembolso está em processamento. Você receberá a confirmação por e-mail.'}
        </p>
        {withdrawal.requested_at && (
          <p className="mt-3 text-xs font-bold text-muted-foreground">
            Pedido registrado em {formatDeadline(withdrawal.requested_at)}.
          </p>
        )}
        {(succeeded || needsReview) && (
          <>
            <button
              type="button"
              onClick={() => resultEmail.mutate()}
              disabled={resultEmail.isPending || resultEmail.isSuccess}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-black text-primary disabled:opacity-70"
            >
              {resultEmail.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <MailCheck className="h-4 w-4" />}
              {resultEmail.isSuccess
                ? resultEmail.data.sent
                  ? 'Comprovante enviado'
                  : 'Envio já confirmado'
                : 'Garantir envio do comprovante'}
            </button>
            {resultEmail.isError && (
              <p role="alert" className="mt-3 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm font-bold text-destructive">
                {getSafeBillingErrorMessage(resultEmail.error)}
              </p>
            )}
          </>
        )}
        {needsReview && (
          <Link to="/contato" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-black text-primary">
            Ver canais de atendimento
          </Link>
        )}
      </section>
    );
  }

  if (!withdrawal.eligible) return null;

  return (
    <section className="rounded-[2rem] border border-warning/35 bg-warning/10 p-6 text-foreground">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/15">
        <RotateCcw className="h-6 w-6" />
      </div>
      <h2 className="mt-5 text-xl font-black">Direito de arrependimento</h2>
      <p className="mt-2 text-sm font-medium leading-6 opacity-80">
        Você pode desistir desta contratação e pedir reembolso integral até {formatDeadline(withdrawal.deadline)}.
      </p>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <button type="button" className="mt-5 flex min-h-12 w-full items-center justify-center rounded-2xl border border-destructive/35 bg-card px-4 text-sm font-black text-destructive transition hover:bg-destructive/5">
            Desistir da assinatura e pedir reembolso
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cancelamento e reembolso?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 leading-6">
                <p>Ao confirmar:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>solicitaremos o reembolso integral de {amountLabel};</li>
                  <li>a assinatura será cancelada imediatamente;</li>
                  <li>o acesso pago será encerrado, sem apagar seus dados de estudo;</li>
                  <li>o crédito dependerá do prazo da bandeira e do banco emissor.</li>
                </ul>
                <p>Você receberá um e-mail confirmando o recebimento do pedido.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {request.isError && (
            <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm font-bold text-destructive">
              {getSafeBillingErrorMessage(request.error)}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={request.isPending}>Voltar</AlertDialogCancel>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={request.isPending}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-destructive px-4 text-sm font-semibold text-destructive-foreground disabled:opacity-60"
            >
              {request.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar pedido
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
