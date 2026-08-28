ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz;

COMMENT ON COLUMN public.user_subscriptions.cancel_at_period_end IS
  'Indica que a renovacao automatica foi cancelada, preservando o acesso ate subscription_ends_at.';

COMMENT ON COLUMN public.user_subscriptions.canceled_at IS
  'Momento em que o usuario solicitou o cancelamento da renovacao.';
