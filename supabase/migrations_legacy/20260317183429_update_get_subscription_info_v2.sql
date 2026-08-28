CREATE OR REPLACE FUNCTION get_subscription_info(check_user_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  target_user_id UUID;
  subscription_record RECORD;
  result JSON;
BEGIN
  target_user_id := COALESCE(check_user_id, auth.uid());
  
  -- Verificar se a tabela user_subscriptions existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
    -- Se não existe, retornar dados padrão
    result := json_build_object(
      'user_id', target_user_id,
      'plan', 'free_trial',
      'status', 'expired',
      'is_active', false,
      'days_remaining', 0,
      'trial_started_at', null,
      'trial_ends_at', null,
      'subscription_started_at', null,
      'subscription_ends_at', null,
      'created_at', NOW(),
      'updated_at', NOW()
    );
    RETURN result;
  END IF;
  
  -- Buscar assinatura
  SELECT 
    user_id,
    plan,
    status,
    trial_started_at,
    trial_ends_at,
    subscription_started_at,
    subscription_ends_at,
    created_at,
    updated_at
  INTO subscription_record
  FROM user_subscriptions
  WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    result := json_build_object(
      'user_id', target_user_id,
      'plan', 'free_trial',
      'status', 'expired',
      'is_active', false,
      'days_remaining', 0,
      'trial_started_at', null,
      'trial_ends_at', null,
      'subscription_started_at', null,
      'subscription_ends_at', null,
      'created_at', NOW(),
      'updated_at', NOW()
    );
  ELSE
    DECLARE
      is_active BOOLEAN := false;
      days_remaining INTEGER := 0;
      end_date TIMESTAMPTZ;
    BEGIN
      IF subscription_record.status = 'trial' AND subscription_record.trial_ends_at IS NOT NULL THEN
        end_date := subscription_record.trial_ends_at;
      ELSIF (subscription_record.status = 'active' OR subscription_record.status = 'suspended' OR subscription_record.status = 'canceled') AND subscription_record.subscription_ends_at IS NOT NULL THEN
        -- Mesmo cancelado ou suspenso, pode ainda estar no período pago
        end_date := subscription_record.subscription_ends_at;
      END IF;
      
      IF end_date IS NOT NULL AND end_date > NOW() THEN
        is_active := true;
        days_remaining := EXTRACT(DAY FROM (end_date - NOW()))::INTEGER;
      END IF;
      
      result := json_build_object(
        'user_id', subscription_record.user_id,
        'plan', subscription_record.plan,
        'status', subscription_record.status,
        'is_active', is_active,
        'days_remaining', days_remaining,
        'trial_started_at', subscription_record.trial_started_at,
        'trial_ends_at', subscription_record.trial_ends_at,
        'subscription_started_at', subscription_record.subscription_started_at,
        'subscription_ends_at', subscription_record.subscription_ends_at,
        'created_at', subscription_record.created_at,
        'updated_at', subscription_record.updated_at
      );
    END;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
