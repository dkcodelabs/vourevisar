import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { BillingShell } from '@/features/billing/components/BillingShell';
import { useActivationJourney } from '@/features/activation/hooks/useActivationJourney';
import { useStripeBillingOverview } from '@/features/billing/hooks/useStripeBilling';
import { clearCheckoutRequestIds } from '@/features/billing/utils/checkoutRequest';

const MAX_REFRESH_ATTEMPTS = 8;

const StripeCheckoutReturn = () => {
  const reduceMotion = useReducedMotion();
  const [searchParams] = useSearchParams();
  const overview = useStripeBillingOverview();
  const [attempt, setAttempt] = useState(0);
  const isConfirmed = overview.data?.source === 'stripe' && overview.data.is_active;
  const activation = useActivationJourney(isConfirmed);
  const hasCheckoutReturn = Boolean(searchParams.get('session_id'));
  const isAlreadyActivated = activation.journey?.kind === 'activated';
  const continueHref = isAlreadyActivated ? '/dashboard' : '/ativacao';
  const continueLabel = isAlreadyActivated
    ? 'Ir para meu próximo estudo'
    : 'Configurar meu plano de estudo';

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
      <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-[0_28px_80px_-48px_rgba(36,24,77,0.45)] sm:p-7">
        <motion.div
          initial={reduceMotion ? false : { scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`flex size-14 items-center justify-center rounded-2xl ${
            isConfirmed
              ? 'bg-[hsl(var(--activation-lime))] text-[hsl(var(--activation-ink))]'
              : 'bg-primary/10 text-primary'
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
          className={`mt-6 flex items-start gap-3 rounded-xl border p-4 ${
            isConfirmed ? 'border-success/25 bg-success/10' : 'border-border bg-muted/50'
          }`}
        >
          <Sparkles
            className={`mt-0.5 h-5 w-5 shrink-0 ${isConfirmed ? 'text-success' : 'text-primary'}`}
          />
          <p className="text-sm font-semibold leading-6 text-foreground/80">
            {isConfirmed
              ? 'Tudo pronto: seu acesso já está liberado para você continuar de onde parou.'
              : hasCheckoutReturn
                ? 'Aguarde nesta página. Assim que a confirmação chegar, liberaremos seus estudos automaticamente.'
                : 'Nenhum pagamento foi confirmado nesta página. Consulte Minha assinatura antes de tentar uma nova compra.'}
          </p>
        </div>
        {isConfirmed ? (
          <Link
            to={continueHref}
            className="mt-6 flex min-h-14 w-full items-center justify-center rounded-xl bg-[hsl(var(--activation-ink))] px-6 text-base font-extrabold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            <span>{continueLabel}</span>
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        ) : !hasCheckoutReturn || attempt >= MAX_REFRESH_ATTEMPTS ? (
          <Link
            to="/conta/assinatura"
            className="mt-6 flex min-h-14 w-full items-center justify-center rounded-xl bg-primary px-6 text-base font-extrabold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            Ver status da assinatura
          </Link>
        ) : null}
      </div>
    </BillingShell>
  );
};

export default StripeCheckoutReturn;
