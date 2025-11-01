-- Migration: Adicionar apenas funções que estão faltando
-- Data: 2024-12-10
-- Objetivo: Resolver erro 404 da função get_subscription_info sem quebrar o existente

-- 1. Criar apenas a função get_subscription_info se não existir
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
      'trial_ends_at', null,
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
      'trial_ends_at', null,
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
      ELSIF subscription_record.status = 'active' AND subscription_record.subscription_ends_at IS NOT NULL THEN
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

-- 2. Criar tabela user_subscriptions se não existir
CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free_trial' CHECK (plan IN ('free_trial', 'monthly', 'annual')),
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'canceled', 'suspended')),
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  subscription_started_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS na tabela user_subscriptions se não estiver
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Adicionar política permissiva para user_roles se não existir
DO $$
BEGIN
  -- Verificar se a política já existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_roles' 
    AND policyname = 'Allow first owner insert'
  ) THEN
    CREATE POLICY "Allow first owner insert" ON user_roles
      FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND (
          -- Permitir se não existe nenhum owner ainda
          NOT EXISTS(SELECT 1 FROM user_roles WHERE role = 'owner')
          OR
          -- Ou se já é owner
          EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'owner')
        )
      );
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 5. Adicionar política permissiva para user_subscriptions se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_subscriptions' 
    AND policyname = 'Users can manage own subscriptions'
  ) THEN
    CREATE POLICY "Users can manage own subscriptions" ON user_subscriptions
      FOR ALL USING (auth.uid() = user_id);
  END IF;

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
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 6. Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status_plan ON user_subscriptions(status, plan);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);