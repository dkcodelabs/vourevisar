-- =====================================================
-- CORREÇÕES PARA PROBLEMAS DE ASSINATURA
-- =====================================================

-- 1. Primeiro, remover a função existente se houver
DROP FUNCTION IF EXISTS get_subscription_info(UUID);

-- 2. Recriar a função get_subscription_info corrigida
CREATE OR REPLACE FUNCTION get_subscription_info(check_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  user_id UUID,
  plan subscription_plan,
  status subscription_status,
  is_active BOOLEAN,
  days_remaining INTEGER,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  subscription_record user_subscriptions%ROWTYPE;
  current_time TIMESTAMP WITH TIME ZONE := NOW();
  is_active_result BOOLEAN := FALSE;
  days_remaining_result INTEGER := 0;
BEGIN
  -- Buscar assinatura do usuário
  SELECT * INTO subscription_record
  FROM user_subscriptions
  WHERE user_subscriptions.user_id = check_user_id;
  
  -- Se não tem assinatura, retornar dados padrão
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      check_user_id,
      'free_trial'::subscription_plan,
      'expired'::subscription_status,
      FALSE,
      0,
      NULL::TIMESTAMP WITH TIME ZONE,
      NULL::TIMESTAMP WITH TIME ZONE,
      current_time,
      current_time;
    RETURN;
  END IF;
  
  -- Calcular se está ativo e dias restantes
  CASE subscription_record.status
    WHEN 'trial' THEN
      IF subscription_record.trial_ends_at IS NOT NULL THEN
        is_active_result := current_time <= subscription_record.trial_ends_at;
        days_remaining_result := GREATEST(0, EXTRACT(DAY FROM subscription_record.trial_ends_at - current_time)::INTEGER);
      END IF;
      
    WHEN 'active' THEN
      IF subscription_record.subscription_ends_at IS NOT NULL THEN
        is_active_result := current_time <= subscription_record.subscription_ends_at;
        days_remaining_result := GREATEST(0, EXTRACT(DAY FROM subscription_record.subscription_ends_at - current_time)::INTEGER);
      ELSE
        is_active_result := TRUE; -- Assinatura sem data de fim
        days_remaining_result := 999999;
      END IF;
      
    WHEN 'canceled' THEN
      IF subscription_record.subscription_ends_at IS NOT NULL THEN
        is_active_result := current_time <= subscription_record.subscription_ends_at;
        days_remaining_result := GREATEST(0, EXTRACT(DAY FROM subscription_record.subscription_ends_at - current_time)::INTEGER);
      END IF;
      
    ELSE
      -- expired, suspended
      is_active_result := FALSE;
      days_remaining_result := 0;
  END CASE;
  
  -- Retornar resultado
  RETURN QUERY SELECT 
    subscription_record.user_id,
    subscription_record.plan,
    subscription_record.status,
    is_active_result,
    days_remaining_result,
    subscription_record.trial_ends_at,
    subscription_record.subscription_ends_at,
    subscription_record.created_at,
    subscription_record.updated_at;
END;
$$;

-- 3. Função para atualizar assinatura (substitui upsert problemático)
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
  -- Verificar se já existe
  IF EXISTS (SELECT 1 FROM user_subscriptions WHERE user_id = target_user_id) THEN
    -- Atualizar existente
    UPDATE user_subscriptions SET
      plan = new_plan,
      status = new_status,
      trial_started_at = new_trial_started_at,
      trial_ends_at = new_trial_ends_at,
      subscription_started_at = new_subscription_started_at,
      subscription_ends_at = new_subscription_ends_at,
      updated_at = NOW()
    WHERE user_id = target_user_id;
  ELSE
    -- Inserir novo
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
    ) VALUES (
      target_user_id,
      new_plan,
      new_status,
      new_trial_started_at,
      new_trial_ends_at,
      new_subscription_started_at,
      new_subscription_ends_at,
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN TRUE;
END;
$$;

-- 4. Comentários das funções
COMMENT ON FUNCTION get_subscription_info(UUID) IS 'Retorna informações completas da assinatura do usuário';
COMMENT ON FUNCTION update_user_subscription(UUID, subscription_plan, subscription_status, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 'Atualiza ou insere assinatura do usuário';