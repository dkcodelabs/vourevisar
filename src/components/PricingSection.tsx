import React from 'react';
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

const PlanCardSkeleton = () => (
  <div className="p-8 rounded-[2.5rem] bg-card border border-border animate-pulse flex flex-col">
    <div className="h-4 w-20 bg-foreground/10 rounded mb-4" />
    <div className="h-6 w-24 bg-foreground/10 rounded mb-2" />
    <div className="h-10 w-32 bg-foreground/10 rounded mb-6" />
    <div className="space-y-3 mb-8 flex-grow">
      {[1,2,3,4].map(i => <div key={i} className="h-4 w-40 bg-foreground/10 rounded" />)}
    </div>
    <div className="h-10 w-full bg-foreground/10 rounded-xl" />
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
  
  const monthly = plans?.monthly;
  const annual = plans?.annual;
  const isMonthlyCurrent = currentPlan === 'monthly';
  const isAnnualCurrent = currentPlan === 'annual';
  const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;
  const isMonthlyDisabled = isMonthlyCurrent || isAnnualCurrent;
  const isAnnualDisabled = isAnnualCurrent || annualUpgradeBlocked || (renewalCanceled && isMonthlyCurrent);
  const showAnnualAction = true;

  if (loading || !monthly || !annual) {
    return (
      <section id="precos" className="py-8 bg-transparent">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">
            <PlanCardSkeleton />
            <PlanCardSkeleton />
          </div>
        </div>
      </section>
    );
  }

  const annualEquivalentMonthly = annual.value / 12;
  const monthlyButtonLabel = isMonthlyCurrent
    ? 'Plano atual'
    : isAnnualCurrent
      ? 'Incluído no plano anual'
      : `Assinar ${monthly.name}`;
  const annualButtonLabel = isAnnualCurrent
    ? 'Plano atual'
    : annualUpgradeScheduled
      ? 'Troca já agendada'
    : isAnnualDisabled
      ? 'Disponível após o plano atual'
      : `Assinar ${annual.name}`;

  return (
    <section id="precos" className="py-8 bg-transparent">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">
          
          {/* Plano Mensal */}
          <div className={`group p-8 rounded-[2.5rem] bg-card border transition-all duration-500 shadow-sm relative overflow-hidden flex flex-col ${isMonthlyCurrent ? 'border-blue-500/40' : 'border-border hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5'}`}>
            <div className="relative z-10 flex flex-col h-full">
              <span className="text-[10px] font-black tracking-[0.2em] text-blue-500 uppercase mb-4 block">
                {isMonthlyCurrent ? 'Plano atual' : 'Flexibilidade'}
              </span>
              <h3 className="text-2xl font-bold text-foreground mb-2 font-display">{monthly.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-black text-foreground tracking-tight">R$ {monthly.value.toFixed(2).replace('.', ',')}</span>
                <span className="text-muted-foreground font-medium text-sm">/mês</span>
              </div>
              
              <ul className="space-y-3.5 mb-8 flex-grow">
                {monthly.features.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-[13px] text-foreground/80 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              
              <button 
                onClick={() => onPlanSelect('monthly')}
                disabled={isMonthlyDisabled}
                className="w-full min-h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs tracking-widest uppercase shadow-lg shadow-blue-600/20 transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
              >
                {monthlyButtonLabel}
              </button>
            </div>
          </div>

          {/* Plano Anual */}
          <div className={`group p-8 rounded-[2.5rem] bg-card border transition-all duration-500 shadow-sm relative overflow-hidden flex flex-col ${isAnnualCurrent ? 'border-blue-500/40' : 'border-border hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5'}`}>
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/5 blur-[80px] group-hover:bg-blue-500/10 transition-all duration-700"></div>
            
            <div className="relative z-10 flex flex-col h-full">
              {annual.badge && (
                <div className="inline-flex self-start items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-[9px] font-black rounded-full mb-4 shadow-lg shadow-blue-600/30 tracking-widest uppercase">
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  {annual.badge}
                </div>
              )}
              
              <h3 className="text-2xl font-bold text-foreground mb-2 font-display">{annual.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-black text-foreground tracking-tight">{formatCurrency(annual.value)}</span>
                <span className="text-muted-foreground font-medium text-sm">/ano</span>
              </div>
              {annualEquivalentMonthly > 0 ? (
                <p className="mb-6 -mt-4 text-xs font-semibold text-muted-foreground">
                  Equivale a {formatCurrency(annualEquivalentMonthly)}/mês.
                </p>
              ) : null}
              
              <ul className="space-y-3.5 mb-8 flex-grow">
                {annual.features.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-[13px] text-foreground/80 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              
              {showAnnualAction ? (
                <button
                  onClick={() => onPlanSelect('annual')}
                  disabled={isAnnualDisabled}
                  className="w-full min-h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs tracking-widest uppercase shadow-lg shadow-blue-600/20 transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
                >
                  {annualButtonLabel}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
