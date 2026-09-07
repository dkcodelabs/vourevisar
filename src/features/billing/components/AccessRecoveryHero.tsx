import { ArrowDown, CalendarDays, CreditCard, Gift, ShieldCheck, TimerReset } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { BillingAccessRecoveryState } from '@/features/billing/utils/billingAccessRecovery';

const icons = {
  initial_trial_expired: TimerReset,
  courtesy_expired: Gift,
  subscription_expired: CreditCard,
  payment_attention: CreditCard,
  access_required: ShieldCheck,
} as const;

const formatDate = (value: string | null) => {
  if (!value) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(value));
};

export function AccessRecoveryHero({ state }: { state: BillingAccessRecoveryState }) {
  const Icon = icons[state.kind];
  const endedAt = formatDate(state.endedAt);
  const needsPaymentAttention = state.kind === 'payment_attention';

  return (
    <section className="relative mb-9 overflow-hidden rounded-2xl bg-[hsl(var(--activation-ink))] text-white shadow-[0_24px_64px_-38px_rgba(17,16,37,0.78)]">
      <div className="absolute inset-y-0 right-0 hidden w-[38%] bg-[linear-gradient(145deg,transparent,hsl(var(--primary)/0.2))] lg:block" />
      <div className="relative grid gap-8 px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.55fr)] lg:items-end lg:px-10">
        <div>
          <div className="flex size-11 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.07] text-[hsl(var(--activation-lime))]">
            <Icon className="size-5" />
          </div>
          <h1 className="mt-5 max-w-[21ch] text-balance text-3xl font-extrabold leading-tight tracking-[-0.03em] sm:text-4xl">{state.title}</h1>
          <p className="mt-4 max-w-[66ch] text-sm font-medium leading-6 text-blue-100/75 sm:text-base sm:leading-7">{state.description}</p>
          {endedAt ? (
            <div className="mt-5 flex items-center gap-2 text-sm font-bold text-white/[0.85]">
              <CalendarDays className="size-4 text-[hsl(var(--activation-lime))]" />
              Terminou em {endedAt}
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/[0.12] pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[hsl(var(--activation-lime))]" />
            <div>
              <p className="font-bold text-white">Seu progresso permanece protegido</p>
              <p className="mt-1 text-xs leading-5 text-white/[0.55]">Editais, ciclo e histórico não são apagados quando o acesso termina.</p>
            </div>
          </div>
          {needsPaymentAttention ? (
            <Link to="/conta/assinatura" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/[0.45]">
              {state.actionLabel}
            </Link>
          ) : (
            <a href="#precos" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/[0.45]">
              {state.actionLabel}
              <ArrowDown className="size-4" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
