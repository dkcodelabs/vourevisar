import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AccountNavigation } from '@/components/account/AccountNavigation';
import { BillingInvoiceHistory } from '@/features/billing/components/BillingInvoiceHistory';
import { BillingWithdrawalPanel } from '@/features/billing/components/BillingWithdrawalPanel';
import { ScheduledAnnualPlanChange } from '@/features/billing/components/ScheduledAnnualPlanChange';
import {
  useStripeBillingOverview,
  useStripeCatalog,
  useStripeInvoiceHistory,
  useStripePortal,
} from '@/features/billing/hooks/useStripeBilling';
import {
  formatBillingPrice,
  getSafeBillingErrorMessage,
} from '@/features/billing/services/stripeBillingService';
import { buildStripePricingPlans } from '@/features/billing/utils/catalogPricing';
import { getAccountSubscriptionState } from '@/features/billing/utils/accountSubscriptionState';
import { useUserRole } from '@/hooks/useUserRole';
import {
  isBillingPlanChangeEnabled,
  isBillingWithdrawalEnabled,
} from '@/features/billing/legal/billingLegalDocuments';

const withdrawalEnabled = isBillingWithdrawalEnabled();
const planChangeEnabled = isBillingPlanChangeEnabled();

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
  const data = overview.data;
  const subscription = data?.subscription;
  const catalog = useStripeCatalog(Boolean(
    data?.is_active && (
      data.plan === 'free_trial' ||
      data.source === 'trial' ||
      (planChangeEnabled && data.source === 'stripe' && subscription?.plan === 'monthly')
    ),
  ));
  const portal = useStripePortal();
  const { isAdmin, isOwner, loading: roleLoading } = useUserRole();
  const invoiceHistory = useStripeInvoiceHistory(Boolean(
    data?.source === 'stripe' && data.subscription,
  ));

  const handleOpenPortal = async () => {
    try {
      const response = await portal.mutateAsync();
      // Keep the portal in this tab. Returning from Stripe then reuses the
      // same-origin Supabase session instead of booting a second auth context
      // in a new tab and flashing the login screen.
      window.location.assign(response.url);
    } catch {
      // The mutation owns the visible error state below.
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
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-primary-foreground"
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
  const hasHistoricalCanceledStripeSubscription = subscription?.status === 'canceled';
  const hasInternalAccess = isAdmin && !isStripeSubscriber;
  // A prior Stripe subscription can coexist with an active internal trial or
  // manual grant. It is history in that case, not the current billing source.
  const activeStripeSubscription = isStripeSubscriber ? subscription : null;
  const shouldShowInvoiceHistory = isStripeSubscriber || hasHistoricalCanceledStripeSubscription;
  const subscriptionEnd = activeStripeSubscription?.cancel_at ?? activeStripeSubscription?.current_period_end;
  const pageState = getAccountSubscriptionState(data, hasInternalAccess);
  const isComplimentaryAccess = data.plan === 'free_trial' || data.source === 'trial';
  const pricingPlans = buildStripePricingPlans(catalog.data);
  const annualCatalogPlan = catalog.data?.find((plan) => plan.code === 'annual');
  const annualPriceLabel = annualCatalogPlan
    ? formatBillingPrice(annualCatalogPlan.amountCents, annualCatalogPlan.currency)
    : null;
  const showsTrialOffer = pageState.kind === 'trial' && data.is_active && isComplimentaryAccess;
  const withdrawalEligible = withdrawalEnabled && data.withdrawal?.eligible === true;
  const withdrawalInvoice = (invoiceHistory.data ?? []).find((invoice) => invoice.status === 'paid');
  const withdrawalAmountLabel = withdrawalInvoice
    ? formatBillingPrice(withdrawalInvoice.amount_cents, withdrawalInvoice.currency)
    : null;
  const isMonthlyPlanChangeCandidate = planChangeEnabled &&
    activeStripeSubscription?.plan === 'monthly' &&
    activeStripeSubscription.status === 'active' &&
    !activeStripeSubscription.cancel_at_period_end &&
    !activeStripeSubscription.cancel_at &&
    Boolean(activeStripeSubscription.current_period_end);
  // Inside the statutory withdrawal window, keep only the first-party
  // cancellation-and-refund action visible. The Stripe Portal remains
  // intentionally unavailable in the UI so the student never faces two
  // cancellation paths with different financial effects.
  const showManagementCard = !withdrawalEligible;
  const managementTitle = pageState.asideTitle;
  const managementDescription = pageState.asideDescription;
  const managementActionLabel = pageState.primaryActionLabel;
  const portalErrorMessage = portal.isError
    ? getSafeBillingErrorMessage(
        portal.error,
        'Não conseguimos abrir o gerenciamento agora. Nenhuma alteração foi feita. Tente novamente em alguns instantes.',
      )
    : null;
  const summaryValue = pageState.summaryValue ?? formatDate(
    isStripeSubscriber ? subscriptionEnd : data.access_until,
  );
  const periodEndValue = formatDate(isStripeSubscriber ? subscriptionEnd : data.access_until);
  const showsPeriodInHero = (
    pageState.kind === 'ending' || pageState.kind === 'trial'
  ) && periodEndValue !== '—';
  return (
    <SubscriptionFrame>
      <div className={`grid gap-5 ${showsTrialOffer ? 'xl:grid-cols-[0.8fr_1.2fr]' : 'xl:grid-cols-[minmax(0,1fr)_20rem]'}`}>
        <section className="min-w-0">
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-3xl bg-[#17122b] p-5 text-white shadow-[0_30px_80px_-38px_rgba(23,18,43,0.9)] sm:p-6"
          >
            <div className="flex flex-col justify-between gap-5 sm:flex-row">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em]">
                  <Sparkles className="h-4 w-4 text-[#dfff65]" />
                  {pageState.badge}
                </span>
                {showsPeriodInHero && (
                  <div className="mt-3 flex items-center gap-2 text-sm font-bold text-white/80">
                    <CalendarDays className="h-4 w-4 text-[#dfff65]" />
                    <span>
                      {pageState.summaryLabel}{' '}
                      <span className="text-white">{periodEndValue}</span>
                    </span>
                  </div>
                )}
                <h2 className="mt-5 text-3xl font-black tracking-[-0.045em] sm:text-[2.15rem]">
                  {hasInternalAccess ? (isOwner ? 'Proprietário' : 'Administrador') : planNames[data.plan]}
                </h2>
                <p className="mt-3 max-w-md text-sm font-medium leading-6 text-white/60">
                  {pageState.heroDescription}
                </p>
              </div>
              <div className="min-w-[155px] rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
                  {hasInternalAccess
                    ? 'Vínculo'
                    : pageState.kind === 'ended'
                      ? 'Último valor'
                      : isStripeSubscriber
                        ? 'Valor do plano'
                        : isComplimentaryAccess
                          ? 'Acesso gratuito'
                          : 'Acesso concedido'}
                </p>
                <p className="mt-2 text-xl font-black">
                  {hasInternalAccess
                    ? 'Sem cobrança'
                    : activeStripeSubscription
                    ? formatBillingPrice(subscription.amount_cents, subscription.currency)
                    : 'Sem cobrança'}
                </p>
                {activeStripeSubscription && (
                  <p className="mt-1 text-xs font-semibold text-white/50">
                    por {subscription.billing_interval === 'year' ? 'ano' : 'mês'}
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {pageState.alertTitle && (
            <div className="mt-5 rounded-3xl border border-warning/30 bg-warning/10 p-5 text-foreground">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-black">{pageState.alertTitle}</p>
                  <p className="mt-1 text-sm font-medium leading-6 opacity-80">
                    {pageState.alertDescription
                      ? `${pageState.alertDescription} Você mantém acesso até ${formatDate(subscriptionEnd)}.`
                      : `Você mantém acesso até ${formatDate(subscriptionEnd)}.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!showsPeriodInHero && (
            <div className="mt-5">
              <DetailCard
                icon={<CalendarDays className="h-5 w-5" />}
                label={pageState.summaryLabel}
                value={summaryValue}
              />
            </div>
          )}

          {shouldShowInvoiceHistory && (
            <BillingInvoiceHistory
              invoices={invoiceHistory.data ?? []}
              isLoading={invoiceHistory.isLoading}
              isError={invoiceHistory.isError}
            />
          )}
        </section>

        <aside className={`min-w-0 space-y-5 ${showsTrialOffer ? 'order-first' : ''}`}>
          {withdrawalEnabled && subscription && data.withdrawal && (
            <BillingWithdrawalPanel
              withdrawal={data.withdrawal}
              amountLabel={withdrawalAmountLabel}
            />
          )}
          {!withdrawalEligible && isMonthlyPlanChangeCandidate && activeStripeSubscription?.current_period_end && (
              <ScheduledAnnualPlanChange
                currentPeriodEnd={activeStripeSubscription.current_period_end}
                scheduled={activeStripeSubscription.scheduled_plan === 'annual'}
                annualPriceLabel={annualPriceLabel}
                withdrawalDeadline={withdrawalEligible ? data.withdrawal?.deadline : null}
              />
            )}
          {showsTrialOffer ? (
            <TrialConversionOffer plans={pricingPlans} isLoading={catalog.isLoading} />
          ) : showManagementCard ? (
            <>
              <div className="rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-[0_24px_70px_-42px_rgba(15,23,42,0.16)] dark:shadow-[0_24px_70px_-42px_rgba(0,0,0,0.52)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-xl font-black tracking-[-0.025em]">
                  {managementTitle}
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
                  {managementDescription}
                </p>

                {pageState.primaryAction === 'none' ? (
                  <div className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-success/15 px-5 text-sm font-black text-success">
                    <CheckCircle2 className="h-5 w-5" />
                    {managementActionLabel}
                  </div>
                ) : pageState.primaryAction === 'portal' ? (
                  <button
                    type="button"
                    onClick={() => void handleOpenPortal()}
                    disabled={portal.isPending}
                    className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-info px-5 text-sm font-black text-primary-foreground shadow-[0_16px_35px_-18px_hsl(var(--primary)/0.7)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {portal.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    {managementActionLabel}
                  </button>
                ) : (
                  <Link
                    to="/planos"
                    className="group mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-info px-5 text-sm font-black text-primary-foreground shadow-[0_16px_35px_-18px_hsl(var(--primary)/0.7)] transition hover:-translate-y-0.5"
                  >
                    {pageState.primaryActionLabel}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                )}
                {portal.isError && (
                  <p role="alert" className="mt-4 text-sm font-bold text-destructive">
                    {portalErrorMessage}
                  </p>
                )}
              </div>
            </>
          ) : null}
        </aside>
      </div>
    </SubscriptionFrame>
  );
};

const SubscriptionFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full">
    <AccountNavigation current="assinatura" className="mb-4" />
    <section aria-labelledby="account-subscription-title" className="relative py-4 text-foreground">
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Conta e pagamento</p>
          <h1 id="account-subscription-title" className="mt-2 text-3xl font-black tracking-[-0.04em]">Minha assinatura</h1>
        </div>
        {children}
      </div>
    </section>
  </div>
);

const TrialConversionOffer = ({
  plans,
  isLoading,
}: {
  plans: ReturnType<typeof buildStripePricingPlans>;
  isLoading: boolean;
}) => {
  if (isLoading) {
    return <div className="min-h-[360px] animate-pulse rounded-[2rem] border border-border bg-card p-6" />;
  }

  if (!plans) {
    return (
      <div className="rounded-[2rem] border border-border bg-card p-6 text-card-foreground shadow-[0_24px_70px_-42px_rgba(15,23,42,0.16)] dark:shadow-[0_24px_70px_-42px_rgba(0,0,0,0.52)]">
        <h2 className="text-xl font-black tracking-[-0.025em]">Continue sem interromper seu ritmo</h2>
        <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">Confira as opções disponíveis e escolha quando quiser continuar.</p>
        <Link to="/planos" className="mt-6 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-info px-5 text-sm font-black text-primary-foreground">
          Ver planos
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const annualEquivalent = plans.annual.value / 12;
  const annualSavings = (plans.monthly.value * 12) - plans.annual.value;
  const annualDiscount = Math.round((annualSavings / (plans.monthly.value * 12)) * 100);
  const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

  return (
    <section aria-labelledby="trial-conversion-title" className="rounded-[2rem] border border-primary/30 bg-card p-5 text-card-foreground shadow-[0_24px_70px_-42px_rgba(15,23,42,0.16)] dark:shadow-[0_24px_70px_-42px_rgba(0,0,0,0.52)]">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Continue sua preparação</p>
      <h2 id="trial-conversion-title" className="mt-2 text-xl font-black tracking-[-0.025em]">Escolha seu plano agora</h2>
      <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">Mantenha seus editais, ciclo e revisões sem perder o progresso.</p>

      <Link to="/checkout?plan=annual&from=subscription" className="mt-4 block rounded-2xl border-2 border-primary bg-primary/5 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-primary">ANUAL · MELHOR ESCOLHA</p>
            <p className="mt-1 text-lg font-black text-foreground">{formatCurrency(plans.annual.value)} <span className="text-sm text-muted-foreground">/ ano</span></p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">{annualDiscount}% menos</span>
        </div>
        <p className="mt-2 text-xs font-semibold text-muted-foreground">{formatCurrency(annualEquivalent)}/mês · economize {formatCurrency(annualSavings)} no ano</p>
        <span className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-info px-4 text-sm font-black text-primary-foreground">Assinar anual <ArrowRight className="h-4 w-4" /></span>
      </Link>

      <Link to="/checkout?plan=monthly&from=subscription" className="mt-3 flex items-center justify-between rounded-2xl border border-border px-4 py-3 text-foreground transition hover:border-primary/50 hover:bg-muted/50">
        <span><span className="block text-sm font-black">Mensal</span><span className="text-xs font-semibold text-muted-foreground">{formatCurrency(plans.monthly.value)} por mês</span></span>
        <span className="text-xs font-black text-primary">Assinar</span>
      </Link>
      <p className="mt-4 text-center text-xs font-semibold text-muted-foreground">Cartão processado em ambiente seguro pela Stripe.</p>
      <Link to="/dashboard" className="mt-4 block text-center text-xs font-bold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Continuar no teste gratuito</Link>
    </section>
  );
};

const DetailCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-[0_18px_55px_-40px_rgba(15,23,42,0.16)] dark:shadow-[0_18px_55px_-40px_rgba(0,0,0,0.52)]">
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
    <p className="mt-4 text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
    <p className="mt-1 text-base font-black text-foreground">{value}</p>
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
  <div className="mx-auto max-w-xl rounded-[2rem] border border-border bg-card p-8 text-center text-card-foreground shadow-[0_28px_80px_-42px_rgba(15,23,42,0.16)] dark:shadow-[0_28px_80px_-42px_rgba(0,0,0,0.52)]">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
    <h2 className="mt-5 text-xl font-black">{title}</h2>
    <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">{description}</p>
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
