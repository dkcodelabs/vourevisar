-- Migration: Criar funções RPC para gerenciamento de assinaturas (SAFE VERSION)
-- Data: 2024-12-10
-- Objetivo: Implementar todas as funções necessárias para o sistema administrativo

-- 1. Criar tabela user_subscriptions se não existir
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

-- 2. Habilitar RLS se ainda não estiver
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas apenas se não existirem
DO $$
BEGIN
  -- Política para usuários verem suas próprias assinaturas
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_subscriptions' 
    AND policyname = 'Users can view own subscriptions'
  ) THEN
    CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- Política para admins verem todas as assinaturas
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_subscriptions' 
    AND policyname = 'Admins can view all subscriptions'
  ) THEN
    CREATE POLICY "Admins can view all subscriptions" ON user_subscriptions
      FOR SELECT USING (
        EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
      );
  END IF;

  -- Política para usuários gerenciarem suas próprias assinaturas
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_subscriptions' 
    AND policyname = 'Users can manage own subscriptions'
  ) THEN
    CREATE POLICY "Users can manage own subscriptions" ON user_subscriptions
      FOR ALL USING (auth.uid() = user_id);
  END IF;

  -- Política para admins gerenciarem todas as assinaturas
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_subscriptions' 
    AND policyname = 'Admins can manage all subscriptions'
  ) THEN
    CREATE POLICY "Admins can manage all subscriptions" ON user_subscriptions
      FOR ALL USING (
        EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
      );
  END IF;
END
$$;

-- 4. Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status_plan 
  ON user_subscriptions(status, plan);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_trial_ends 
  ON user_subscriptions(trial_ends_at) WHERE status = 'trial';

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_subscription_ends 
  ON user_subscriptions(subscription_ends_at) WHERE status = 'active';

-- 5. Função para obter informações de assinatura
CREATE OR REPLACE FUNCTION get_subscription_info(check_user_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- 6. Função para ativar assinatura paga
CREATE OR REPLACE FUNCTION activate_paid_subscription(
  target_user_id UUID,
  plan_type TEXT DEFAULT 'monthly'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- 7. Função para ativar trial
CREATE OR REPLACE FUNCTION activate_trial_subscription(
  target_user_id UUID,
  trial_days INTEGER DEFAULT 7
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- 8. Função para cancelar assinatura
CREATE OR REPLACE FUNCTION cancel_subscription(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;