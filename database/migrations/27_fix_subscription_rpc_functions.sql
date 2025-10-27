-- =====================================================
-- CORREÇÃO DAS FUNÇÕES RPC PARA ASSINATURAS
-- =====================================================

-- Primeiro, vamos garantir que as funções existam e estejam acessíveis via RPC

-- Função para obter informações da assinatura (acessível via RPC)
CREATE OR REPLACE FUNCTION get_subscription_info(check_user_id UUID DEFAULT auth.uid())
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  subscription_record user_subscriptions%ROWTYPE;
  current_time TIMESTAMP WITH TIME ZONE := NOW();
  result JSON;
  days_remaining INTEGER;
  is_active BOOLEAN;
BEGIN
  -- Verificar se o usuário está autenticado
  IF check_user_id IS NULL THEN
    RETURN json_build_object(
      'error', 'Usuário não autenticado',
      'is_active', false,
      'plan', 'free',
      'status', 'unauthenticated'
    );
  END IF;

  -- Buscar assinatura do usuário
  SELECT * INTO subscription_record
  FROM user_subscriptions
  WHERE user_id = check_user_id;
  
  -- Se não tem assinatura, criar uma trial automaticamente
  IF NOT FOUND THEN
    INSERT INTO user_subscriptions (
      user_id, 
      plan, 
      status,
      trial_started_at,
      trial_ends_at
    )
    VALUES (
      check_user_id, 
      'free_trial', 
      'trial',
      current_time,
      current_time + INTERVAL '7 days'
    )
    RETURNING * INTO subscription_record;
  END IF;
  
  -- Verificar se está ativo
  is_active := false;
  days_remaining := 0;
  
  IF subscription_record.status = 'trial' AND subscription_record.trial_ends_at IS NOT NULL THEN
    is_active := current_time <= subscription_record.trial_ends_at;
    days_remaining := GREATEST(0, EXTRACT(DAY FROM subscription_record.trial_ends_at - current_time)::INTEGER);
  ELSIF subscription_record.status = 'active' AND subscription_record.subscription_ends_at IS NOT NULL THEN
    is_active := current_time <= subscription_record.subscription_ends_at;
    days_remaining := GREATEST(0, EXTRACT(DAY FROM subscription_record.subscription_ends_at - current_time)::INTEGER);
  ELSIF subscription_record.status = 'active' AND subscription_record.subscription_ends_at IS NULL THEN
    -- Assinatura sem data de expiração (vitalícia)
    is_active := true;
    days_remaining := NULL;
  END IF;
  
  -- Montar resultado JSON
  result := json_build_object(
    'user_id', subscription_record.user_id,
    'plan', subscription_record.plan,
    'status', subscription_record.status,
    'is_active', is_active,
    'days_remaining', days_remaining,
    'trial_ends_at', subscription_record.trial_ends_at,
    'subscription_ends_at', subscription_record.subscription_ends_at,
    'created_at', subscription_record.created_at,
    'updated_at', subscription_record.updated_at
  );
  
  RETURN result;
END;
$$;

-- Função para atualizar assinatura de usuário (acessível via RPC)
CREATE OR REPLACE FUNCTION update_user_subscription(
  target_user_id UUID,
  new_plan subscription_plan,
  new_status subscription_status,
  new_trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  new_trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  new_subscription_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  new_subscription_ends_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar se o usuário atual tem permissão (deve ser admin ou owner)
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar assinaturas';
  END IF;

  -- Atualizar ou inserir assinatura
  INSERT INTO user_subscriptions (
    user_id,
    plan,
    status,
    trial_started_at,
    trial_ends_at,
    subscription_started_at,
    subscription_ends_at,
    updated_at
  )
  VALUES (
    target_user_id,
    new_plan,
    new_status,
    new_trial_started_at,
    new_trial_ends_at,
    new_subscription_started_at,
    new_subscription_ends_at,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    trial_started_at = EXCLUDED.trial_started_at,
    trial_ends_at = EXCLUDED.trial_ends_at,
    subscription_started_at = EXCLUDED.subscription_started_at,
    subscription_ends_at = EXCLUDED.subscription_ends_at,
    updated_at = NOW();
    
  RETURN TRUE;
END;
$$;

-- Função para ativar assinatura paga (simplificada para RPC)
CREATE OR REPLACE FUNCTION activate_paid_subscription(
  target_user_id UUID,
  plan_type TEXT -- 'monthly' ou 'annual'
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
    end_date := current_time + INTERVAL '1 month';
  ELSIF plan_type = 'annual' THEN
    new_plan := 'annual';
    end_date := current_time + INTERVAL '12 months';
  ELSE
    RETURN json_build_object('success', false, 'error', 'Plano inválido');
  END IF;
  
  -- Atualizar assinatura
  INSERT INTO user_subscriptions (
    user_id,
    plan,
    status,
    subscription_started_at,
    subscription_ends_at,
    trial_started_at,
    trial_ends_at,
    updated_at
  )
  VALUES (
    target_user_id,
    new_plan,
    'active',
    current_time,
    end_date,
    NULL,
    NULL,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    subscription_started_at = EXCLUDED.subscription_started_at,
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

-- Função para ativar trial (simplificada para RPC)
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
  current_time TIMESTAMP WITH TIME ZONE := NOW();
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

  trial_end := current_time + (trial_days || ' days')::INTERVAL;
  
  -- Atualizar assinatura
  INSERT INTO user_subscriptions (
    user_id,
    plan,
    status,
    trial_started_at,
    trial_ends_at,
    subscription_started_at,
    subscription_ends_at,
    updated_at
  )
  VALUES (
    target_user_id,
    'free_trial',
    'trial',
    current_time,
    trial_end,
    NULL,
    NULL,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = 'free_trial',
    status = 'trial',
    trial_started_at = current_time,
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

-- Função para desativar assinatura
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

-- Garantir que as funções tenham as permissões corretas
GRANT EXECUTE ON FUNCTION get_subscription_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_subscription(UUID, subscription_plan, subscription_status, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_paid_subscription(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_trial_subscription(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_subscription(UUID) TO authenticated;

-- Comentários
COMMENT ON FUNCTION get_subscription_info(UUID) IS 'Obtém informações da assinatura do usuário (acessível via RPC)';
COMMENT ON FUNCTION update_user_subscription(UUID, subscription_plan, subscription_status, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 'Atualiza assinatura do usuário (apenas admins)';
COMMENT ON FUNCTION activate_paid_subscription(UUID, TEXT) IS 'Ativa assinatura paga (apenas admins)';
COMMENT ON FUNCTION activate_trial_subscription(UUID, INTEGER) IS 'Ativa trial (apenas admins)';
COMMENT ON FUNCTION deactivate_subscription(UUID) IS 'Desativa assinatura (apenas admins)';