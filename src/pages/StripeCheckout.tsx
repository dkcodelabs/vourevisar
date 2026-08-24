import { useMemo } from 'react';
import { CheckoutElementsProvider } from '@stripe/react-stripe-js/checkout';
import { loadStripe } from '@stripe/stripe-js';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { BillingShell } from '@/features/billing/components/BillingShell';
import { StripePaymentForm } from '@/features/billing/components/StripePaymentForm';
import { isBillingContractAcceptanceEnabled } from '@/features/billing/legal/billingLegalDocuments';
import {
  createStripeCheckout,
  formatBillingPrice,
  getSafeBillingErrorMessage,
  isBillingError,
} from '@/features/billing/services/stripeBillingService';
import { useStripeCatalog } from '@/features/billing/hooks/useStripeBilling';
import {
  getCheckoutBackNavigation,
  getCheckoutRequestId,
} from '@/features/billing/utils/checkoutRequest';
import type { BillingPlanCode } from '@/features/billing/types';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;
const contractAcceptanceEnabled = isBillingContractAcceptanceEnabled();

const StripeCheckout = () => {
  const [searchParams] = useSearchParams();
  const requestedPlan = searchParams.get('plan');
  const plan: BillingPlanCode | null =
    requestedPlan === 'monthly' || requestedPlan === 'annual' ? requestedPlan : null;
  const backNavigation = getCheckoutBackNavigation(searchParams.get('from'));
  const catalog = useStripeCatalog();
  const selectedPlan = catalog.data?.find((item) => item.code === plan);
  const requestId = useMemo(() => (plan ? getCheckoutRequestId(plan) : null), [plan]);

  const checkout = useQuery({
    queryKey: ['stripe-checkout-session', plan, requestId],
    queryFn: () => createStripeCheckout(plan!, requestId!),
    enabled: Boolean(plan && requestId && publishableKey),
    retry: false,
    staleTime: Infinity,
  });

  if (!plan) return <Navigate to="/planos" replace />;

  const intervalLabel = plan === 'annual' ? 'cobrança anual' : 'cobrança mensal';
  const priceLabel = selectedPlan
    ? formatBillingPrice(selectedPlan.amountCents, selectedPlan.currency)
    : '—';
  const checkoutErrorMessage = checkout.isError
    ? getSafeBillingErrorMessage(
        checkout.error,
        'Não conseguimos preparar o pagamento agora. Nenhuma cobrança foi iniciada. Tente novamente em alguns instantes.',
      )
    : catalog.isError
      ? 'Não conseguimos carregar os dados do plano agora. Nenhuma cobrança foi iniciada. Tente novamente em alguns instantes.'
      : 'Não conseguimos preparar o pagamento agora. Nenhuma cobrança foi iniciada. Tente novamente em alguns instantes.';
  const alreadyHasActivePlan = checkout.isError && isBillingError(checkout.error, 'subscription_already_active');

  return (
    <BillingShell
      title="Seu próximo ciclo começa aqui."
      description="Finalize em um ambiente protegido. Seus dados de cartão são protegidos e processados diretamente pela Stripe."
      backTo={backNavigation.to}
      backLabel={backNavigation.label}
      layout="checkout"
    >
      {!publishableKey ? (
        <CheckoutState
          title="Pagamento indisponível no momento"
          description="Não conseguimos iniciar uma nova assinatura agora. Nenhuma cobrança foi feita. Tente novamente mais tarde."
        />
      ) : catalog.isLoading || checkout.isLoading ? (
        <CheckoutState loading title="Preparando seu pagamento" description="Estamos organizando seu plano e o ambiente protegido. Isso leva apenas alguns segundos." />
      ) : catalog.isError || checkout.isError || !checkout.data?.clientSecret ? (
        <CheckoutState
          title={alreadyHasActivePlan ? 'Seu plano já está ativo' : 'Não foi possível abrir o pagamento'}
          description={checkoutErrorMessage}
          onRetry={alreadyHasActivePlan ? undefined : () => void checkout.refetch()}
          actionTo={alreadyHasActivePlan ? '/conta/assinatura' : undefined}
          actionLabel={alreadyHasActivePlan ? 'Ir para Minha assinatura' : undefined}
        />
      ) : (
        <CheckoutElementsProvider
          stripe={stripePromise}
          options={{
            clientSecret: checkout.data.clientSecret,
            elementsOptions: {
              appearance: {
                theme: 'flat',
                variables: {
                  colorPrimary: '#6048ed',
                  colorBackground: '#ffffff',
                  colorText: '#17122b',
                  colorTextSecondary: '#686078',
                  colorTextPlaceholder: '#9a92aa',
                  colorDanger: '#b83245',
                  colorSuccess: '#148875',
                  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                  fontSizeBase: '15px',
                  fontWeightMedium: '600',
                  borderRadius: '14px',
                  spacingUnit: '4px',
                },
                rules: {
                  '.Input': {
                    border: '1px solid #ded8ed',
                    boxShadow: 'none',
                    padding: '13px 14px',
                  },
                  '.Input:focus': {
                    border: '1px solid #6048ed',
                    boxShadow: '0 0 0 3px rgba(96, 72, 237, 0.14)',
                  },
                  '.Label': {
                    fontWeight: '700',
                    color: '#433b56',
                  },
                  '.Tab': {
                    border: '1px solid #ded8ed',
                    boxShadow: 'none',
                  },
                },
              },
            },
          }}
        >
          <StripePaymentForm
            priceLabel={priceLabel}
            intervalLabel={intervalLabel}
            plan={plan}
            requestId={checkout.data.requestId}
            requireContractAcceptance={contractAcceptanceEnabled}
          />
        </CheckoutElementsProvider>
      )}
    </BillingShell>
  );
};

const CheckoutState = ({
  title,
  description,
  loading = false,
  onRetry,
  actionTo,
  actionLabel,
}: {
  title: string;
  description: string;
  loading?: boolean;
  onRetry?: () => void;
  actionTo?: string;
  actionLabel?: string;
}) => (
  <div className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_28px_80px_-42px_rgba(36,24,77,0.5)] backdrop-blur-xl">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eeeaff] text-[#6048ed]">
      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <AlertCircle className="h-6 w-6" />}
    </div>
    <h2 className="mt-5 text-xl font-black tracking-[-0.025em]">{title}</h2>
    <p className="mt-2 text-sm font-medium leading-6 text-[#6d657d]">{description}</p>
    {actionTo && actionLabel ? (
      <Link
        to={actionTo}
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#17122b] px-5 text-sm font-black text-white transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#17122b]/20"
      >
        {actionLabel}
      </Link>
    ) : onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 min-h-12 rounded-2xl bg-[#17122b] px-5 text-sm font-black text-white transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#17122b]/20"
      >
        Tentar novamente
      </button>
    )}
  </div>
);

export default StripeCheckout;
