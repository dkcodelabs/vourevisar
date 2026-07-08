import { AlertCircle, CalendarDays, CreditCard, FileText, RefreshCw, ShieldCheck } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccountSubscription } from '@/hooks/useAccountSubscription';
import type { AccountAsaasPayment, LocalAccountSubscription } from '@/services/accountSubscriptionService';

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

const unavailableMessage = (reason?: string) => {
  if (reason === 'asaas_not_linked') {
    return 'Sua assinatura ainda não tem vínculo de cobrança no Asaas.';
  }
  if (reason === 'asaas_request_failed') {
    return 'Não foi possível consultar o Asaas agora. Os dados locais continuam disponíveis.';
  }
  if (reason === 'asaas_http_error') {
    return 'O Asaas recusou a consulta desta assinatura agora. Os dados locais continuam disponíveis.';
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
  remoteValue,
}: {
  subscription: LocalAccountSubscription | null;
  remoteValue: number | null | undefined;
}) => (
  <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <InfoItem label="Plano" value={formatLabel(subscription?.plan, PLAN_LABELS)} />
    <InfoItem label="Status" value={formatLabel(subscription?.status, STATUS_LABELS)} />
    <InfoItem label="Pagamento" value={formatLabel(subscription?.billingType, BILLING_TYPE_LABELS)} />
    <InfoItem label="Valor" value={formatCurrency(remoteValue)} />
    <InfoItem label="Início" value={formatDate(subscription?.subscriptionStartedAt)} />
    <InfoItem label="Próxima cobrança" value={formatDate(subscription?.nextBillingDate)} />
    <InfoItem label="Fim previsto" value={formatDate(subscription?.subscriptionEndsAt)} />
    <InfoItem label="Último pagamento" value={formatDate(subscription?.lastPaymentAt)} />
  </dl>
);

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
  const { data, error, isError, isLoading, isFetching } = useAccountSubscription();

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
            <Badge variant="outline">{formatLabel(subscription?.status, STATUS_LABELS)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <SubscriptionSummary subscription={subscription} remoteValue={remoteSubscription?.value} />
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
            <InfoItem label="Status Asaas" value={formatLabel(remoteSubscription?.status, STATUS_LABELS)} />
            <InfoItem label="Ciclo" value={formatLabel(remoteSubscription?.cycle, CYCLE_LABELS)} />
            <InfoItem label="Método" value={formatLabel(remoteSubscription?.billingType, BILLING_TYPE_LABELS)} />
            <InfoItem label="Vencimento" value={formatDate(remoteSubscription?.nextDueDate)} />
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

      <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-4 text-xs text-content-muted">
        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Cancelamento, troca de plano, alteração de pagamento e segunda via ficam bloqueados até a leitura de cobrança
          estar confiável em produção.
        </p>
      </div>
    </div>
  );
}
