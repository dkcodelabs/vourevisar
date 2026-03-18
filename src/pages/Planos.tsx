import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PricingSection } from '@/components/PricingSection';
import { CheckoutModal } from '@/components/CheckoutModal';
import { usePlanConfigs } from '@/hooks/usePlanConfigs';

const Planos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<'monthly' | 'annual'>('annual');
  const { plans, monthly, annual, loading } = usePlanConfigs();

  const handlePlanSelect = (plan: 'monthly' | 'annual') => {
    if (user) {
      setSelectedPlan(plan);
      setIsCheckoutOpen(true);
    } else {
      navigate('/login?redirect=planos');
    }
  };

  return (
    <div className="w-full pb-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <p className="text-[13px] text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
            Invista na sua aprovação com a melhor ferramenta de revisões do mercado.
          </p>
        </div>
        
        <PricingSection 
          onPlanSelect={handlePlanSelect} 
          plans={{ monthly, annual }} 
          loading={loading}
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
