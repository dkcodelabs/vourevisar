import React from 'react';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import type { BillingPricingPlans } from '@/features/billing/types';

interface PricingSectionProps {
  onPlanSelect: (plan: 'monthly' | 'annual') => void;
  plans: BillingPricingPlans | null;
  loading?: boolean;
  currentPlan?: 'monthly' | 'annual' | null;
  annualUpgradeBlocked?: boolean;
  annualUpgradeScheduled?: boolean;
  renewalCanceled?: boolean;
}

const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

const PlanSkeleton = () => (
  <div className="min-h-80 animate-pulse rounded-2xl bg-muted p-6">
    <div className="h-5 w-28 rounded bg-foreground/10" />
    <div className="mt-5 h-10 w-40 rounded bg-foreground/10" />
    <div className="mt-8 space-y-3">
      {[1, 2, 3, 4].map((item) => <div key={item} className="h-4 w-full rounded bg-foreground/10" />)}
    </div>
  </div>
);

export const PricingSection: React.FC<PricingSectionProps> = ({
  onPlanSelect,
  plans,
  loading,
  currentPlan = null,
  annualUpgradeBlocked = false,
  annualUpgradeScheduled = false,
  renewalCanceled = false,
}) => {
  if (loading || !plans) {
    return (
      <section id="precos" className="scroll-mt-6" aria-label="Carregando planos">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
          <PlanSkeleton />
          <PlanSkeleton />
        </div>
      </section>
    );
  }

  const { monthly, annual } = plans;
  const isMonthlyCurrent = currentPlan === 'monthly';
  const isAnnualCurrent = currentPlan === 'annual';
  const isMonthlyDisabled = isMonthlyCurrent || isAnnualCurrent;
  const isAnnualDisabled = isAnnualCurrent || annualUpgradeBlocked || (renewalCanceled && isMonthlyCurrent);
  const annualEquivalent = annual.value / 12;
  const annualSavings = Math.max(0, monthly.value * 12 - annual.value);
  const annualDiscount = monthly.value > 0
    ? Math.round((annualSavings / (monthly.value * 12)) * 100)
    : 0;
  const monthlyButtonLabel = isMonthlyCurrent
    ? 'Plano atual'
    : isAnnualCurrent
      ? 'Incluído no plano anual'
      : 'Assinar mensal';
  const annualButtonLabel = isAnnualCurrent
    ? 'Plano atual'
    : annualUpgradeScheduled
      ? 'Troca já agendada'
      : isAnnualDisabled
        ? 'Disponível após o plano atual'
        : 'Assinar anual';

  return (
    <section id="precos" className="scroll-mt-6" aria-labelledby="pricing-title">
      <div className="mb-5 max-w-2xl">
        <h2 id="pricing-title" className="text-2xl font-extrabold tracking-[-0.025em] text-foreground sm:text-3xl">Escolha o ritmo que cabe na sua preparação.</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Os dois planos mantêm o estudo completo. O anual reduz o custo mensal; o mensal preserva flexibilidade.</p>
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
        <article className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6">
          <div>
            <h3 className="text-xl font-extrabold">{monthly.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Controle mês a mês, sem compromisso anual.</p>
          </div>
          <div className="mt-6 flex items-end gap-1.5">
            <span className="text-4xl font-extrabold tracking-[-0.035em] tabular-nums">{formatCurrency(monthly.value)}</span>
            <span className="pb-1 text-sm font-semibold text-muted-foreground">/mês</span>
          </div>
          <ul className="mt-7 space-y-3 text-sm">
            {monthly.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="leading-5 text-foreground/80">{feature}</span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => onPlanSelect('monthly')} disabled={isMonthlyDisabled} className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border-strong bg-background px-4 text-sm font-bold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground">
            {monthlyButtonLabel}
          </button>
        </article>

        <article className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl bg-[hsl(var(--activation-ink))] p-5 text-white shadow-[0_24px_60px_-36px_rgba(17,16,37,0.78)] sm:p-7">
          <div className="absolute right-0 top-0 h-40 w-40 bg-[linear-gradient(135deg,transparent,hsl(var(--primary)/0.2))]" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-extrabold">{annual.name}</h3>
              <p className="mt-1 text-sm text-blue-100/[0.65]">Doze meses de acesso com o menor custo mensal.</p>
            </div>
            {annualDiscount > 0 ? (
              <span className="rounded-full bg-[hsl(var(--activation-lime))] px-3 py-1.5 text-xs font-extrabold text-[hsl(var(--activation-ink))]">Economize {annualDiscount}%</span>
            ) : null}
          </div>

          <div className="relative mt-7 flex flex-wrap items-end gap-x-3 gap-y-1">
            <span className="text-[clamp(2.55rem,6vw,4rem)] font-extrabold leading-none tracking-[-0.04em] tabular-nums">{formatCurrency(annual.value)}</span>
            <span className="pb-1 text-sm font-semibold text-white/[0.55]">/ano</span>
          </div>
          <p className="relative mt-2 text-sm font-bold text-[hsl(var(--activation-lime))]">{formatCurrency(annualEquivalent)}/mês · economia de {formatCurrency(annualSavings)} no ano</p>

          <div className="relative mt-7 grid gap-x-5 gap-y-3 sm:grid-cols-2">
            {annual.features.map((feature) => (
              <div key={feature} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-[hsl(var(--activation-lime))]" />
                <span className="leading-5 text-white/80">{feature}</span>
              </div>
            ))}
          </div>

          <button type="button" onClick={() => onPlanSelect('annual')} disabled={isAnnualDisabled} className="relative mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-extrabold text-white shadow-[0_16px_36px_-20px_hsl(var(--primary)/0.85)] transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/[0.45] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/[0.45] disabled:shadow-none">
            {annualButtonLabel}
            {!isAnnualDisabled ? <ArrowRight className="size-4" /> : null}
          </button>
        </article>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
        <ShieldCheck className="size-4 text-primary" />
        Pagamento protegido e processado pela Stripe.
      </div>
    </section>
  );
};
