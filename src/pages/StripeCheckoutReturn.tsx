import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { BillingShell } from '@/features/billing/components/BillingShell';
import { useStripeBillingOverview } from '@/features/billing/hooks/useStripeBilling';
import { clearCheckoutRequestIds } from '@/features/billing/utils/checkoutRequest';

const MAX_REFRESH_ATTEMPTS = 8;

const StripeCheckoutReturn = () => {
  const [searchParams] = useSearchParams();
  const overview = useStripeBillingOverview();
  const [attempt, setAttempt] = useState(0);
  const isConfirmed = overview.data?.source === 'stripe' && overview.data.is_active;
  const hasCheckoutReturn = Boolean(searchParams.get('session_id'));

  useEffect(() => {
    if (isConfirmed) clearCheckoutRequestIds();
  }, [isConfirmed]);

  useEffect(() => {
    if (!hasCheckoutReturn || isConfirmed || attempt >= MAX_REFRESH_ATTEMPTS) return;
    const timer = window.setTimeout(() => {
      setAttempt((current) => current + 1);
      void overview.refetch();
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [attempt, hasCheckoutReturn, isConfirmed, overview]);

  const eyebrow = isConfirmed
    ? 'Assinatura ativada'
    : hasCheckoutReturn
      ? 'Confirmação em andamento'
      : 'Minha assinatura';
  const title = isConfirmed
    ? 'Seu plano está ativo. Agora é hora de avançar.'
    : hasCheckoutReturn
      ? 'Estamos confirmando seu pagamento.'
      : 'Consulte o status do seu plano.';
  const description = isConfirmed
    ? 'Seus estudos estão liberados. Continue sua preparação e transforme consistência em resultado.'
    : hasCheckoutReturn
      ? 'Isso costuma levar apenas alguns segundos. Você não precisa repetir a compra.'
      : 'Acesse Minha assinatura para conferir seu acesso, pagamentos e renovação.';

  return (
    <BillingShell
      eyebrow={eyebrow}
      title={title}
      description={description}
      backTo="/conta/assinatura"
      backLabel="Ver minha assinatura"
    >
      <div className="rounded-[2rem] border border-white/80 bg-white/85 p-7 shadow-[0_28px_80px_-42px_rgba(36,24,77,0.5)] backdrop-blur-xl">
        <motion.div
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`flex h-16 w-16 items-center justify-center rounded-3xl ${
            isConfirmed ? 'bg-[#dfff65] text-[#17122b]' : 'bg-[#eeeaff] text-[#6048ed]'
          }`}
        >
          {isConfirmed ? (
            <Check className="h-8 w-8 stroke-[3]" />
          ) : hasCheckoutReturn ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : (
            <Sparkles className="h-7 w-7" />
          )}
        </motion.div>
        <div
          role="status"
          aria-live="polite"
          className={`mt-6 flex items-start gap-3 rounded-2xl p-4 ${
            isConfirmed ? 'bg-[#efffc6]' : 'bg-[#f3f0fa]'
          }`}
        >
          <Sparkles
            className={`mt-0.5 h-5 w-5 shrink-0 ${isConfirmed ? 'text-[#496400]' : 'text-[#6048ed]'}`}
          />
          <p className={`text-sm font-semibold leading-6 ${isConfirmed ? 'text-[#334800]' : 'text-[#5d556e]'}`}>
            {isConfirmed
              ? 'Tudo pronto: seu acesso já está liberado para você continuar de onde parou.'
              : hasCheckoutReturn
                ? 'Aguarde nesta página. Assim que a confirmação chegar, liberaremos seus estudos automaticamente.'
                : 'Nenhum pagamento foi confirmado nesta página. Consulte Minha assinatura antes de tentar uma nova compra.'}
          </p>
        </div>
        {isConfirmed ? (
          <Link
            to="/dashboard"
            className="mt-6 flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#17122b] px-6 text-base font-black text-white transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#17122b]/20"
          >
            <span>Continuar meus estudos</span>
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        ) : !hasCheckoutReturn || attempt >= MAX_REFRESH_ATTEMPTS ? (
          <Link
            to="/conta/assinatura"
            className="mt-6 flex min-h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#6b4df5] to-[#2478ff] px-6 text-base font-black text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8b7bff]/30"
          >
            Ver status da assinatura
          </Link>
        ) : null}
      </div>
    </BillingShell>
  );
};

export default StripeCheckoutReturn;
