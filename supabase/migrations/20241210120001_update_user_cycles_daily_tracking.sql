-- Migration: Atualizar user_cycles para tracking diário
-- Data: 2024-12-10
-- Objetivo: Adicionar campos para sistema "Estudo do Dia"

-- 1. Adicionar novos campos à tabela user_cycles
ALTER TABLE user_cycles 
ADD COLUMN IF NOT EXISTS materias_por_dia INTEGER DEFAULT 2 CHECK (materias_por_dia >= 1 AND materias_por_dia <= 10),
ADD COLUMN IF NOT EXISTS materias_estudadas_hoje TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS data_ultimo_reset DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS streak_dias_consecutivos INTEGER DEFAULT 0 CHECK (streak_dias_consecutivos >= 0);

-- 2. Comentários para documentação
COMMENT ON COLUMN user_cycles.materias_por_dia IS 'Meta de matérias que o usuário pretende estudar por dia';
COMMENT ON COLUMN user_cycles.materias_estudadas_hoje IS 'Array com IDs das matérias já estudadas no dia atual';
COMMENT ON COLUMN user_cycles.data_ultimo_reset IS 'Data do último reset diário (para controle automático)';
COMMENT ON COLUMN user_cycles.streak_dias_consecutivos IS 'Quantidade de dias consecutivos estudando';

-- 3. Função para reset automático diário
CREATE OR REPLACE FUNCTION reset_daily_progress()
RETURNS void AS $$
BEGIN
  -- Resetar progresso diário para usuários que não foram resetados hoje
  UPDATE user_cycles 
  SET 
    materias_estudadas_hoje = '{}',
    data_ultimo_reset = CURRENT_DATE,
    -- Atualizar streak: se estudou ontem, manter/incrementar; senão, resetar
    streak_dias_consecutivos = CASE 
      WHEN data_ultimo_reset = CURRENT_DATE - INTERVAL '1 day' 
           AND array_length(materias_estudadas_hoje, 1) > 0 
      THEN streak_dias_consecutivos + 1
      WHEN data_ultimo_reset = CURRENT_DATE - INTERVAL '1 day'
           AND (materias_estudadas_hoje IS NULL OR array_length(materias_estudadas_hoje, 1) = 0)
      THEN 0
      ELSE streak_dias_consecutivos -- Manter se já foi resetado hoje
    END,
    atualizado_em = NOW()
  WHERE data_ultimo_reset < CURRENT_DATE;
  
  -- Log da operação
  RAISE NOTICE 'Daily progress reset completed for % users', 
    (SELECT COUNT(*) FROM user_cycles WHERE data_ultimo_reset = CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- 4. Função para atualizar progresso diário
CREATE OR REPLACE FUNCTION update_daily_progress(
  p_user_id UUID,
  p_subject_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_studied TEXT[];
  daily_goal INTEGER;
  is_new_subject BOOLEAN := FALSE;
BEGIN
  -- Buscar dados atuais
  SELECT materias_estudadas_hoje, materias_por_dia
  INTO current_studied, daily_goal
  FROM user_cycles
  WHERE user_id = p_user_id;
  
  -- Se não encontrou o ciclo, retornar false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se a matéria já foi estudada hoje
  IF NOT (p_subject_id = ANY(current_studied)) THEN
    -- Adicionar matéria à lista
    current_studied := array_append(current_studied, p_subject_id);
    is_new_subject := TRUE;
    
    -- Atualizar no banco
    UPDATE user_cycles 
    SET 
      materias_estudadas_hoje = current_studied,
      atualizado_em = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN is_new_subject;
END;
$$ LANGUAGE plpgsql;

-- 5. Função para obter progresso diário
CREATE OR REPLACE FUNCTION get_daily_progress(p_user_id UUID)
RETURNS TABLE(
  studied_count INTEGER,
  daily_goal INTEGER,
  progress_percentage DECIMAL(5,2),
  studied_subjects TEXT[],
  remaining_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(array_length(uc.materias_estudadas_hoje, 1), 0) as studied_count,
    uc.materias_por_dia as daily_goal,
    ROUND(
      (COALESCE(array_length(uc.materias_estudadas_hoje, 1), 0)::DECIMAL / uc.materias_por_dia::DECIMAL) * 100, 
      2
    ) as progress_percentage,
    COALESCE(uc.materias_estudadas_hoje, '{}') as studied_subjects,
    GREATEST(0, uc.materias_por_dia - COALESCE(array_length(uc.materias_estudadas_hoje, 1), 0)) as remaining_count
  FROM user_cycles uc
  WHERE uc.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;