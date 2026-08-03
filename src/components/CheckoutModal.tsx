import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { asaasService, CheckoutPayload } from '@/services/asaasService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';
import { PlanConfig } from '@/hooks/usePlanConfigs';
import { getAccountSubscription } from '@/services/accountSubscriptionService';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: 'monthly' | 'annual';
  planData?: PlanConfig | null;
}

export function CheckoutModal({ isOpen, onClose, selectedPlan, planData }: CheckoutModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [billingType, setBillingType] = useState<'PIX' | 'CREDIT_CARD'>('CREDIT_CARD');
  const [loading, setLoading] = useState(false);
  
  // Personal Data
  const [name, setName] = useState(user?.user_metadata?.full_name || '');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  
  // Credit Card Data
  const [holderName, setHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [ccv, setCcv] = useState('');
  
  // Coupon Data
  const [couponCode, setCouponCode] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ discount_type: string, discount_value: number } | null>(null);

  // Dynamic Prices
  const baseValue = planData ? planData.value : (selectedPlan === 'annual' ? 99.90 : 9.90);
  const displayValue = appliedCoupon 
    ? (appliedCoupon.discount_type === 'PERCENTAGE' 
        ? baseValue - (baseValue * (appliedCoupon.discount_value / 100))
        : Math.max(0, baseValue - appliedCoupon.discount_value))
    : baseValue;

  // Checkout Status
  const [pixData, setPixData] = useState<{ encodedImage: string, payload: string } | null>(null);
  const [checkoutPaymentId, setCheckoutPaymentId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{ plan: string; started_at: string; billing_type?: string; value?: number } | null>(null);
  const [checkoutTimestamp, setCheckoutTimestamp] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [confirmationTimedOut, setConfirmationTimedOut] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const paymentConfirmedRef = useRef(false);

  const handlePaymentConfirmed = useCallback((plan: string, startedAt: string, billingType?: string, value?: number) => {
    if (paymentConfirmedRef.current) return;
    paymentConfirmedRef.current = true;
    setSubscriptionInfo({ 
      plan, 
      started_at: startedAt,
      billing_type: billingType || 'PIX',
      value: value || baseValue
    });
    setSuccess(true);
    setPixData(null);
    toast.success('Pagamento confirmado! Assinatura ativada.');
  }, [baseValue]);

  // Listener Realtime (principal)
  useEffect(() => {
    if (!user || (!pixData && !awaitingConfirmation) || !checkoutTimestamp || confirmationTimedOut) return;

    const threshold = new Date(new Date(checkoutTimestamp).getTime() - 60000); // 1 min margin

    const channel = supabase
      .channel(`sub-updates-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_subscriptions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new.status === 'active' && payload.new.subscription_started_at && new Date(payload.new.subscription_started_at) > threshold) {
            handlePaymentConfirmed(payload.new.plan as string, payload.new.subscription_started_at as string, payload.new.billing_type);
          }
        }
      )
      .subscribe();

    // Consulta local + Asaas como fallback. O pagamento confirmado pode chegar
    // antes ou depois do webhook, então a UI consulta o pagamento criado neste checkout.
    let checking = false;
    const checkPaymentStatus = async () => {
      if (checking || paymentConfirmedRef.current) return;
      checking = true;

      try {
        const { data } = await supabase
          .from('user_subscriptions')
          .select('status, plan, subscription_started_at, billing_type')
          .eq('user_id', user.id)
          .single();
        const subData = data as unknown as Record<string, unknown> | null;
        if (
          subData?.status === 'active' &&
          subData.subscription_started_at &&
          new Date(subData.subscription_started_at as string) > threshold
        ) {
          handlePaymentConfirmed(
            subData.plan as string,
            subData.subscription_started_at as string,
            subData.billing_type as string | undefined,
          );
          return;
        }

        if (!checkoutPaymentId) return;

        const account = await getAccountSubscription();
        const payment = checkoutPaymentId
          ? account.asaas.payments.find((item) => item.id === checkoutPaymentId)
          : account.asaas.payments[0];
        const paymentStatus = payment?.status?.toUpperCase();
        if (payment && (paymentStatus === 'RECEIVED' || paymentStatus === 'CONFIRMED')) {
          handlePaymentConfirmed(
            account.subscription?.plan || selectedPlan,
            account.subscription?.subscriptionStartedAt || payment.paymentDate || new Date().toISOString(),
            payment.billingType || account.subscription?.billingType || undefined,
            payment.value || baseValue,
          );
        }
      } catch (error) {
        // O polling não deve interromper o checkout por uma falha transitória de rede.
        console.debug('[CheckoutModal] Falha transitória ao consultar pagamento', error);
      } finally {
        checking = false;
      }
    };

    void checkPaymentStatus();
    pollingRef.current = setInterval(() => void checkPaymentStatus(), 5000);
    const timeoutMs = Math.max(0, new Date(checkoutTimestamp).getTime() + 120000 - Date.now());
    const timeoutId = window.setTimeout(() => setConfirmationTimedOut(true), timeoutMs);

    return () => {
      supabase.removeChannel(channel);
      if (pollingRef.current) clearInterval(pollingRef.current);
      window.clearTimeout(timeoutId);
    };
  }, [user, pixData, awaitingConfirmation, confirmationTimedOut, checkoutTimestamp, checkoutPaymentId, selectedPlan, baseValue, handlePaymentConfirmed]);

  const handleGoToEditais = () => {
    onClose();
    navigate('/ciclo-estudos');
  };

  // Remove old price calculation to fix duplicate identifier errors
  if (!isOpen) return null;

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setValidatingCoupon(true);
    try {
      const res = await asaasService.validateCoupon(couponCode);
      if (res.success && res.discount_type && res.discount_value) {
        setAppliedCoupon({ discount_type: res.discount_type, discount_value: res.discount_value });
        toast.success('Cupom aplicado com sucesso!');
      } else {
        toastGate.notifyError(res.error || 'Cupom inválido', 'COUPON_INVALID');
        setAppliedCoupon(null);
      }
    } catch (err) {
      toastGate.notifyError('Erro ao validar cupom', 'COUPON_VAL_ERR');
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    paymentConfirmedRef.current = false;
    setConfirmationTimedOut(false);
    setCheckoutPaymentId(null);
    setCheckoutTimestamp(new Date().toISOString());
    
    try {
      if (!name || !cpfCnpj || !mobilePhone) {
        throw new Error('Preencha os dados pessoais (Nome, CPF e Celular)');
      }

      const payload: CheckoutPayload = {
        name,
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        mobilePhone: mobilePhone.replace(/\D/g, ''),
        plan: selectedPlan,
        billingType,
        ...(appliedCoupon ? { couponCode } : {})
      };

      if (billingType === 'CREDIT_CARD') {
        if (!holderName || !cardNumber || !expiry || !ccv) {
          throw new Error('Preencha os dados do cartão de crédito');
        }
        const [expiryMonth, expiryYear] = expiry.split('/');
        if (!expiryMonth || !expiryYear) throw new Error('Validade do cartão inválida (Use MM/AAAA)');
        
        payload.creditCard = {
          holderName,
          number: cardNumber.replace(/\D/g, ''),
          expiryMonth,
          expiryYear,
          ccv
        };
      }

      const response = await asaasService.processCheckout(payload);
      
      if (!response.success) {
        if (response.code === 'ASAAS_SUBSCRIPTION_ALREADY_ACTIVE' || response.code === 'PAID_PERIOD_STILL_ACTIVE') {
          throw new Error('Seu plano atual ainda está ativo. O plano anual ficará disponível após o fim do período pago.');
        }
        throw new Error(response.error || 'Erro ao processar pagamento');
      }

      if (billingType === 'PIX' && response.pix) {
        setCheckoutPaymentId(response.paymentId || null);
        setPixData(response.pix as { encodedImage: string; payload: string; });
      } else if (billingType === 'CREDIT_CARD' && response.subscription) {
        setCheckoutPaymentId(response.paymentId || null);
        setAwaitingConfirmation(true);
      } else {
        setAwaitingConfirmation(true);
        toast.info('Aguardando confirmação de pagamento...');
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar pagamento';
      toastGate.notifyError(message, 'CHECKOUT_FAIL');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render Helpers ────────────────────────────────────────────

  const renderSuccessScreen = () => (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center animate-in fade-in zoom-in-95 duration-500 min-h-[500px]">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping opacity-30" />
        <div className="relative w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
        </div>
      </div>

      <h3 className="text-2xl font-black text-white mb-1">Assinatura Ativada!</h3>
      
      {subscriptionInfo && (
        <>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 w-full max-w-sm">
            <p className="text-xs text-blue-300 font-semibold leading-relaxed">
              Pagamento confirmado via {subscriptionInfo.billing_type === 'CREDIT_CARD' ? 'cartão de crédito' : 'Pix'}.
              Sua assinatura {subscriptionInfo.plan === 'annual' ? 'anual' : 'mensal'} já está ativa.
            </p>
          </div>

          <div className="w-full max-w-sm bg-white/5 rounded-xl border border-white/10 p-5 text-left space-y-3 mb-6">
            {[
              { label: 'Plano', value: subscriptionInfo.plan === 'annual' ? '🏆 Anual' : '📅 Mensal' },
              { label: 'Ativado em', value: new Date(subscriptionInfo.started_at).toLocaleDateString('pt-BR') },
              { label: 'Método', value: subscriptionInfo.billing_type === 'CREDIT_CARD' ? 'Cartão de crédito' : 'Pix' },
              { label: 'Valor', value: `R$ ${subscriptionInfo.value?.toFixed(2).replace('.', ',')}` },
            ].map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div className="h-px bg-white/5" />}
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{item.label}</span>
                  <span className="text-sm font-bold text-white">{item.value}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </>
      )}

      <button
        onClick={handleGoToEditais}
        className="w-full max-w-sm bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/20"
      >
        Ir para o Ciclo de Estudos →
      </button>
    </div>
  );

  const renderPixScreen = () => (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center animate-in fade-in duration-500 min-h-[500px]">
      <h3 className="text-xl font-bold text-white mb-1">Pagamento via PIX</h3>
      <p className="text-slate-400 text-sm mb-6">Escaneie o QR Code abaixo</p>
      
      <div className="bg-white p-3 rounded-2xl inline-block mb-6 shadow-lg">
        <img 
          src={pixData!.encodedImage.startsWith('data:') ? pixData!.encodedImage : `data:image/png;base64,${pixData!.encodedImage}`} 
          alt="QR Code PIX" 
          className="w-48 h-48 object-contain"
        />
      </div>
      
      <div className="w-full max-w-sm bg-white/5 p-2 rounded-xl border border-white/10 flex items-center gap-2 mb-4">
        <input readOnly value={pixData!.payload} className="flex-1 bg-transparent text-[10px] text-slate-400 font-mono outline-none truncate" />
        <button 
          onClick={() => { navigator.clipboard.writeText(pixData!.payload); toast.success('PIX Copiado!'); }}
          className="shrink-0 bg-blue-600 text-white font-bold text-[10px] px-4 py-2 rounded-lg hover:bg-blue-500 transition-all uppercase tracking-wider"
        >Copiar</button>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        Aguardando confirmação do pagamento...
      </div>
    </div>
  );

  const renderCardWaitingScreen = () => (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center animate-in fade-in duration-500 min-h-[500px]">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping opacity-30" />
        <div className="relative w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
          <svg className="w-10 h-10 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        </div>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">
        {confirmationTimedOut ? 'Pagamento enviado' : 'Processando Cartão...'}
      </h3>
      <p className="text-slate-400 text-sm mb-6 max-w-sm">
        {confirmationTimedOut
          ? 'Ainda não recebemos a confirmação. Você pode fechar esta janela; o acesso será liberado automaticamente quando o pagamento for confirmado.'
          : 'Estamos processando seu pagamento com a operadora do cartão. Isso pode levar alguns segundos.'}
      </p>

      {confirmationTimedOut ? (
        <button
          type="button"
          onClick={onClose}
          className="w-full max-w-sm bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-3 rounded-xl transition-colors"
        >
          Fechar
        </button>
      ) : (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          Aguardando confirmação...
        </div>
      )}
    </div>
  );

  // ─── Progress Steps ────────────────────────────────────────────
  const ProgressSteps = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {/* Step 1 - Done */}
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </div>
        <span className="text-xs font-semibold text-slate-400">Escolher Plano</span>
      </div>
      <div className="w-8 h-px bg-slate-600" />
      {/* Step 2 - Done */}
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </div>
        <span className="text-xs font-semibold text-slate-400">Informações</span>
      </div>
      <div className="w-8 h-px bg-slate-600" />
      {/* Step 3 - Active */}
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full" />
        </div>
        <span className="text-xs font-semibold text-white">Pagamento Final</span>
      </div>
    </div>
  );

  // ─── Main Two-Column Layout ────────────────────────────────────

  if (success || pixData || awaitingConfirmation) {
    return (
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            if (success) handleGoToEditais();
            else onClose();
          }
        }}
      >
        <div className="bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-300 border border-white/10">
          {success ? renderSuccessScreen() : pixData ? renderPixScreen() : renderCardWaitingScreen()}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-slate-900 rounded-3xl w-full max-w-[900px] shadow-2xl relative animate-in fade-in zoom-in-95 duration-300 border border-white/10 overflow-hidden max-h-[96vh] flex flex-col">
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="grid md:grid-cols-[1fr,1.2fr] min-h-full">
            
            {/* ═══ LEFT COLUMN ═══ */}
            <div className="p-6 md:p-8 flex flex-col border-b md:border-b-0 md:border-r border-white/5">
              
              {/* Back Button */}
              <button onClick={onClose} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 group self-start">
                <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7l-7 7 7 7" /></svg>
                <span className="text-sm font-medium">Voltar</span>
              </button>

              {/* Payment Method Selection */}
              <h3 className="text-lg font-bold text-white mb-4">Método de Pagamento</h3>
              
              <div className="space-y-3 mb-8">
                {/* PIX Option */}
                <button
                  type="button"
                  onClick={() => setBillingType('PIX')}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 ${
                    billingType === 'PIX'
                      ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/20'
                      : 'border-white/10 bg-white/5 hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                  </div>
                  <span className="text-sm font-semibold text-white flex-1 text-left">Pix</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    billingType === 'PIX' ? 'border-blue-500 bg-blue-500' : 'border-slate-500'
                  }`}>
                    {billingType === 'PIX' && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </button>

                {/* Credit Card Option */}
                <button
                  type="button"
                  onClick={() => setBillingType('CREDIT_CARD')}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 ${
                    billingType === 'CREDIT_CARD'
                      ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/20'
                      : 'border-white/10 bg-white/5 hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  </div>
                  <span className="text-sm font-semibold text-white flex-1 text-left">Cartão de Crédito</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    billingType === 'CREDIT_CARD' ? 'border-blue-500 bg-blue-500' : 'border-slate-500'
                  }`}>
                    {billingType === 'CREDIT_CARD' && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </button>
              </div>

              {/* Price Display */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
                <p className="text-xs text-slate-400 font-medium mb-1">Valor a pagar</p>
                <p className="text-4xl font-black text-white tracking-tight">
                  R$ {displayValue.toFixed(2).replace('.', ',')}
                </p>
                {appliedCoupon && (
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-green-500/10 text-green-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-green-500/20 uppercase tracking-wider">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Cupom Ativo
                  </div>
                )}

                <div className="mt-4 flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  <div>
                    <p className="text-xs font-semibold text-white">Pagamento & Faturamento</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                      Processamos todos os pagamentos com segurança via Asaas. Você pode ficar tranquilo.
                    </p>
                  </div>
                </div>
              </div>

              {/* Plan Card */}
              <div className="bg-gradient-to-r from-blue-600/10 to-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">
                    {planData?.name || `Plano ${selectedPlan === 'annual' ? 'Anual' : 'Mensal'}`}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {planData?.description || (selectedPlan === 'annual' 
                      ? 'Acesso completo por 12 meses com economia.' 
                      : 'Acesso completo sem fidelidade, cancele quando quiser.')}
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={onClose}
                  className="shrink-0 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg border border-white/10 transition-all"
                >
                  Alterar
                </button>
              </div>
            </div>

            {/* ═══ RIGHT COLUMN ═══ */}
            <div className="p-6 md:p-8 flex flex-col">
              
              <ProgressSteps />

              <h2 className="text-2xl font-bold text-white mb-1">Pagamento</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                {billingType === 'CREDIT_CARD' 
                  ? 'Para finalizar sua assinatura, preencha os dados do cartão de crédito abaixo.'
                  : 'Para finalizar sua assinatura, preencha seus dados e clique em gerar código Pix.'}
              </p>

              <form onSubmit={handleCheckout} id="checkout-form" className="flex flex-col flex-1 gap-5">
                
                {/* Personal Fields */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-2">Nome Completo</label>
                  <input 
                    required 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    type="text" 
                    placeholder="Como no seu documento"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-2">CPF / CNPJ</label>
                    <input 
                      required 
                      value={cpfCnpj} 
                      onChange={e => setCpfCnpj(e.target.value)} 
                      type="text" 
                      placeholder="000.000.000-00"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-2">WhatsApp</label>
                    <input 
                      required 
                      value={mobilePhone} 
                      onChange={e => setMobilePhone(e.target.value)} 
                      type="text" 
                      placeholder="(00) 00000-0000"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all" 
                    />
                  </div>
                </div>

                {/* Credit Card Fields */}
                {billingType === 'CREDIT_CARD' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-2">Nome no Cartão</label>
                      <input 
                        required 
                        value={holderName} 
                        onChange={e => setHolderName(e.target.value)} 
                        type="text" 
                        placeholder="Titular do cartão"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all uppercase" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-2">Número do Cartão</label>
                      <div className="relative">
                        <input 
                          required 
                          value={cardNumber} 
                          onChange={e => setCardNumber(e.target.value)} 
                          type="text" 
                          placeholder="0000 0000 0000 0000"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-mono text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all pr-12" 
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <svg className="w-7 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-2">Validade</label>
                        <input 
                          required 
                          value={expiry} 
                          onChange={e => setExpiry(e.target.value)} 
                          type="text" 
                          placeholder="MM / AAAA"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-white text-center placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all" 
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-2">CVV</label>
                        <input 
                          required 
                          value={ccv} 
                          onChange={e => setCcv(e.target.value)} 
                          type="text" 
                          placeholder="000"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-white text-center placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all" 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Coupon */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-2">Cupom de Desconto (Opcional)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      disabled={!!appliedCoupon}
                      placeholder="Digite seu cupom" 
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all uppercase placeholder:font-normal placeholder:text-slate-500 disabled:opacity-50"
                    />
                    {!appliedCoupon ? (
                      <button 
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={!couponCode || validatingCoupon}
                        className="px-5 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold border border-white/10 transition-all disabled:opacity-30"
                      >Aplicar</button>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} 
                        className="px-4 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all"
                      >Remover</button>
                    )}
                  </div>
                </div>

                {/* Info Block */}
                <div className="p-3.5 bg-blue-500/5 border border-blue-500/15 rounded-xl flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {billingType === 'CREDIT_CARD'
                      ? <>Assinatura <strong className="text-slate-300">{selectedPlan === 'annual' ? 'anual recorrente' : 'mensal recorrente'}</strong>. O valor será debitado automaticamente do seu cartão a cada ciclo.</>
                      : <>Pagamento único via <strong className="text-slate-300">Pix</strong>. Não há renovação automática; para continuar depois do período, faça uma nova contratação.</>}
                  </p>
                </div>

                {/* Submit Button */}
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex justify-center items-center gap-2 active:scale-[0.98] disabled:opacity-50 mt-auto text-sm"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    billingType === 'PIX' ? 'Gerar Código Pix' : 'Pagar Agora'
                  )}
                </button>

                {/* Security Footer */}
                <p className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                  Ambiente 100% criptografado por Asaas
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
