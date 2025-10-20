-- Fix: Corrigir problema "Meta diária concluída!" em novo ciclo
-- Data: 2024-12-10
-- Problema: Mesmo com novo ciclo, a página mostra meta concluída

-- DIAGNÓSTICO: O problema está na lógica de detecção de novo ciclo
-- A condição atual verifica se o ciclo é "antigo" (>3 dias) E se os dados estão vazios
-- Mas isso não funciona se o usuário estudou recentemente mas iniciou um novo ciclo

-- SOLUÇÃO: Melhorar a detecção de novo ciclo

-- 1. CORREÇÃO IMEDIATA: Resetar todos os ciclos que precisam
UPDATE user_cycles 
SET 
  materias_estudadas_hoje = '{}',
  data_ultimo_reset = CURRENT_DATE,
  atualizado_em = NOW()
WHERE 
  -- Condição 1: Novo dia + meta já foi cumprida ontem
  (data_ultimo_reset < CURRENT_DATE 
   AND array_length(materias_estudadas_hoje, 1) >= materias_por_dia)
  
  OR
  
  -- Condição 2: Ciclo muito antigo (provavelmente novo ciclo)
  (EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) > 1 
   AND (materias_estudadas_hoje IS NULL OR array_length(materias_estudadas_hoje, 1) = 0))
  
  OR
  
  -- Condição 3: Nunca foi resetado
  (data_ultimo_reset IS NULL);

-- 2. FUNÇÃO MELHORADA: Detectar novo ciclo de forma mais inteligente
CREATE OR REPLACE FUNCTION should_reset_daily_progress(
  p_user_id UUID,
  OUT should_reset BOOLEAN,
  OUT reset_reason TEXT
) AS $
DECLARE
  cycle_data RECORD;
  today DATE := CURRENT_DATE;
  cycle_age_days INTEGER;
  has_studied_today BOOLEAN;
  completed_goal_yesterday BOOLEAN;
BEGIN
  -- Buscar dados do ciclo
  SELECT 
    data_inicio_ciclo,
    data_ultimo_reset,
    materias_estudadas_hoje,
    materias_por_dia
  INTO cycle_data
  FROM user_cycles 
  WHERE user_id = p_user_id;
  
  -- Se não encontrou ciclo, não resetar
  IF NOT FOUND THEN
    should_reset := FALSE;
    reset_reason := 'NO_CYCLE';
    RETURN;
  END IF;
  
  -- Calcular variáveis
  cycle_age_days := EXTRACT(DAYS FROM NOW() - cycle_data.data_inicio_ciclo);
  has_studied_today := (cycle_data.materias_estudadas_hoje IS NOT NULL 
                       AND array_length(cycle_data.materias_estudadas_hoje, 1) > 0);
  completed_goal_yesterday := (cycle_data.materias_estudadas_hoje IS NOT NULL 
                              AND array_length(cycle_data.materias_estudadas_hoje, 1) >= cycle_data.materias_por_dia);
  
  -- REGRA 1: Nunca foi resetado
  IF cycle_data.data_ultimo_reset IS NULL THEN
    should_reset := TRUE;
    reset_reason := 'NEVER_RESET';
    RETURN;
  END IF;
  
  -- REGRA 2: Novo ciclo (ciclo iniciado hoje ou ontem, mas sem progresso)
  IF cycle_age_days <= 1 AND NOT has_studied_today THEN
    should_reset := TRUE;
    reset_reason := 'NEW_CYCLE';
    RETURN;
  END IF;
  
  -- REGRA 3: Novo dia + meta cumprida ontem
  IF cycle_data.data_ultimo_reset < today AND completed_goal_yesterday THEN
    should_reset := TRUE;
    reset_reason := 'NEW_DAY_GOAL_COMPLETED';
    RETURN;
  END IF;
  
  -- REGRA 4: Ciclo muito antigo sem progresso (possível novo ciclo não detectado)
  IF cycle_age_days > 3 AND NOT has_studied_today THEN
    should_reset := TRUE;
    reset_reason := 'OLD_CYCLE_NO_PROGRESS';
    RETURN;
  END IF;
  
  -- REGRA 5: Data de reset está atrasada mas meta não foi cumprida (continuar)
  IF cycle_data.data_ultimo_reset < today AND NOT completed_goal_yesterday THEN
    should_reset := FALSE;
    reset_reason := 'CONTINUE_PROGRESS';
    RETURN;
  END IF;
  
  -- Caso padrão: não resetar
  should_reset := FALSE;
  reset_reason := 'NO_RESET_NEEDED';
END;
$ LANGUAGE plpgsql;

-- 3. FUNÇÃO PARA APLICAR RESET INTELIGENTE
CREATE OR REPLACE FUNCTION apply_intelligent_daily_reset(p_user_id UUID)
RETURNS TABLE(
  action_taken TEXT,
  reason TEXT,
  old_studied_count INTEGER,
  new_studied_count INTEGER
) AS $
DECLARE
  reset_info RECORD;
  old_count INTEGER;
BEGIN
  -- Verificar se deve resetar
  SELECT should_reset, reset_reason 
  INTO reset_info
  FROM should_reset_daily_progress(p_user_id);
  
  -- Obter contagem atual
  SELECT COALESCE(array_length(materias_estudadas_hoje, 1), 0)
  INTO old_count
  FROM user_cycles 
  WHERE user_id = p_user_id;
  
  IF reset_info.should_reset THEN
    -- Aplicar reset
    UPDATE user_cycles 
    SET 
      materias_estudadas_hoje = '{}',
      data_ultimo_reset = CURRENT_DATE,
      atualizado_em = NOW()
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT 
      'RESET_APPLIED'::TEXT,
      reset_info.reset_reason,
      old_count,
      0;
  ELSE
    -- Apenas atualizar data se necessário
    UPDATE user_cycles 
    SET 
      data_ultimo_reset = CURRENT_DATE,
      atualizado_em = NOW()
    WHERE user_id = p_user_id 
      AND data_ultimo_reset < CURRENT_DATE;
    
    RETURN QUERY SELECT 
      'NO_RESET'::TEXT,
      reset_info.reset_reason,
      old_count,
      old_count;
  END IF;
END;
$ LANGUAGE plpgsql;

-- 4. APLICAR CORREÇÃO PARA TODOS OS USUÁRIOS
SELECT 
  user_id,
  action_taken,
  reason,
  old_studied_count,
  new_studied_count
FROM user_cycles uc
CROSS JOIN LATERAL apply_intelligent_daily_reset(uc.user_id)
ORDER BY user_id;