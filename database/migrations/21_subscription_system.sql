-- =====================================================
-- SISTEMA DE ASSINATURAS E PLANOS
-- =====================================================

-- Enum para tipos de planos
CREATE TYPE subscription_plan AS ENUM (
  'free_trial',    -- Teste grátis de 7 dias
  'monthly',       -- Plano mensal
  'annual'         -- Plano anual
);

-- Enum para status da assinatura
CREATE TYPE subscription_status AS ENUM (
  'trial',         -- Em período de teste
  'active',        -- Assinatura ativa
  'expired',       -- Assinatura expirada
  'canceled',      -- Cancelada (mas ainda pode ter tempo restante)
  'suspended'      -- Suspensa por falta de pagamento
);

-- Tabela de assinaturas dos usuários
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Informações do plano
  plan subscription_plan NOT NULL DEFAULT 'free_trial',
  status subscription_status NOT NULL DEFAULT 'trial',
  
  -- Datas importantes
  trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  
  -- Informações de pagamento
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  last_payment_at TIMESTAMP WITH TIME ZONE,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  
  -- Controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_trial_period CHECK (trial_ends_at > trial_started_at),
  CONSTRAINT valid_subscription_period CHECK (
    subscription_ends_at IS NULL OR 
    subscription_started_at IS NULL OR 
    subscription_ends_at > subscription_started_at
  )
);

-- Índices para performance
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_plan ON user_subscriptions(plan);
CREATE INDEX idx_user_subscriptions_expires ON user_subscriptions(subscription_ends_at);
CREATE INDEX idx_user_subscriptions_trial_expires ON user_subscriptions(trial_ends_at);

-- Tabela de histórico de pagamentos
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE NOT NULL,
  
  -- Informações do pagamento
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  plan subscription_plan NOT NULL,
  
  -- Integração com Stripe
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  
  -- Status e datas
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending, succeeded, failed, canceled
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Período coberto por este pagamento
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Índices para histórico de pagamentos
CREATE INDEX idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX idx_payment_history_subscription_id ON payment_history(subscription_id);
CREATE INDEX idx_payment_history_status ON payment_history(payment_status);
CREATE INDEX idx_payment_history_paid_at ON payment_history(paid_at);

-- RLS (Row Level Security)
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Policies para user_subscriptions
CREATE POLICY "Users can view their own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" ON user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" ON user_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'owner')
    )
  );

-- Policies para payment_history
CREATE POLICY "Users can view their own payment history" ON payment_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment history" ON payment_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'owner')
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- Comentários para documentação
COMMENT ON TABLE user_subscriptions IS 'Tabela que gerencia as assinaturas dos usuários';
COMMENT ON TABLE payment_history IS 'Histórico de todos os pagamentos realizados';
COMMENT ON TYPE subscription_plan IS 'Tipos de planos disponíveis: free_trial, monthly, annual';
COMMENT ON TYPE subscription_status IS 'Status da assinatura: trial, active, expired, canceled, suspended';