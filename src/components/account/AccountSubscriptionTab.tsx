import { AlertCircle, CalendarDays, CreditCard, FileText, RefreshCw, ShieldCheck, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { accountSubscriptionQueryKey, useAccountSubscription } from '@/hooks/useAccountSubscription';
import { cancelAccountRenewal } from '@/services/accountSubscriptionService';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type {
  AccountAsaasPayment,
  AccountAsaasSubscription,
  LocalAccountSubscription,
} from '@/services/accountSubscriptionService';
import {
  getSubscriptionDisplayDate,
  getSubscriptionDisplayDateLabel,
  hasAutomaticRenewal,
} from '@/utils/subscriptionDisplay';

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  premium: 'Premium',
  monthly: 'Mensal',
  annual: 'Anual',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativa',
  trial: 'Teste',
  expired: 'Expirada',
  cancelled: 'Cancelada',
  canceled: 'Cancelada',
  past_due: 'Pagamento pendente',
  inactive: 'Inativa',
  suspended: 'Suspensa',
  ACTIVE: 'Ativa',
  SUSPENDED: 'Suspensa',
  INACTIVE: 'Inativa',
  EXPIRED: 'Expirada',
  RECEIVED: 'Pagamento recebido',
  CONFIRMED: 'Pagamento confirmado',
  PENDING: 'Pendente',
  OVERDUE: 'Vencido',
  REFUNDED: 'Reembolsado',
};

const BILLING_TYPE_LABELS: Record<string, string> = {
  CREDIT_CARD: 'Cartão de crédito',
  PIX: 'Pix',
  BOLETO: 'Boleto',
};

const formatBillingMethod = (billingType?: string | null, last4?: string | null, brand?: string | null) => {
  const method = formatLabel(billingType, BILLING_TYPE_LABELS);
  if (billingType === 'CREDIT_CARD' && last4) {
    return `${brand ? `${brand} ` : ''}•••• ${last4}`;
  }
  return method;
};

const CYCLE_LABELS: Record<string, string> = {
  MONTHLY: 'Mensal',
  YEARLY: 'Anual',
  WEEKLY: 'Semanal',
};

const formatLabel = (value?: string | null, labels?: Record<string, string>) => {
  if (!value) return 'Não informado';
  return labels?.[value] ?? labels?.[value.toLowerCase()] ?? value;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Não informado';
  const [dateOnly] = value.split('T');
  const [year, month, day] = dateOnly.split('-').map(Number);
  if (!year || !month || !day) return 'Não informado';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(year, month - 1, day),
  );
};

const formatCurrency = (value?: number | null) => {
  if (typeof value !== 'number') return 'Não informado';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const getAccessEndDate = (subscription: LocalAccountSubscription | null) => {
  if (!subscription) return null;
  if (subscription.subscriptionEndsAt) return subscription.subscriptionEndsAt;
  return subscription.billingType === 'CREDIT_CARD' ? subscription.nextBillingDate || null : null;
};

const hasPaidAccess = (subscription: LocalAccountSubscription | null) => {
  const accessEndDate = getAccessEndDate(subscription);
  return Boolean(
    subscription &&
      (subscription.plan === 'monthly' || subscription.plan === 'annual') &&
      accessEndDate &&
      new Date(accessEndDate).getTime() > Date.now(),
  );
};

const formatSubscriptionEndDate = (
  subscription: LocalAccountSubscription | null,
  remoteSubscription: AccountAsaasSubscription | null | undefined,
) => {
  const recurringActive = hasAutomaticRenewal({
    plan: subscription?.plan,
    status: subscription?.status,
    billingType: remoteSubscription?.billingType || subscription?.billingType,
    nextBillingDate: remoteSubscription?.nextDueDate || subscription?.nextBillingDate,
    subscriptionEndsAt: subscription?.subscriptionEndsAt,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd,
  });
  if (recurringActive) return 'Não aplicável';
  return formatDate(subscription?.subscriptionEndsAt);
};

const unavailableMessage = (reason?: string) => {
  if (reason === 'asaas_not_linked') {
    return 'Sua assinatura ainda não tem vínculo de cobrança no Asaas.';
  }
  if (reason === 'asaas_request_failed') {
    return 'Não foi possível consultar o Asaas agora. Os dados locais continuam disponíveis.';
  }
  if (reason?.startsWith('asaas_http_error')) {
    const statusCode = reason.replace('asaas_http_error_', '');
    const suffix = statusCode && statusCode !== reason ? ` (${statusCode})` : '';
    return `O Asaas recusou a consulta desta assinatura agora${suffix}. Os dados locais continuam disponíveis.`;
  }
  if (reason === 'asaas_not_configured') {
    return 'A integração de cobrança ainda não está configurada no ambiente.';
  }
  return 'Não foi possível carregar os dados de cobrança agora.';
};

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0 rounded-lg border border-border/60 bg-background/70 px-4 py-3">
    <dt className="text-xs font-semibold uppercase text-content-muted">{label}</dt>
    <dd className="mt-1 break-words text-sm font-semibold text-foreground">{value}</dd>
  </div>
);

