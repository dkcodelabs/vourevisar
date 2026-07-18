import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { PricingSection } from '@/components/PricingSection';
import { CheckoutModal } from '@/components/CheckoutModal';
import { usePlanConfigs } from '@/hooks/usePlanConfigs';
import { useSubscriptionInfo } from '@/hooks/useSubscriptionInfo';

const Planos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<'monthly' | 'annual'>('annual');
  const { monthly, annual, loading } = usePlanConfigs();
  const { subscriptionInfo, loading: subscriptionLoading } = useSubscriptionInfo();
  const currentPlan =
    subscriptionInfo?.is_active && (subscriptionInfo.plan === 'monthly' || subscriptionInfo.plan === 'annual')
      ? subscriptionInfo.plan
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
    if (isAnnualActive || plan === currentPlan) {
      navigate('/conta?tab=assinatura');
      return;
    }

    if (user) {
      setSelectedPlan(plan);
      setIsCheckoutOpen(true);
    } else {
      navigate('/login?redirect=planos');
    }
  };

  const title = isAnnualActive
    ? 'Seu plano anual está ativo'
    : isMonthlyActive
      ? 'Seu plano mensal está ativo'
      : 'Escolha seu plano';
  const description = isAnnualActive
    ? 'Você já está no plano com melhor custo e menor atrito de cobrança.'
    : isMonthlyActive
      ? 'Confira sua assinatura atual e os valores dos planos disponíveis.'
      : 'Invista na sua aprovação com a melhor ferramenta de revisões do mercado.';

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
          <div className="mx-auto mb-8 max-w-4xl rounded-2xl border border-border/70 bg-card px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-content-muted">Plano atual</p>
                <p className="mt-1 text-base font-bold text-foreground">
                  {currentPlan === 'annual' ? 'Anual' : 'Mensal'} ativo
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/conta?tab=assinatura')}
                className="h-10 rounded-xl bg-primary px-4 text-xs font-black uppercase tracking-widest text-primary-foreground transition hover:bg-primary/90"
              >
                Ver assinatura
              </button>
            </div>
          </div>
        ) : null}
        
        <PricingSection 
          onPlanSelect={handlePlanSelect} 
          plans={{ monthly, annual }} 
          loading={loading || subscriptionLoading}
          currentPlan={currentPlan}
          annualUpgradeBlocked={annualUpgradeBlocked}
        />

        <div className="mt-16 text-center text-[11px] text-muted-foreground font-medium animate-in fade-in duration-1000 delay-500">
          Pagamento processado com segurança via Asaas.
        </div>

        <CheckoutModal 
          isOpen={isCheckoutOpen} 
          onClose={() => setIsCheckoutOpen(false)} 
          selectedPlan={selectedPlan}
          planData={selectedPlan === 'monthly' ? monthly : annual}
        />
      </div>
    </div>
  );
};

export default Planos;
