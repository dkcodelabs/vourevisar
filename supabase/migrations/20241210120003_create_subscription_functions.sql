-- Migration: Criar funções RPC para gerenciamento de assinaturas
-- Data: 2024-12-10
-- Objetivo: Implementar todas as funções necessárias para o sistema administrativo

-- 1. Função para obter informações de assinatura
CREATE OR REPLACE FUNCTION get_subscription_info(check_user_id UUID DEFAULT NULL)
RETURNS JSON AS $
DECLARE
  target_user_id UUID;
  subscription_record RECORD;
  result JSON;
BEGIN
  -- Se não especificou usuário, usar o atual
  target_user_id := COALESCE(check_user_id, auth.uid());
  
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
  
  -- Se não encontrou, retornar dados padrão
  IF NOT FOUND THEN
    result := json_build_object(
      'user_id', target_user_id,
      'plan', 'free_trial',
      'status', 'expired',
      'is_active', false,
      'days_remaining', 0,
      'trial_ends_at', null,
      'subscription_ends_at', null,
      'created_at', NOW(),
      'updated_at', NOW()
    );
  ELSE
    -- Calcular se está ativo e dias restantes
    DECLARE
      is_active BOOLEAN := false;
      days_remaining INTEGER := 0;
      end_date TIMESTAMPTZ;
    BEGIN
      -- Determinar data de fim baseada no status
      IF subscription_record.status = 'trial' AND subscription_record.trial_ends_at IS NOT NULL THEN
        end_date := subscription_record.trial_ends_at;
      ELSIF subscription_record.status = 'active' AND subscription_record.subscription_ends_at IS NOT NULL THEN
        end_date := subscription_record.subscription_ends_at;
      END IF;
      
      -- Verificar se está ativo
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
        'trial_ends_at', subscription_record.trial_ends_at,
        'subscription_ends_at', subscription_record.subscription_ends_at,
        'created_at', subscription_record.created_at,
        'updated_at', subscription_record.updated_at
      );
    END;
  END IF;
  
  RETURN result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função para ativar assinatura paga
CREATE OR REPLACE FUNCTION activate_paid_subscription(
  target_user_id UUID,
  plan_type TEXT DEFAULT 'monthly'
)
RETURNS JSON AS $
DECLARE
  end_date TIMESTAMPTZ;
  result JSON;
