-- Migration: Fix Final para Setup Administrativo
-- Data: 2024-12-10
-- Objetivo: Resolver conflitos e criar sistema administrativo funcional

-- 1. Remover funções existentes que podem ter conflitos
DROP FUNCTION IF EXISTS is_owner(uuid);
DROP FUNCTION IF EXISTS is_owner();
DROP FUNCTION IF EXISTS is_admin(uuid);
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS get_subscription_info(uuid);
DROP FUNCTION IF EXISTS get_subscription_info();

-- 2. Criar tabela user_roles com RLS permissivo
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'moderator', 'admin', 'owner')),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Habilitar RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Remover todas as políticas existentes
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
  DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
  DROP POLICY IF EXISTS "Owners can manage all roles" ON user_roles;
  DROP POLICY IF EXISTS "Allow authenticated users to read roles" ON user_roles;
  DROP POLICY IF EXISTS "Allow authenticated users to insert first owner" ON user_roles;
  DROP POLICY IF EXISTS "Allow owners to manage all roles" ON user_roles;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 5. Criar políticas permissivas para setup inicial
CREATE POLICY "Allow read roles" ON user_roles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow first owner setup" ON user_roles
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND (
      NOT EXISTS(SELECT 1 FROM user_roles WHERE role = 'owner')
      OR EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'owner')
    )
  );

CREATE POLICY "Allow owner management" ON user_roles
  FOR ALL USING (
    EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'owner')
  );

-- 6. Criar tabela user_subscriptions
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

-- 7. RLS para user_subscriptions
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
  DROP POLICY IF EXISTS "Admins can view all subscriptions" ON user_subscriptions;
  DROP POLICY IF EXISTS "Users can manage own subscriptions" ON user_subscriptions;
  DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON user_subscriptions;
  DROP POLICY IF EXISTS "Allow users to view own subscriptions" ON user_subscriptions;
  DROP POLICY IF EXISTS "Allow users to manage own subscriptions" ON user_subscriptions;
  DROP POLICY IF EXISTS "Allow admins to manage all subscriptions" ON user_subscriptions;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Criar políticas para subscriptions
CREATE POLICY "View own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Manage own subscriptions" ON user_subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admin manage all subscriptions" ON user_subscriptions
  FOR ALL USING (
    EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- 8. Função get_subscription_info
CREATE FUNCTION get_subscription_info(check_user_id UUID DEFAULT NULL)
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

-- 9. Função is_owner
CREATE FUNCTION is_owner(check_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(check_user_id, auth.uid());
  
  RETURN EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = target_user_id AND role = 'owner'
  );
END;
$$;

-- 10. Função is_admin
CREATE FUNCTION is_admin(check_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(check_user_id, auth.uid());
  
  RETURN EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = target_user_id AND role IN ('admin', 'owner')
  );
END;
$$;

-- 11. Criar índices
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status_plan ON user_subscriptions(status, plan);