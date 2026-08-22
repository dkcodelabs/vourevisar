import { useState } from 'react';
import { ArrowRight, CalendarClock, Loader2, RotateCcw, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
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
  useCancelStripeScheduledPlanChange,
  useScheduleStripeAnnualPlanChange,
} from '@/features/billing/hooks/useStripeBilling';
import { billingLegalLinks } from '@/features/billing/legal/billingLegalDocuments';
import { getSafeBillingErrorMessage } from '@/features/billing/services/stripeBillingService';

const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(value));

type ScheduledAnnualPlanChangeProps = {
  currentPeriodEnd: string;
  scheduled: boolean;
  annualPriceLabel: string | null;
};

export const ScheduledAnnualPlanChange = ({
  currentPeriodEnd,
  scheduled,
  annualPriceLabel,
}: ScheduledAnnualPlanChangeProps) => {
  const scheduleChange = useScheduleStripeAnnualPlanChange();
  const cancelChange = useCancelStripeScheduledPlanChange();
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const effectiveDate = formatDate(currentPeriodEnd);

  const closeScheduleDialog = () => {
    if (scheduleChange.isPending) return;
    setOpen(false);
    setAccepted(false);
    setRequestId(null);
  };

  const scheduleAnnual = async () => {
    if (!accepted) return;
    const nextRequestId = requestId ?? crypto.randomUUID();
    setRequestId(nextRequestId);
    try {
      await scheduleChange.mutateAsync(nextRequestId);
      closeScheduleDialog();
    } catch {
      // The mutation error is rendered below with an allowlisted message.
    }
  };

  const cancelScheduledChange = async () => {
    try {
      await cancelChange.mutateAsync();
    } catch {
      // The mutation error is rendered below with an allowlisted message.
    }
  };

  if (scheduled) {
    return (
      <section className="rounded-[2rem] border border-primary/30 bg-primary/5 p-6 text-card-foreground">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <CalendarClock className="h-6 w-6" />
        </div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-primary">Troca agendada</p>
        <h2 className="mt-2 text-xl font-black tracking-[-0.025em]">Seu plano anual começa em {effectiveDate}</h2>
        <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
          Seu mensal permanece ativo até essa data. Não há cobrança hoje; a próxima cobrança será anual{annualPriceLabel ? `, no valor de ${annualPriceLabel}` : ''}.
        </p>
        <button
          type="button"
          onClick={() => void cancelScheduledChange()}
          disabled={cancelChange.isPending}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-black text-foreground transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cancelChange.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Manter plano mensal
        </button>
        {cancelChange.isError && (
          <p role="alert" className="mt-3 text-sm font-bold text-destructive">
            {getSafeBillingErrorMessage(cancelChange.error)}
          </p>
        )}
      </section>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : closeScheduleDialog())}>
      <section className="rounded-[2rem] border border-border bg-card p-6 text-card-foreground shadow-[0_24px_70px_-42px_rgba(15,23,42,0.16)] dark:shadow-[0_24px_70px_-42px_rgba(0,0,0,0.52)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <CalendarClock className="h-6 w-6" />
        </div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-primary">Economize no próximo ciclo</p>
        <h2 className="mt-2 text-xl font-black tracking-[-0.025em]">Mude para o anual sem perder este mês</h2>
        <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
          Mantenha o mensal até {effectiveDate}. O anual começa automaticamente depois, sem uma segunda assinatura nem cobrança hoje.
        </p>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-info px-5 text-sm font-black text-primary-foreground shadow-[0_16px_35px_-18px_hsl(var(--primary)/0.7)] transition hover:-translate-y-0.5"
          >
            Agendar plano anual
            <ArrowRight className="h-4 w-4" />
          </button>
        </AlertDialogTrigger>
      </section>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Agendar mudança para o plano anual?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 leading-6">
              <p>Seu plano mensal segue ativo até <strong className="text-foreground">{effectiveDate}</strong>.</p>
              <p>Em {effectiveDate}, a Stripe iniciará o plano anual{annualPriceLabel ? ` por ${annualPriceLabel}` : ''}. Não há cobrança hoje e não será criada uma segunda assinatura.</p>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm font-medium text-foreground">
                <Checkbox checked={accepted} onCheckedChange={(value) => setAccepted(value === true)} />
                <span>
                  Li e concordo com os <Link to={billingLegalLinks.terms} className="font-bold text-primary underline underline-offset-2">Termos de Uso</Link>, a <Link to={billingLegalLinks.privacy} className="font-bold text-primary underline underline-offset-2">Política de Privacidade</Link> e a <Link to={billingLegalLinks.refunds} className="font-bold text-primary underline underline-offset-2">Política de Cancelamento e Reembolso</Link> aplicáveis à alteração de plano.
                </span>
              </label>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {scheduleChange.isError && (
          <p role="alert" className="text-sm font-bold text-destructive">
            {getSafeBillingErrorMessage(scheduleChange.error)}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={scheduleChange.isPending}>Voltar</AlertDialogCancel>
          <button
            type="button"
            onClick={() => void scheduleAnnual()}
            disabled={!accepted || scheduleChange.isPending}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {scheduleChange.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Confirmar agendamento
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
