import { FormEvent, useState } from 'react';
import { PaymentElement, useCheckoutElements } from '@stripe/react-stripe-js/checkout';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Loader2, LockKeyhole, Tag, X } from 'lucide-react';
import { addMonths, addYears } from 'date-fns';
import { getPaymentErrorMessage } from '@/features/billing/utils/paymentErrorMessage';
import { Link } from 'react-router-dom';
import { useStripeContractAcceptance } from '@/features/billing/hooks/useStripeBilling';
import { billingLegalLinks } from '@/features/billing/legal/billingLegalDocuments';
import { getSafeBillingErrorMessage } from '@/features/billing/services/stripeBillingService';
import type { BillingPlanCode } from '@/features/billing/types';

const getEstimatedRenewalDate = (plan: BillingPlanCode) => {
  const renewalDate = plan === 'annual' ? addYears(new Date(), 1) : addMonths(new Date(), 1);

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(renewalDate);
};

interface StripePaymentFormProps {
  priceLabel: string;
  intervalLabel: string;
  plan: BillingPlanCode;
  requestId: string;
  requireContractAcceptance: boolean;
}

export const StripePaymentForm = ({
  priceLabel,
  intervalLabel,
  plan,
  requestId,
  requireContractAcceptance,
}: StripePaymentFormProps) => {
  const checkoutState = useCheckoutElements();
  const contractAcceptance = useStripeContractAcceptance();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAcceptedContract, setHasAcceptedContract] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [elementLoadError, setElementLoadError] = useState(false);
  const [promotionCode, setPromotionCode] = useState('');
  const [promotionMessage, setPromotionMessage] = useState<string | null>(null);
  const [isUpdatingPromotion, setIsUpdatingPromotion] = useState(false);

  const checkout = checkoutState.type === 'success' ? checkoutState.checkout : null;
  const appliedPromotion = checkout?.discountAmounts?.find(
    (discount) => Boolean(discount.promotionCode),
  ) ?? null;
  const totalToday = checkout
    ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: checkout.currency.toUpperCase(),
      }).format(checkout.total.total.minorUnitsAmount / checkout.minorUnitsAmountDivisor)
    : priceLabel;

  const handleApplyPromotionCode = async () => {
    const normalizedCode = promotionCode.trim().toUpperCase();
    if (!normalizedCode || !checkout) return;

    setIsUpdatingPromotion(true);
    setPromotionMessage(null);
    try {
      const result = await checkout.applyPromotionCode(normalizedCode);
      if (result.type === 'error') {
        setPromotionMessage(
          result.error.code === 'invalidCode'
            ? 'Não foi possível usar este código. Confira a grafia; códigos de divulgação valem somente para a primeira compra.'
            : 'Não foi possível aplicar o código agora. Tente novamente.',
        );
        return;
      }
      setPromotionCode(normalizedCode);
      setPromotionMessage('Desconto aplicado ao pagamento de hoje.');
    } catch (error) {
      console.error('[StripePaymentForm] Falha ao aplicar código promocional.', error);
      setPromotionMessage('Não foi possível aplicar o código agora. Tente novamente.');
    } finally {
      setIsUpdatingPromotion(false);
    }
  };

  const handleRemovePromotionCode = async () => {
    if (!checkout) return;

    setIsUpdatingPromotion(true);
    setPromotionMessage(null);
    try {
      const result = await checkout.removePromotionCode();
      if (result.type === 'error') {
        setPromotionMessage('Não foi possível remover o código agora. Tente novamente.');
        return;
      }
      setPromotionCode('');
      setPromotionMessage(null);
    } catch (error) {
      console.error('[StripePaymentForm] Falha ao remover código promocional.', error);
      setPromotionMessage('Não foi possível remover o código agora. Tente novamente.');
    } finally {
      setIsUpdatingPromotion(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (checkoutState.type !== 'success') {
      setMessage('O pagamento ainda está carregando. Aguarde alguns segundos e tente novamente.');
      return;
    }
    if (requireContractAcceptance && !hasAcceptedContract) {
      setMessage('Confirme os termos da assinatura e a política de cancelamento para continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (requireContractAcceptance) {
        await contractAcceptance.mutateAsync(requestId);
      }
      const result = await checkoutState.checkout.confirm();

      if (result.type === 'error') {
        setMessage(getPaymentErrorMessage(result.error));
      }
    } catch (error) {
      console.error('[StripePaymentForm] Falha ao confirmar o pagamento.', error);
      setMessage(
        requireContractAcceptance
          ? getSafeBillingErrorMessage(error, getPaymentErrorMessage(null))
          : getPaymentErrorMessage(null),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[2rem] border border-white/80 bg-white/85 p-5 shadow-[0_28px_80px_-42px_rgba(36,24,77,0.5)] backdrop-blur-xl sm:p-7"
    >
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-[#ebe7f5] pb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#746c87]">Total de hoje</p>
          <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-[#17122b]">{totalToday}</p>
          {appliedPromotion && (
            <p className="mt-1 text-xs font-bold text-[#169985]">
              Desconto de {appliedPromotion.percentOff ?? 0}% aplicado hoje
            </p>
          )}
        </div>
        <span className="rounded-full bg-[#eeeaff] px-3 py-2 text-xs font-black text-[#5b47eb]">
          {intervalLabel}
        </span>
      </div>

      <div className="mb-5 rounded-2xl border border-[#ded8ed] bg-[#faf9ff] p-4">
        <div className="flex items-center gap-2 text-sm font-black text-[#2f2940]">
          <Tag className="h-4 w-4 text-[#5b47eb]" />
          Código de divulgação
        </div>
        {appliedPromotion ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#eaf8f4] px-3 py-2.5">
            <div>
              <p className="text-sm font-black text-[#126f61]">{appliedPromotion.promotionCode}</p>
              <p className="text-xs font-semibold text-[#397f75]">Válido somente para o pagamento de hoje.</p>
            </div>
            <button
              type="button"
              onClick={handleRemovePromotionCode}
              disabled={isUpdatingPromotion}
              aria-label="Remover código de divulgação"
              className="rounded-lg p-2 text-[#397f75] transition hover:bg-white/70 disabled:opacity-50"
            >
              {isUpdatingPromotion ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={promotionCode}
              onChange={(event) => {
                setPromotionCode(event.target.value.toUpperCase());
                setPromotionMessage(null);
              }}
              placeholder="Digite seu código"
              autoComplete="off"
              className="min-h-11 flex-1 rounded-xl border border-[#d8d2e5] bg-white px-3 text-sm font-bold uppercase text-[#2f2940] outline-none transition placeholder:normal-case placeholder:font-medium placeholder:text-[#8b8498] focus:border-[#6b4df5] focus:ring-2 focus:ring-[#6b4df5]/15"
            />
            <button
              type="button"
              onClick={handleApplyPromotionCode}
              disabled={!promotionCode.trim() || !checkout || isUpdatingPromotion}
              className="min-h-11 rounded-xl bg-[#ece8ff] px-5 text-sm font-black text-[#5b47eb] transition hover:bg-[#e2dcff] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpdatingPromotion ? 'Aplicando…' : 'Aplicar'}
            </button>
          </div>
        )}
        {promotionMessage && (
          <p
            role={promotionMessage.startsWith('Desconto') ? 'status' : 'alert'}
            className={`mt-2 text-xs font-bold ${
              promotionMessage.startsWith('Desconto') ? 'text-[#169985]' : 'text-[#a52d3b]'
            }`}
          >
            {promotionMessage}
          </p>
        )}
      </div>

      <div className="min-h-[210px]">
        <PaymentElement
          options={{ layout: 'tabs' }}
          onReady={() => {
            setElementLoadError(false);
            setMessage(null);
          }}
          onLoadError={({ error }) => {
            setElementLoadError(true);
            setMessage(getPaymentErrorMessage(error));
            console.error(
              `[StripePaymentForm] Payment Element loaderror code=${error.code ?? 'unknown'} type=${error.type ?? 'unknown'} message=${error.message ?? 'unknown'}`,
            );
          }}
          onChange={() => message && setMessage(null)}
        />
      </div>

      {requireContractAcceptance && (
        <div className="mt-5 rounded-2xl border border-[#ded8ed] bg-white/70 p-4 text-sm text-[#433b56]">
          <p className="font-black">Resumo da assinatura</p>
          <ul className="mt-2 space-y-1.5 text-xs font-semibold leading-5 text-[#686078]">
            <li>• Cobrança de {totalToday} hoje.</li>
            <li>
              • Renovação automática {plan === 'annual' ? 'anual' : 'mensal'} pelo valor vigente do plano
              {appliedPromotion ? ` (hoje, ${priceLabel})` : ''}, salvo alteração previamente informada.
            </li>
            <li>• Próxima cobrança estimada em {getEstimatedRenewalDate(plan)}.</li>
            <li>• Você pode cancelar futuras renovações em Minha assinatura.</li>
            <li>• Em contratações online elegíveis, é possível desistir em até 7 dias e solicitar reembolso integral.</li>
            <li>• O teste gratuito anterior é separado e não gera cobrança automática.</li>
          </ul>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-[#f6f3ff] p-3 font-bold">
            <input
              type="checkbox"
              checked={hasAcceptedContract}
              onChange={(event) => {
                setHasAcceptedContract(event.target.checked);
                setMessage(null);
              }}
              className="mt-0.5 h-4 w-4 rounded border-[#b7aecb] text-[#6048ed] focus:ring-[#6048ed]"
            />
            <span className="text-xs leading-5">
              Li e concordo com os{' '}
              <Link className="text-[#5b47eb] underline" to={billingLegalLinks.terms}>Termos de Uso</Link>, a{' '}
              <Link className="text-[#5b47eb] underline" to={billingLegalLinks.privacy}>Política de Privacidade</Link> e a{' '}
              <Link className="text-[#5b47eb] underline" to={billingLegalLinks.refunds}>Política de Cancelamento e Reembolso</Link>.
            </span>
          </label>
        </div>
      )}

      <AnimatePresence initial={false}>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="mt-4 rounded-2xl border border-[#ffd6d9] bg-[#fff2f3] px-4 py-3 text-sm font-bold text-[#a52d3b]"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={
          isSubmitting ||
          contractAcceptance.isPending ||
          checkoutState.type === 'loading' ||
          elementLoadError ||
          (requireContractAcceptance && !hasAcceptedContract)
        }
        className="group mt-6 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#6b4df5] to-[#2478ff] px-6 text-base font-black text-white shadow-[0_16px_35px_-16px_rgba(78,73,235,0.9)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_42px_-16px_rgba(78,73,235,0.95)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8b7bff]/30 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
      >
        {isSubmitting || contractAcceptance.isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Confirmando seu pagamento…
          </>
        ) : (
          <>
            Assinar e começar
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>

      <div className="mt-5 grid gap-3 text-xs font-bold text-[#686078] sm:grid-cols-2">
        <span className="flex items-center gap-2">
          <LockKeyhole className="h-4 w-4 text-[#5b47eb]" />
          Pagamento protegido pela Stripe
        </span>
        <span className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#169985]" />
          Cancele antes da renovação
        </span>
      </div>
    </form>
  );
};
