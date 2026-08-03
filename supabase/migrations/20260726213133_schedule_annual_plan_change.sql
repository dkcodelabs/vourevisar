ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS scheduled_plan public.subscription_plan,
  ADD COLUMN IF NOT EXISTS scheduled_plan_at timestamptz;

COMMENT ON COLUMN public.user_subscriptions.scheduled_plan IS
  'Plano solicitado para a proxima cobranca, aplicado somente apos confirmacao do pagamento.';

COMMENT ON COLUMN public.user_subscriptions.scheduled_plan_at IS
  'Data da proxima cobranca em que o plano agendado passa a valer.';
