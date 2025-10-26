-- =====================================================
-- FUNÇÕES PARA GERENCIAR ASSINATURAS - VERSÃO CORRIGIDA
-- =====================================================

-- Função para verificar se o usuário tem acesso ativo
CREATE OR REPLACE FUNCTION has_active_subscription(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  subscription_record user_subscriptions%ROWTYPE;
  current_time TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Buscar assinatura do usuário
  SELECT * INTO subscription_record
  FROM user_subscriptions
  WHERE user_id = check_user_id;
  
  -- Se não tem assinatura, não tem acesso
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar baseado no status
  CASE subscription_record.status
    WHEN 'trial' THEN
      -- Trial ativo se ainda não expirou
      RETURN current_time <= subscription_record.trial_ends_at;
      
    WHEN 'active' THEN
      -- Assinatura ativa se ainda não expirou
      RETURN subscription_record.subscription_ends_at IS NULL OR 
             current_time <= subscription_record.subscription_ends_at;
             
    WHEN 'canceled' THEN
      -- Cancelada mas ainda pode ter tempo restante
      RETURN subscription_record.subscription_ends_at IS NOT NULL AND
             current_time <= subscription_record.subscription_ends_at;
             
    ELSE
      -- expired, suspended
      RETURN FALSE;
  END CASE;
END;
$$;

-- Função para obter informações da assinatura
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
  -- Buscar assinatura do usuário
  SELECT * INTO subscription_record
  FROM user_subscriptions
  WHERE user_id = check_user_id;
  
  -- Se não tem assinatura, criar uma trial
  IF NOT FOUND THEN
    INSERT INTO user_subscriptions (user_id, plan, status)
    VALUES (check_user_id, 'free_trial', 'trial')
    RETURNING * INTO subscription_record;
  END IF;
  
  -- Verificar se está ativo
  is_active := has_active_subscription(check_user_id);
  
  -- Calcular dias restantes
  IF subscription_record.status = 'trial' THEN
    days_remaining := EXTRACT(DAY FROM subscription_record.trial_ends_at - current_time);
  ELSIF subscription_record.subscription_ends_at IS NOT NULL THEN
    days_remaining := EXTRACT(DAY FROM subscription_record.subscription_ends_at - current_time);
  ELSE
    days_remaining := NULL; -- Assinatura sem data de expiração
  END IF;
  
  -- Montar resultado JSON
  result := json_build_object(
    'user_id', subscription_record.user_id,
    'plan', subscription_record.plan,
    'status', subscription_record.status,
    'is_active', is_active,
    'days_remaining', GREATEST(0, COALESCE(days_remaining, 0)),
    'trial_ends_at', subscription_record.trial_ends_at,
    'subscription_ends_at', subscription_record.subscription_ends_at,
    'created_at', subscription_record.created_at,
    'updated_at', subscription_record.updated_at
  );
  
  RETURN result;
END;
$$;

-- Função para iniciar assinatura paga
CREATE OR REPLACE FUNCTION start_paid_subscription(
  target_user_id UUID,
  new_plan subscription_plan,
  duration_months INTEGER DEFAULT 1
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_time TIMESTAMP WITH TIME ZONE := NOW();
  end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calcular data de fim baseado no plano
  IF new_plan = 'monthly' THEN
    end_date := current_time + INTERVAL '1 month';
  ELSIF new_plan = 'annual' THEN
    end_date := current_time + INTERVAL '12 months';
  ELSE
    RAISE EXCEPTION 'Plano inválido para assinatura paga: %', new_plan;
  END IF;
  
  -- Atualizar ou inserir assinatura
  INSERT INTO user_subscriptions (
    user_id, 
    plan, 
    status,
    subscription_started_at,
    subscription_ends_at
  )
  VALUES (
    target_user_id,
    new_plan,
    'active',
    current_time,
    end_date
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    subscription_started_at = EXCLUDED.subscription_started_at,
    subscription_ends_at = EXCLUDED.subscription_ends_at,
    updated_at = NOW();
    
  RETURN TRUE;
END;
$$;

-- Função para cancelar assinatura
CREATE OR REPLACE FUNCTION cancel_subscription(
  target_user_id UUID,
  immediate BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF immediate THEN
    -- Cancelamento imediato
    UPDATE user_subscriptions
    SET 
      status = 'expired',
      subscription_ends_at = NOW(),
      updated_at = NOW()
    WHERE user_id = target_user_id;
  ELSE
    -- Cancelamento no final do período
    UPDATE user_subscriptions
    SET 
      status = 'canceled',
      updated_at = NOW()
    WHERE user_id = target_user_id;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Função simples para atualizar assinaturas expiradas
CREATE OR REPLACE FUNCTION update_expired_subscriptions()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  total_updated INTEGER := 0;
BEGIN
  -- Atualizar trials expirados
  WITH updated_trials AS (
    UPDATE user_subscriptions
    SET status = 'expired'
    WHERE status = 'trial' 
      AND trial_ends_at <= NOW()
    RETURNING 1
  )
  SELECT COUNT(*) INTO total_updated FROM updated_trials;
  
  -- Atualizar assinaturas pagas expiradas
  WITH updated_subscriptions AS (
    UPDATE user_subscriptions
    SET status = 'expired'
    WHERE status IN ('active', 'canceled')
      AND subscription_ends_at IS NOT NULL
      AND subscription_ends_at <= NOW()
    RETURNING 1
  )
  SELECT total_updated + COUNT(*) INTO total_updated FROM updated_subscriptions;
  
  RETURN total_updated;
END;
$$;

-- Comentários para documentação
COMMENT ON FUNCTION has_active_subscription(UUID) IS 'Verifica se o usuário tem acesso ativo (trial ou pago)';
COMMENT ON FUNCTION get_subscription_info(UUID) IS 'Retorna informações completas da assinatura do usuário';
COMMENT ON FUNCTION start_paid_subscription(UUID, subscription_plan, INTEGER) IS 'Inicia uma assinatura paga para o usuário';
COMMENT ON FUNCTION cancel_subscription(UUID, BOOLEAN) IS 'Cancela a assinatura do usuário';
COMMENT ON FUNCTION update_expired_subscriptions() IS 'Atualiza status de assinaturas expiradas (para job automático)';