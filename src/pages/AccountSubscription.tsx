import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AccountNavigation } from '@/components/account/AccountNavigation';
import { BillingArtwork } from '@/features/billing/components/BillingArtwork';
import {
  useStripeBillingOverview,
  useStripePortal,
} from '@/features/billing/hooks/useStripeBilling';
import { formatBillingPrice } from '@/features/billing/services/stripeBillingService';
import { getAccountSubscriptionState } from '@/features/billing/utils/accountSubscriptionState';
import { useUserRole } from '@/hooks/useUserRole';

const formatDate = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(value))
    : '—';

const planNames = {
  free_trial: 'Teste gratuito',
  monthly: 'Plano mensal',
  annual: 'Plano anual',
} as const;

const AccountSubscription = () => {
  const reduceMotion = useReducedMotion();
  const overview = useStripeBillingOverview();
  const portal = useStripePortal();
  const { isAdmin, isOwner, loading: roleLoading } = useUserRole();
  const data = overview.data;
  const subscription = data?.subscription;

  const handleOpenPortal = async () => {
    // Open synchronously from the click gesture so browsers do not treat the
    // Stripe portal as an unsolicited popup after the async request finishes.
    const portalWindow = window.open('about:blank', '_blank');
    if (portalWindow) {
      portalWindow.opener = null;
    }

    try {
      const response = await portal.mutateAsync();
      if (portalWindow) {
        portalWindow.location.assign(response.url);
        return;
      }

      // A popup blocker must not make billing inaccessible. In that exception,
      // retain the previous safe same-tab behavior.
      window.location.assign(response.url);
    } catch {
      portalWindow?.close();
      // The mutation owns the visible error state below. Avoid an unhandled
      // promise rejection while keeping the user on this safe page.
    }
  };

  if (overview.isLoading || roleLoading) {
    return <SubscriptionLoading />;
  }

  if (overview.isError || !data) {
    return (
      <SubscriptionFrame>
        <StatePanel
          icon={<TriangleAlert className="h-6 w-6" />}
          title="Não conseguimos carregar sua assinatura"
          description="Seus dados não foram alterados. Confira sua conexão e tente novamente."
          action={
            <button
              type="button"
              onClick={() => void overview.refetch()}
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#17122b] px-5 text-sm font-black text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
          }
        />
      </SubscriptionFrame>
    );
  }

  const isStripeSubscriber = data.source === 'stripe' && Boolean(subscription);
  const hasInternalAccess = isAdmin && !isStripeSubscriber;
  const subscriptionEnd = subscription?.cancel_at ?? subscription?.current_period_end;
  const pageState = getAccountSubscriptionState(data, hasInternalAccess);
  const summaryValue = pageState.summaryValue ?? formatDate(subscriptionEnd ?? data.access_until);

  return (
    <SubscriptionFrame>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section>
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-[2rem] bg-[#17122b] p-6 text-white shadow-[0_30px_80px_-38px_rgba(23,18,43,0.9)] sm:p-8"
          >
            <div className="flex flex-col justify-between gap-8 sm:flex-row">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em]">
                  <Sparkles className="h-4 w-4 text-[#dfff65]" />
                  {pageState.badge}
                </span>
                <h1 className="mt-6 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
                  {hasInternalAccess ? (isOwner ? 'Proprietário' : 'Administrador') : planNames[data.plan]}
                </h1>
                <p className="mt-3 max-w-md text-sm font-medium leading-6 text-white/60">
                  {pageState.heroDescription}
                </p>
              </div>
              <div className="min-w-[170px] rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
                  {hasInternalAccess
                    ? 'Vínculo'
                    : pageState.kind === 'ended'
                      ? 'Último valor'
                      : isStripeSubscriber
                        ? 'Valor do plano'
                        : 'Acesso até'}
                </p>
                <p className="mt-2 text-xl font-black">
                  {hasInternalAccess
                    ? 'Sem cobrança'
                    : subscription
                    ? formatBillingPrice(subscription.amount_cents, subscription.currency)
                    : formatDate(data.access_until)}
                </p>
                {subscription && (
                  <p className="mt-1 text-xs font-semibold text-white/50">
                    por {subscription.billing_interval === 'year' ? 'ano' : 'mês'}
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {pageState.alertTitle && (
            <div className="mt-5 rounded-3xl border border-[#ffd49d] bg-[#fff7e8] p-5 text-[#6d4410]">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-black">{pageState.alertTitle}</p>
                  <p className="mt-1 text-sm font-medium leading-6 opacity-80">
                    {pageState.alertDescription ?? `Você mantém acesso até ${formatDate(subscriptionEnd)}.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <DetailCard
              icon={<CalendarDays className="h-5 w-5" />}
              label={pageState.summaryLabel}
              value={summaryValue}
            />
            <DetailCard
              icon={<CreditCard className="h-5 w-5" />}
              label="Pagamento"
              value={
                hasInternalAccess
                  ? 'Não se aplica'
                  : subscription?.card_last4
                  ? `${subscription.card_brand?.toUpperCase() || 'Cartão'} •••• ${subscription.card_last4}`
                  : isStripeSubscriber
                    ? 'Cartão via Stripe'
                    : 'Nenhum cartão cadastrado'
              }
            />
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_24px_70px_-42px_rgba(36,24,77,0.55)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eeeaff] text-[#6048ed]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-xl font-black tracking-[-0.025em]">
              {pageState.asideTitle}
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[#6d657d]">
              {pageState.asideDescription}
            </p>

            {pageState.primaryAction === 'none' ? (
              <div className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#eef9df] px-5 text-sm font-black text-[#315d18]">
                <CheckCircle2 className="h-5 w-5" />
                {pageState.primaryActionLabel}
              </div>
            ) : pageState.primaryAction === 'portal' ? (
              <button
                type="button"
                onClick={() => void handleOpenPortal()}
                disabled={portal.isPending}
                className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6b4df5] to-[#2478ff] px-5 text-sm font-black text-white shadow-[0_16px_35px_-18px_rgba(78,73,235,0.9)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {portal.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                {pageState.primaryActionLabel}
              </button>
            ) : (
              <Link
                to="/planos"
                className="group mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6b4df5] to-[#2478ff] px-5 text-sm font-black text-white shadow-[0_16px_35px_-18px_rgba(78,73,235,0.9)] transition hover:-translate-y-0.5"
              >
                {pageState.primaryActionLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            )}
            {pageState.secondaryPortalLabel && (
              <button
                type="button"
                onClick={() => void handleOpenPortal()}
                disabled={portal.isPending}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#d8d1ed] bg-white px-5 text-sm font-black text-[#4e4562] transition hover:border-[#a89bea] hover:text-[#34266f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {portal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                {pageState.secondaryPortalLabel}
              </button>
            )}
            {portal.isError && (
              <p role="alert" className="mt-4 text-sm font-bold text-[#a52d3b]">
                Não conseguimos abrir o gerenciamento agora. Nenhuma alteração foi feita. Tente novamente.
              </p>
            )}
          </div>

          <div className="hidden overflow-hidden rounded-[2rem] bg-[#e9e3ff] p-3 xl:block">
            <BillingArtwork nextStep={pageState.artworkNextStep} />
          </div>
        </aside>
      </div>
    </SubscriptionFrame>
  );
};

const SubscriptionFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full pb-10">
    <AccountNavigation current="assinatura" />
    <main className="-mx-3 min-h-full overflow-hidden bg-[#f8f6ff] px-4 py-7 text-[#17122b] sm:-mx-4 sm:px-7 lg:-mx-5 xl:-mx-6 xl:px-10">
      <div className="pointer-events-none absolute right-[3%] top-[12%] h-72 w-72 rounded-full bg-[#bcd6ff]/25 blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#6652ee]">Conta e pagamento</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Minha assinatura</h1>
        </div>
        {children}
      </div>
    </main>
  </div>
);

const DetailCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_18px_55px_-40px_rgba(36,24,77,0.55)]">
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eeeaff] text-[#6048ed]">{icon}</div>
    <p className="mt-4 text-xs font-black uppercase tracking-[0.15em] text-[#7c748c]">{label}</p>
    <p className="mt-1 text-base font-black text-[#211a35]">{value}</p>
  </div>
);

const StatePanel = ({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <div className="mx-auto max-w-xl rounded-[2rem] border border-white/80 bg-white/90 p-8 text-center shadow-[0_28px_80px_-42px_rgba(36,24,77,0.5)]">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eeeaff] text-[#6048ed]">{icon}</div>
    <h2 className="mt-5 text-xl font-black">{title}</h2>
    <p className="mt-2 text-sm font-medium leading-6 text-[#6d657d]">{description}</p>
    {action}
  </div>
);

const SubscriptionLoading = () => (
  <SubscriptionFrame>
    <StatePanel
      icon={<Loader2 className="h-6 w-6 animate-spin" />}
      title="Carregando sua assinatura"
      description="Organizando os dados do seu plano…"
    />
  </SubscriptionFrame>
);

export default AccountSubscription;
