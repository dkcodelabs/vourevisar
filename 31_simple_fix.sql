-- =====================================================
-- SOLUÇÃO SIMPLES E DIRETA - SEM COMPLICAÇÃO
-- =====================================================

-- Remover todas as funções problemáticas
DROP FUNCTION IF EXISTS activate_paid_subscription(UUID, TEXT);
DROP FUNCTION IF EXISTS activate_trial_subscription(UUID, INTEGER);
DROP FUNCTION IF EXISTS deactivate_subscription(UUID);

-- Função SIMPLES para ativar assinatura paga
CREATE OR REPLACE FUNCTION activate_paid_subscription(
  target_user_id UUID,
  plan_type TEXT
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar permissões
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- Atualizar assinatura SIMPLES
  IF plan_type = 'monthly' THEN
    INSERT INTO user_subscriptions (user_id, plan, status, subscription_started_at, subscription_ends_at, updated_at)
    VALUES (target_user_id, 'monthly', 'active', NOW(), NOW() + INTERVAL '30 days', NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      plan = 'monthly',
      status = 'active',
      subscription_started_at = NOW(),
      subscription_ends_at = NOW() + INTERVAL '30 days',
      trial_started_at = NULL,
      trial_ends_at = NULL,
      updated_at = NOW();
  ELSIF plan_type = 'annual' THEN
    INSERT INTO user_subscriptions (user_id, plan, status, subscription_started_at, subscription_ends_at, updated_at)
    VALUES (target_user_id, 'annual', 'active', NOW(), NOW() + INTERVAL '365 days', NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      plan = 'annual',
      status = 'active',
      subscription_started_at = NOW(),
      subscription_ends_at = NOW() + INTERVAL '365 days',
      trial_started_at = NULL,
      trial_ends_at = NULL,
      updated_at = NOW();
  ELSE
    RETURN json_build_object('success', false, 'error', 'Plano inválido');
  END IF;
    
  RETURN json_build_object('success', true, 'plan', plan_type);
END;
$$;

-- Função SIMPLES para ativar trial
CREATE OR REPLACE FUNCTION activate_trial_subscription(
  target_user_id UUID,
  trial_days INTEGER DEFAULT 7
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar permissões
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- Atualizar assinatura SIMPLES
  INSERT INTO user_subscriptions (user_id, plan, status, trial_started_at, trial_ends_at, updated_at)
  VALUES (target_user_id, 'free_trial', 'trial', NOW(), NOW() + (trial_days || ' days')::INTERVAL, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    plan = 'free_trial',
    status = 'trial',
    trial_started_at = NOW(),
    trial_ends_at = NOW() + (trial_days || ' days')::INTERVAL,
    subscription_started_at = NULL,
    subscription_ends_at = NULL,
    updated_at = NOW();
    
  RETURN json_build_object('success', true);
END;
$$;

-- Função SIMPLES para desativar
CREATE OR REPLACE FUNCTION deactivate_subscription(
  target_user_id UUID
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar permissões
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Acesso negado');
  END IF;
  
  -- Marcar como expirada SIMPLES
  UPDATE user_subscriptions
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE user_id = target_user_id;
    
  RETURN json_build_object('success', true);
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION activate_paid_subscription(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_trial_subscription(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_subscription(UUID) TO authenticated;