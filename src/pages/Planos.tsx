import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { PricingSection } from '@/components/PricingSection';
import {
  useStripeBillingOverview,
  useStripeCatalog,
} from '@/features/billing/hooks/useStripeBilling';
import { getSafeBillingErrorMessage } from '@/features/billing/services/stripeBillingService';
import { buildStripePricingPlans } from '@/features/billing/utils/catalogPricing';

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const [dateOnly] = value.split('T');
  const [year, month, day] = dateOnly.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(year, month - 1, day),
  );
};

const Planos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const catalog = useStripeCatalog();
  const billing = useStripeBillingOverview(Boolean(user));
  const subscription = billing.data?.subscription;
  const renewalCanceled = Boolean(subscription?.cancel_at_period_end || subscription?.cancel_at);
  const currentPlan = billing.data?.source === 'stripe' && billing.data.is_active &&
    (billing.data.plan === 'monthly' || billing.data.plan === 'annual')
    ? billing.data.plan
    : null;
  const isMonthlyActive = currentPlan === 'monthly';
  const isAnnualActive = currentPlan === 'annual';
  const annualUpgradeBlocked = isMonthlyActive;
  const accessReason = (location.state as { reason?: string } | null)?.reason;
  const accessNotice = accessReason === 'subscription_expired'
    ? 'Sua assinatura expirou. Renove seu plano para voltar a acessar seus estudos.'
    : accessReason === 'subscription_required'
      ? 'Seu acesso ainda não está ativo. Escolha um plano para abrir seus editais e continuar seus estudos.'
      : null;

  const handlePlanSelect = (plan: 'monthly' | 'annual') => {
    if (plan === 'annual' && annualUpgradeBlocked) {
      return;
    }

    if (isAnnualActive || plan === currentPlan) {
      navigate('/conta/assinatura');
      return;
    }

    if (user) {
      navigate(`/checkout?plan=${plan}`);
    } else {
      navigate('/login?redirect=planos');
    }
  };

  const subscriptionEnd = subscription?.cancel_at ?? subscription?.current_period_end;
  const canceledAccessDate = subscriptionEnd
    ? formatDate(subscriptionEnd)
    : null;
  const subscriptionEndDate = formatDate(subscriptionEnd);
  const subscriptionDisplayDateLabel = renewalCanceled ? 'Acesso até' : 'Próxima renovação';
  const paymentMethodLabel = subscription?.card_last4
    ? `${subscription.card_brand?.toUpperCase() || 'Cartão'} •••• ${subscription.card_last4}`
    : 'Cartão via Stripe';
  const pricingPlans = buildStripePricingPlans(catalog.data);
  const title = renewalCanceled && currentPlan
    ? `Seu plano ${currentPlan === 'annual' ? 'anual' : 'mensal'} não será renovado`
    : isAnnualActive
      ? 'Seu plano anual está ativo'
    : isMonthlyActive
      ? 'Seu plano mensal está ativo'
      : 'Escolha seu plano';
  const description = renewalCanceled && currentPlan
    ? canceledAccessDate
      ? `Você mantém acesso até ${canceledAccessDate}. Nenhuma nova cobrança será gerada.`
      : 'Sua renovação foi cancelada. Consulte a assinatura para ver os detalhes do acesso.'
    : isAnnualActive
      ? 'Você garantiu 12 meses de acesso pelo melhor custo mensal.'
    : isMonthlyActive
      ? 'Confira sua assinatura atual e os valores dos planos disponíveis.'
      : 'Escolha o plano que mantém suas revisões, editais e ciclo de estudos sempre ao seu alcance.';
  const catalogErrorMessage = catalog.isError
    ? getSafeBillingErrorMessage(
        catalog.error,
        'Não conseguimos carregar os planos agora. Nenhuma cobrança foi iniciada. Tente novamente em alguns instantes.',
      )
    : null;

  return (
    <div className="w-full pb-10">
      <div className="max-w-7xl mx-auto px-6">
        {accessNotice ? (
          <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-primary/30 bg-primary/10 px-5 py-4 text-center">
            <p className="text-sm font-semibold leading-relaxed text-foreground">{accessNotice}</p>
          </div>
        ) : null}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            {title}
          </h2>
          <p className="text-[13px] text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        {currentPlan ? (
          <div className="mx-auto mb-10 grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
            <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Assinatura atual</p>
              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{currentPlan === 'annual' ? 'Anual' : 'Mensal'}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {renewalCanceled ? 'Renovação cancelada' : 'Acesso ativo'}
                  </p>
                </div>
                <span className="rounded-full border border-primary/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                  {renewalCanceled ? 'Até o fim do período' : 'Ativo'}
                </span>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border/60 pt-4 text-xs">
                <div>
                  <dt className="text-muted-foreground">{subscriptionDisplayDateLabel}</dt>
                  <dd className="mt-1 font-semibold text-foreground">{subscriptionEndDate || 'Período vigente'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Pagamento</dt>
                  <dd className="mt-1 font-semibold text-foreground">{paymentMethodLabel || 'Não informado'}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => navigate('/conta/assinatura')}
                className="mt-5 h-9 w-full rounded-xl bg-primary px-4 text-[11px] font-black uppercase tracking-widest text-primary-foreground transition hover:bg-primary/90"
              >
                Gerenciar assinatura
              </button>
            </section>

            <section className="rounded-2xl border border-border/70 bg-card p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Disponibilidade dos planos</p>
              <h3 className="mt-3 text-lg font-bold text-foreground">
                {renewalCanceled ? 'Você continua com acesso até o fim do período' : 'Compare os planos disponíveis'}
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {renewalCanceled
                  ? `Seu acesso ${currentPlan === 'annual' ? 'anual' : 'mensal'} segue ativo até ${canceledAccessDate || 'o fim do período atual'}. Depois disso, você poderá escolher Mensal ou Anual. Nenhuma cobrança nova será gerada até lá.`
                  : 'Escolha a opção que melhor acompanha seu ritmo de estudo. O plano atual e as cobranças ficam sempre disponíveis em Gerenciar assinatura.'}
              </p>
            </section>
          </div>
        ) : null}
        
        {catalog.isError ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-destructive/25 bg-destructive/10 px-5 py-5 text-center">
            <p className="text-sm font-bold text-foreground">Não conseguimos carregar os planos agora.</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">{catalogErrorMessage}</p>
            <button
              type="button"
              onClick={() => void catalog.refetch()}
              className="mt-4 min-h-12 rounded-xl bg-primary px-5 text-xs font-black uppercase tracking-wider text-primary-foreground"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
        <PricingSection
          onPlanSelect={handlePlanSelect} 
          plans={pricingPlans}
          loading={catalog.isLoading || billing.isLoading}
          currentPlan={currentPlan}
          annualUpgradeBlocked={annualUpgradeBlocked}
          renewalCanceled={renewalCanceled}
        />
        )}

        <div className="mt-16 text-center text-[11px] text-muted-foreground font-medium animate-in fade-in duration-1000 delay-500">
          Pagamento com cartão protegido e processado pela Stripe.
        </div>

      </div>
    </div>
  );
};

export default Planos;