const SubscriptionSummary = ({
  subscription,
  remoteSubscription,
  remoteValue,
  renewalCanceled,
  paidAccess,
}: {
  subscription: LocalAccountSubscription | null;
  remoteSubscription: AccountAsaasSubscription | null | undefined;
  remoteValue: number | null | undefined;
  renewalCanceled: boolean;
  paidAccess: boolean;
}) => {
  const displayInput = {
    plan: subscription?.plan,
    status: subscription?.status,
    billingType: remoteSubscription?.billingType || subscription?.billingType,
    nextBillingDate: remoteSubscription?.nextDueDate || subscription?.nextBillingDate,
    subscriptionEndsAt: subscription?.subscriptionEndsAt,
    trialEndsAt: subscription?.trialEndsAt,
    cancelAtPeriodEnd: renewalCanceled,
  };
  const displayDate = getSubscriptionDisplayDate(displayInput);

  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <InfoItem label="Plano" value={formatLabel(subscription?.plan, PLAN_LABELS)} />
      <InfoItem
        label="Acesso"
        value={paidAccess && renewalCanceled ? 'Ativo até o fim do período' : formatLabel(subscription?.status, STATUS_LABELS)}
      />
      <InfoItem label="Pagamento" value={formatBillingMethod(
        remoteSubscription?.billingType || subscription?.billingType,
        remoteSubscription?.creditCardLast4,
        remoteSubscription?.creditCardBrand,
      )} />
      <InfoItem label="Valor" value={formatCurrency(remoteValue)} />
      <InfoItem label="Início" value={formatDate(subscription?.subscriptionStartedAt)} />
      <InfoItem label={getSubscriptionDisplayDateLabel(displayInput)} value={formatDate(displayDate)} />
      <InfoItem
        label="Fim previsto"
        value={paidAccess ? formatDate(getAccessEndDate(subscription)) : formatSubscriptionEndDate(subscription, remoteSubscription)}
      />
      <InfoItem label="Último pagamento" value={formatDate(subscription?.lastPaymentAt)} />
    </dl>
  );
};

const PaymentRow = ({ payment }: { payment: AccountAsaasPayment }) => (
  <li className="grid gap-3 rounded-lg border border-border/60 bg-background/70 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-foreground">{formatLabel(payment.status, STATUS_LABELS)}</p>
      <p className="mt-1 text-xs text-content-muted">
        Vencimento {formatDate(payment.dueDate)}
        {payment.paymentDate ? ` · Pago em ${formatDate(payment.paymentDate)}` : ''}
      </p>
    </div>
    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
      <Badge variant="outline">{formatLabel(payment.billingType, BILLING_TYPE_LABELS)}</Badge>
      <span className="text-sm font-bold text-foreground">{formatCurrency(payment.value)}</span>
    </div>
  </li>
);

const LoadingState = () => (
  <div className="grid gap-4">
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-48 w-full" />
  </div>
);

