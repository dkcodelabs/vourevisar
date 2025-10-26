-- =====================================================
-- CORREÇÃO DO ERRO DE TIMESTAMP
-- =====================================================

-- Remover funções com problema
DROP FUNCTION IF EXISTS activate_paid_subscription(UUID, TEXT);
DROP FUNCTION IF EXISTS activate_trial_subscription(UUID, INTEGER);
DROP FUNCTION IF EXISTS deactivate_subscription(UUID);

-- Recriar função para ativar assinatura paga (TIMESTAMP CORRIGIDO)
CREATE OR REPLACE FUNCTION activate_paid_subscription(
  target_user_id UUID,
  plan_type TEXT
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_time TIMESTAMP WITH TIME ZONE := NOW();
  end_date TIMESTAMP WITH TIME ZONE;
  new_plan subscription_plan;
BEGIN
  -- Verificar permissões
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- Converter texto para enum
  IF plan_type = 'monthly' THEN
    new_plan := 'monthly';
    end_date := current_time + INTERVAL '30 days';
  ELSIF plan_type = 'annual' THEN
    new_plan := 'annual';
    end_date := current_time + INTERVAL '365 days';
  ELSE
    RETURN json_build_object('success', false, 'error', 'Plano inválido: ' || plan_type);
  END IF;
  
  -- Atualizar assinatura (SEM USAR VARIÁVEIS DE TEMPO PROBLEMÁTICAS)
  INSERT INTO user_subscriptions (
    user_id,
    plan,
    status,
    subscription_started_at,
    subscription_ends_at,
    trial_started_at,
    trial_ends_at,
    created_at,
    updated_at
  )
  VALUES (
    target_user_id,
    new_plan,
    'active',
    NOW(),
    end_date,
    NULL,
    NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    subscription_started_at = NOW(),
    subscription_ends_at = EXCLUDED.subscription_ends_at,
    trial_started_at = NULL,
    trial_ends_at = NULL,
    updated_at = NOW();
    
  RETURN json_build_object(
    'success', true, 
    'plan', new_plan,
    'ends_at', end_date
  );
END;
$$;

-- Recriar função para ativar trial (TIMESTAMP CORRIGIDO)
CREATE OR REPLACE FUNCTION activate_trial_subscription(
  target_user_id UUID,
  trial_days INTEGER DEFAULT 7
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  trial_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Verificar permissões
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  trial_end := NOW() + (trial_days || ' days')::INTERVAL;
  
  -- Atualizar assinatura
  INSERT INTO user_subscriptions (
    user_id,
    plan,
    status,
    trial_started_at,
    trial_ends_at,
    subscription_started_at,
    subscription_ends_at,
    created_at,
    updated_at
  )
  VALUES (
    target_user_id,
    'free_trial',
    'trial',
    NOW(),
    trial_end,
    NULL,
    NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = 'free_trial',
    status = 'trial',
    trial_started_at = NOW(),
    trial_ends_at = trial_end,
    subscription_started_at = NULL,
    subscription_ends_at = NULL,
    updated_at = NOW();
    
  RETURN json_build_object(
    'success', true, 
    'trial_ends_at', trial_end
  );
END;
$$;

-- Recriar função para desativar assinatura (TIMESTAMP CORRIGIDO)
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
  
  -- Marcar como expirada
  UPDATE user_subscriptions
  SET 
    status = 'expired',
    subscription_ends_at = NOW(),
    trial_ends_at = NOW(),
    updated_at = NOW()
  WHERE user_id = target_user_id;
    
  RETURN json_build_object('success', true);
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION activate_paid_subscription(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_trial_subscription(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_subscription(UUID) TO authenticated;