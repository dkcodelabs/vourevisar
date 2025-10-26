-- =====================================================
-- FUNÇÃO PARA ATIVAR TRIAL DE FORMA SEGURA
-- =====================================================

-- Função para ativar trial de 7 dias
CREATE OR REPLACE FUNCTION activate_trial_subscription(
  target_user_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_time TIMESTAMP WITH TIME ZONE := NOW();
  trial_end TIMESTAMP WITH TIME ZONE := NOW() + INTERVAL '7 days';
BEGIN
  -- Inserir ou atualizar assinatura trial
  INSERT INTO user_subscriptions (
    user_id, 
    plan, 
    status,
    trial_started_at,
    trial_ends_at,
    updated_at
  )
  VALUES (
    target_user_id,
    'free_trial',
    'trial',
    current_time,
    trial_end,
    current_time
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    trial_started_at = EXCLUDED.trial_started_at,
    trial_ends_at = EXCLUDED.trial_ends_at,
    updated_at = EXCLUDED.updated_at,
    -- Limpar dados de assinatura paga se houver
    subscription_started_at = NULL,
    subscription_ends_at = NULL,
    stripe_customer_id = NULL,
    stripe_subscription_id = NULL;
    
  RETURN TRUE;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION activate_trial_subscription(UUID) IS 'Ativa um trial de 7 dias para o usuário especificado';