export function AccountSubscriptionTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, error, isError, isLoading, isFetching } = useAccountSubscription();
  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);
  const cancelRenewalMutation = useMutation({
    mutationFn: cancelAccountRenewal,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accountSubscriptionQueryKey });
      setIsCancelDialogOpen(false);
      toast.success('Renovação automática cancelada. Seu acesso permanece ativo até o fim do período pago.');
    },
    onError: (mutationError) => {
      toastGate.notifyError(
        mutationError instanceof Error ? mutationError.message : 'Não foi possível cancelar a renovação.',
        'ACCOUNT-SUBSCRIPTION-CANCEL-01',
        { flowKey: 'account-subscription-cancel', severity: 'medium' },
      );
    },
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Assinatura indisponível</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Não foi possível carregar sua assinatura agora.'}
        </AlertDescription>
      </Alert>
    );
  }

  const subscription = data?.subscription ?? null;
  const asaas = data?.asaas;
  const remoteSubscription = asaas?.subscription ?? null;
  const renewalCanceled = Boolean(subscription?.cancelAtPeriodEnd);
  const paidAccess = hasPaidAccess(subscription);
  const accessEndDate = getAccessEndDate(subscription);
  const billingType = remoteSubscription?.billingType || subscription?.billingType;
  const isCardBilling = billingType === 'CREDIT_CARD';
  const recurringActive = hasAutomaticRenewal({
    plan: subscription?.plan,
    status: subscription?.status,
    billingType,
    nextBillingDate: remoteSubscription?.nextDueDate || subscription?.nextBillingDate,
    subscriptionEndsAt: subscription?.subscriptionEndsAt,
    cancelAtPeriodEnd: renewalCanceled,
  });

  return (
    <div className="grid gap-5">
      {isFetching ? (
        <div className="flex items-center gap-2 text-xs font-semibold text-content-muted">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Atualizando cobrança
        </div>
      ) : null}

      <Card className="hover:shadow-lg">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Assinatura atual
              </CardTitle>
              <CardDescription>Leitura segura do seu plano e ciclo de cobrança.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {paidAccess && renewalCanceled ? 'Ativa até o fim do período' : formatLabel(subscription?.status, STATUS_LABELS)}
              </Badge>
              {recurringActive ? (
                <button
                  type="button"
                  onClick={() => setIsCancelDialogOpen(true)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-destructive/40 px-3 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
                >
                  {isCardBilling ? 'Cancelar renovação' : 'Cancelar próximas cobranças'}
                </button>
              ) : subscription?.plan === 'monthly' ? (
                <button
                  type="button"
                  onClick={() => navigate('/planos')}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Ver opções de plano
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renewalCanceled && paidAccess ? (
            <Alert className="mb-4 border-amber-500/30 bg-amber-500/10">
              <CalendarDays className="h-4 w-4 text-amber-500" />
              <AlertTitle>Renovação cancelada, acesso preservado</AlertTitle>
              <AlertDescription>
                Seu pagamento continua válido e o acesso permanece disponível até {formatDate(accessEndDate)}. Nenhuma nova cobrança será gerada.
              </AlertDescription>
            </Alert>
          ) : null}
          <SubscriptionSummary
            subscription={subscription}
            remoteSubscription={remoteSubscription}
            remoteValue={remoteSubscription?.value}
            renewalCanceled={renewalCanceled}
            paidAccess={paidAccess}
          />
        </CardContent>
      </Card>

      {!asaas?.available ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Dados de cobrança indisponíveis</AlertTitle>
          <AlertDescription>{unavailableMessage(asaas?.unavailableReason)}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5 text-primary" />
            Cobrança
          </CardTitle>
          <CardDescription>Status, ciclo e próximo vencimento vindos da cobrança quando houver vínculo.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoItem
              label={isCardBilling ? 'Recorrência no Asaas' : 'Cobrança'}
              value={isCardBilling ? (renewalCanceled ? 'Encerrada' : formatLabel(remoteSubscription?.status, STATUS_LABELS)) : 'Pagamento avulso'}
            />
            <InfoItem label="Período" value={formatLabel(remoteSubscription?.cycle, CYCLE_LABELS)} />
            <InfoItem label="Método" value={formatBillingMethod(
              remoteSubscription?.billingType || subscription?.billingType,
              remoteSubscription?.creditCardLast4,
              remoteSubscription?.creditCardBrand,
            )} />
            <InfoItem
              label={recurringActive ? 'Próxima cobrança' : 'Acesso até'}
              value={recurringActive ? formatDate(remoteSubscription?.nextDueDate) : formatDate(accessEndDate)}
            />
            <InfoItem
              label="Renovação automática"
              value={isCardBilling ? (renewalCanceled ? 'Cancelada' : recurringActive ? 'Ativa no cartão' : 'Não ativa') : 'Não'}
            />
          </dl>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-primary" />
            Pagamentos recentes
          </CardTitle>
          <CardDescription>Histórico recente em modo leitura, sem ações financeiras nesta etapa.</CardDescription>
        </CardHeader>
        <CardContent>
          {asaas?.payments?.length ? (
            <ul className="grid gap-3">
              {asaas.payments.map((payment) => (
                <PaymentRow key={payment.id} payment={payment} />
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-border/70 bg-background/70 p-5 text-sm text-content-muted">
              Nenhum pagamento recente disponível.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 p-4 text-xs text-content-muted">
        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          {renewalCanceled
            ? `As cobranças futuras foram canceladas. O acesso permanece ativo até ${formatDate(accessEndDate)}.`
            : isCardBilling
              ? 'Seu cartão será cobrado automaticamente na data indicada enquanto a assinatura estiver ativa.'
              : 'Este pagamento foi feito via Pix e não será renovado automaticamente. Para continuar, faça uma nova contratação após o período atual.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/planos')}
          className="shrink-0 font-semibold text-primary hover:underline"
        >
          Ver planos
        </button>
      </div>

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isCardBilling ? 'Cancelar renovação automática?' : 'Cancelar próximas cobranças?'}</DialogTitle>
            <DialogDescription>
              {isCardBilling
                ? `Seu cartão não será cobrado novamente. Você continuará com acesso até ${formatDate(accessEndDate)}.`
                : `Nenhuma nova cobrança PIX será gerada. Você continuará com acesso até ${formatDate(accessEndDate)}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-muted-foreground">
            Você poderá assinar outro plano quando o período terminar.
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setIsCancelDialogOpen(false)} className="h-10 rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted">
              Manter renovação
            </button>
            <button
              type="button"
              disabled={cancelRenewalMutation.isPending}
              onClick={() => cancelRenewalMutation.mutate()}
              className="h-10 rounded-lg bg-destructive px-4 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelRenewalMutation.isPending ? 'Cancelando...' : isCardBilling ? 'Cancelar renovação' : 'Cancelar cobranças'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
