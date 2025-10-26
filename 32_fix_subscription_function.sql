-- =====================================================
-- CORRIGIR FUNÇÃO get_subscription_info
-- =====================================================

-- Remover função problemática
DROP FUNCTION IF EXISTS get_subscription_info(UUID);

-- Criar função SIMPLES e FUNCIONAL
CREATE OR REPLACE FUNCTION get_subscription_info(check_user_id UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  subscription_record user_subscriptions%ROWTYPE;
  result JSON;
BEGIN
  -- Buscar assinatura do usuário
  SELECT * INTO subscription_record
  FROM user_subscriptions
  WHERE user_id = check_user_id;
  
  -- Se não encontrou assinatura
  IF NOT FOUND THEN
    RETURN json_build_object(
      'plan', null,
      'status', null,
      'is_active', false,
      'days_remaining', null,
      'subscription_ends_at', null,
      'trial_ends_at', null
    );
  END IF;
  
  -- Calcular se está ativo e dias restantes
  DECLARE
    is_active BOOLEAN := false;
    days_remaining INTEGER := null;
    end_date TIMESTAMP WITH TIME ZONE := null;
  BEGIN
    -- Para trial
    IF subscription_record.status = 'trial' AND subscription_record.trial_ends_at IS NOT NULL THEN
      end_date := subscription_record.trial_ends_at;
      is_active := end_date > NOW();
      IF is_active THEN
        days_remaining := EXTRACT(DAY FROM (end_date - NOW()))::INTEGER;
      END IF;
    END IF;
    
    -- Para assinatura paga
    IF subscription_record.status = 'active' AND subscription_record.subscription_ends_at IS NOT NULL THEN
      end_date := subscription_record.subscription_ends_at;
      is_active := end_date > NOW();
      IF is_active THEN
        days_remaining := EXTRACT(DAY FROM (end_date - NOW()))::INTEGER;
      END IF;
    END IF;
    
    -- Para assinatura vitalícia (sem data de fim)
    IF subscription_record.status = 'active' AND subscription_record.subscription_ends_at IS NULL THEN
      is_active := true;
      days_remaining := null; -- Vitalícia
    END IF;
    
    -- Construir resultado
    result := json_build_object(
      'plan', subscription_record.plan,
      'status', subscription_record.status,
      'is_active', is_active,
      'days_remaining', days_remaining,
      'subscription_ends_at', subscription_record.subscription_ends_at,
      'trial_ends_at', subscription_record.trial_ends_at,
      'subscription_started_at', subscription_record.subscription_started_at,
      'trial_started_at', subscription_record.trial_started_at
    );
    
    RETURN result;
  END;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION get_subscription_info(UUID) TO authenticated;

-- Testar a função
SELECT get_subscription_info('e245ef9d-fc38-48f9-b3b2-e887a211a1b2'::UUID);