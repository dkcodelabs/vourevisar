import { FormEvent, useState } from 'react';
import { PaymentElement, useCheckoutElements } from '@stripe/react-stripe-js/checkout';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Loader2, LockKeyhole } from 'lucide-react';
import { getPaymentErrorMessage } from '@/features/billing/utils/paymentErrorMessage';

interface StripePaymentFormProps {
  priceLabel: string;
  intervalLabel: string;
}

export const StripePaymentForm = ({ priceLabel, intervalLabel }: StripePaymentFormProps) => {
  const checkoutState = useCheckoutElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (checkoutState.type !== 'success') {
      setMessage('O pagamento ainda está carregando. Aguarde alguns segundos e tente novamente.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await checkoutState.checkout.confirm();

      if (result.type === 'error') {
        setMessage(getPaymentErrorMessage(result.error));
      }
    } catch (error) {
      console.error('[StripePaymentForm] Falha ao confirmar o pagamento.', error);
      setMessage(getPaymentErrorMessage(null));
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
          <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-[#17122b]">{priceLabel}</p>
        </div>
        <span className="rounded-full bg-[#eeeaff] px-3 py-2 text-xs font-black text-[#5b47eb]">
          {intervalLabel}
        </span>
      </div>

      <div className="min-h-[210px]">
        <PaymentElement
          options={{ layout: 'tabs' }}
          onChange={() => message && setMessage(null)}
        />
      </div>

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
        disabled={isSubmitting || checkoutState.type === 'loading'}
        className="group mt-6 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#6b4df5] to-[#2478ff] px-6 text-base font-black text-white shadow-[0_16px_35px_-16px_rgba(78,73,235,0.9)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_42px_-16px_rgba(78,73,235,0.95)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8b7bff]/30 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
      >
        {isSubmitting ? (
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
