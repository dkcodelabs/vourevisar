-- Migration: Implementar segurança financeira, logs de IA e limites do extrator
-- Data: 2026-05-27
-- Autor: Antigravity

-- 1. Criar Tabela ai_usage_logs
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    mode TEXT NOT NULL,
    prompt_tokens INTEGER,
    candidates_tokens INTEGER,
    cost_estimate NUMERIC(10, 6) DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Users can view their own AI usage logs" ON public.ai_usage_logs;
CREATE POLICY "Users can view their own AI usage logs" ON public.ai_usage_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all AI usage logs" ON public.ai_usage_logs;
CREATE POLICY "Admins can manage all AI usage logs" ON public.ai_usage_logs
    FOR ALL USING (
        EXISTS(
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
              AND role IN ('admin', 'owner')
        )
    );

-- 2. Criar RPC get_user_ai_limits
CREATE OR REPLACE FUNCTION public.get_user_ai_limits(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_plan TEXT;
  v_status TEXT;
  v_limit INTEGER;
  v_usage INTEGER;
  v_has_bypass BOOLEAN := false;
  v_can_import BOOLEAN := false;
BEGIN
  -- 1. Verificar bypass (admin/owner)
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = p_user_id AND role IN ('admin', 'owner')
  LIMIT 1;

  IF v_role IS NOT NULL THEN
    v_has_bypass := true;
    v_can_import := true;
    v_limit := -1; -- Ilimitado
    
    SELECT COUNT(*)::INTEGER INTO v_usage
    FROM public.user_editais
    WHERE user_id = p_user_id
      AND is_imported = true
      AND source_id IS NULL
      AND created_at >= DATE_TRUNC('month', NOW());
      
    RETURN json_build_object(
      'plan', 'admin',
      'status', 'active',
      'limit', v_limit,
      'usage', v_usage,
      'has_bypass', v_has_bypass,
      'can_import', v_can_import
    );
  END IF;

  -- 2. Obter plano de assinatura
  SELECT plan, status INTO v_plan, v_status
  FROM public.user_subscriptions
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    v_plan := 'free_trial';
    v_status := 'trial';
  END IF;

  -- 3. Definir limites comerciais e contar uso
  IF v_plan IN ('monthly', 'annual') AND v_status = 'active' THEN
    v_limit := 5; -- Limite mensal pago básico
    
    -- Conta apenas importações IA feitas no mês corrente
    SELECT COUNT(*)::INTEGER INTO v_usage
    FROM public.user_editais
    WHERE user_id = p_user_id
      AND is_imported = true
      AND source_id IS NULL
      AND created_at >= DATE_TRUNC('month', NOW());
  ELSE
    -- Qualquer outro estado (trial, expirado, suspenso) tem limite de 1 total na vida da conta
    v_limit := 1; 
    
    -- Conta o total histórico de importações IA
    SELECT COUNT(*)::INTEGER INTO v_usage
    FROM public.user_editais
    WHERE user_id = p_user_id
      AND is_imported = true
      AND source_id IS NULL;
  END IF;

  -- 4. Determinar se pode importar
  IF v_usage < v_limit THEN
    v_can_import := true;
  END IF;

  RETURN json_build_object(
    'plan', v_plan,
    'status', v_status,
    'limit', v_limit,
    'usage', v_usage,
    'has_bypass', v_has_bypass,
    'can_import', v_can_import
  );
END;
$$;

-- 3. Criar RPC check_ai_circuit_breaker
CREATE OR REPLACE FUNCTION public.check_ai_circuit_breaker(p_daily_limit_usd NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_cost NUMERIC;
BEGIN
  -- Somar custo acumulado hoje UTC na tabela de telemetria
  SELECT COALESCE(SUM(cost_estimate), 0) INTO v_total_cost
  FROM public.ai_usage_logs
  WHERE created_at >= DATE_TRUNC('day', NOW());

  -- Retorna true se estiver abaixo do limite configurado
  RETURN v_total_cost < p_daily_limit_usd;
END;
$$;

-- 4. Seed da configuração inicial (embutir disjuntor global em system_settings)
UPDATE public.system_settings
SET value = value || '{"daily_budget_usd": 5.0}'::jsonb
WHERE key = 'ai_edital_config';

-- Caso não exista a chave ai_edital_config, insere por segurança
INSERT INTO public.system_settings (key, value, description)
VALUES (
    'ai_edital_config',
    '{"model": "gemini-2.5-flash", "temperature": 0.1, "max_tokens": 8192, "daily_budget_usd": 5.0}'::jsonb,
    'Configurações padrão da IA do extrator de editais com disjuntor financeiro diário global'
)
ON CONFLICT (key) DO NOTHING;