BEGIN
  -- Verificar se o usuário atual tem permissão (admin ou owner)
  IF NOT (
    EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
    OR auth.uid() = target_user_id
  ) THEN
    RETURN json_build_object('error', 'Permissão negada');
  END IF;
  
  -- Calcular data de fim
  IF plan_type = 'annual' THEN
    end_date := NOW() + INTERVAL '1 year';
  ELSE
    end_date := NOW() + INTERVAL '1 month';
  END IF;
  
  -- Inserir ou atualizar assinatura
  INSERT INTO user_subscriptions (
    user_id,
    plan,
    status,
    subscription_started_at,
    subscription_ends_at,
    trial_started_at,
    trial_ends_at,
    updated_at
  ) VALUES (
    target_user_id,
    plan_type::TEXT,
    'active',
    NOW(),
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
  
  result := json_build_object(
    'success', true,
    'message', 'Assinatura ' || plan_type || ' ativada com sucesso',
    'plan', plan_type,
    'ends_at', end_date
  );
  
  RETURN result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função para ativar trial
CREATE OR REPLACE FUNCTION activate_trial_subscription(
  target_user_id UUID,
  trial_days INTEGER DEFAULT 7
)
RETURNS JSON AS $
DECLARE
  end_date TIMESTAMPTZ;
  result JSON;
BEGIN
  -- Verificar permissão
  IF NOT (
    EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
    OR auth.uid() = target_user_id
  ) THEN
    RETURN json_build_object('error', 'Permissão negada');
  END IF;
  
  -- Calcular data de fim do trial
  end_date := NOW() + (trial_days || ' days')::INTERVAL;
  
  -- Inserir ou atualizar assinatura
  INSERT INTO user_subscriptions (
    user_id,
    plan,
    status,
    trial_started_at,
    trial_ends_at,
    subscription_started_at,
    subscription_ends_at,
    updated_at
  ) VALUES (
    target_user_id,
    'free_trial',
    'trial',
    NOW(),
    end_date,
    NULL,
    NULL,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = 'free_trial',
    status = 'trial',
    trial_started_at = NOW(),
    trial_ends_at = end_date,
    subscription_started_at = NULL,
    subscription_ends_at = NULL,
    updated_at = NOW();
  
  result := json_build_object(
    'success', true,
    'message', 'Trial de ' || trial_days || ' dias ativado com sucesso',
    'plan', 'free_trial',
    'ends_at', end_date
  );
  
  RETURN result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Função para cancelar assinatura
CREATE OR REPLACE FUNCTION cancel_subscription(target_user_id UUID)
RETURNS JSON AS $
DECLARE
  result JSON;
BEGIN
  -- Verificar permissão
  IF NOT (
    EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
    OR auth.uid() = target_user_id
  ) THEN
    RETURN json_build_object('error', 'Permissão negada');
  END IF;
  
  -- Atualizar status para cancelado
  UPDATE user_subscriptions 
  SET 
    status = 'canceled',
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- Verificar se atualizou
  IF FOUND THEN
    result := json_build_object(
      'success', true,
      'message', 'Assinatura cancelada com sucesso'
    );
  ELSE
    result := json_build_object(
      'error', 'Usuário não possui assinatura ativa'
    );
  END IF;
  
  RETURN result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Função para obter estatísticas de assinaturas (admin only)
CREATE OR REPLACE FUNCTION get_subscription_stats()
RETURNS JSON AS $
DECLARE
  stats JSON;
BEGIN
  -- Verificar se é admin
  IF NOT EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner')) THEN
    RETURN json_build_object('error', 'Permissão negada');
  END IF;
  
  -- Calcular estatísticas
  WITH subscription_counts AS (
    SELECT 
      COUNT(*) FILTER (WHERE status = 'trial' AND trial_ends_at > NOW()) as free_active,
      COUNT(*) FILTER (WHERE status = 'active' AND plan = 'monthly' AND subscription_ends_at > NOW()) as monthly_active,
      COUNT(*) FILTER (WHERE status = 'active' AND plan = 'annual' AND subscription_ends_at > NOW()) as annual_active,
      COUNT(*) FILTER (WHERE status IN ('expired', 'canceled') OR 
        (status = 'trial' AND trial_ends_at <= NOW()) OR
        (status = 'active' AND subscription_ends_at <= NOW())) as expired_total,
      COUNT(*) as total_subscriptions
    FROM user_subscriptions
  ),
  user_counts AS (
    SELECT COUNT(*) as total_users FROM auth.users
  )
  SELECT json_build_object(
    'freeActiveUsers', COALESCE(sc.free_active, 0),
    'monthlyUsers', COALESCE(sc.monthly_active, 0),
    'annualUsers', COALESCE(sc.annual_active, 0),
    'expiredUsers', COALESCE(sc.expired_total, 0),
    'totalUsers', COALESCE(uc.total_users, 0),
    'totalSubscriptions', COALESCE(sc.total_subscriptions, 0)
  )
  INTO stats
  FROM subscription_counts sc
  CROSS JOIN user_counts uc;
  
  RETURN stats;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Função para atualizar assinaturas expiradas (manutenção)
CREATE OR REPLACE FUNCTION update_expired_subscriptions()
RETURNS JSON AS $
DECLARE
  updated_count INTEGER;
BEGIN
  -- Atualizar trials expirados
  UPDATE user_subscriptions 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'trial' 
    AND trial_ends_at IS NOT NULL 
    AND trial_ends_at <= NOW();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Atualizar assinaturas pagas expiradas
  UPDATE user_subscriptions 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' 
    AND subscription_ends_at IS NOT NULL 
    AND subscription_ends_at <= NOW();
  
  GET DIAGNOSTICS updated_count = updated_count + ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Assinaturas expiradas atualizadas',
    'updated_count', updated_count
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Criar tabela user_subscriptions se não existir
CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free_trial' CHECK (plan IN ('free_trial', 'monthly', 'annual')),
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'canceled', 'suspended')),
  
  -- Datas do trial
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  
  -- Datas da assinatura paga
  subscription_started_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. RLS para user_subscriptions
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver suas próprias assinaturas
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Admins podem ver todas as assinaturas
CREATE POLICY "Admins can view all subscriptions" ON user_subscriptions
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- Usuários podem inserir/atualizar suas próprias assinaturas
CREATE POLICY "Users can manage own subscriptions" ON user_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Admins podem gerenciar todas as assinaturas
CREATE POLICY "Admins can manage all subscriptions" ON user_subscriptions
  FOR ALL USING (
    EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- 9. Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status_plan 
  ON user_subscriptions(status, plan);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_trial_ends 
  ON user_subscriptions(trial_ends_at) WHERE status = 'trial';

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_subscription_ends 
  ON user_subscriptions(subscription_ends_at) WHERE status = 'active';