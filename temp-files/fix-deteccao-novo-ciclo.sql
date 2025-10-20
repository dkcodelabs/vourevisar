-- Correção definitiva da detecção de novo ciclo
-- Este script corrige os dados para evitar o reset contínuo

-- 1. Atualizar data_ultimo_reset para hoje se há sessões hoje
UPDATE user_cycles 
SET 
  data_ultimo_reset = CURRENT_DATE,
  materias_estudadas_hoje = (
    SELECT COALESCE(array_agg(DISTINCT subject_id::text), ARRAY[]::text[])
    FROM study_sessions 
    WHERE user_id = user_cycles.user_id 
      AND study_date = CURRENT_DATE
  ),
  atualizado_em = NOW()
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
  AND EXISTS (
    SELECT 1 FROM study_sessions 
    WHERE user_id = user_cycles.user_id 
      AND study_date = CURRENT_DATE
  );

-- 2. Verificar resultado
SELECT 
  'APÓS CORREÇÃO' as status,
  data_inicio_ciclo,
  data_ultimo_reset,
  array_length(materias_estudadas_hoje, 1) as materias_hoje,
  materias_por_dia,
  CASE 
    WHEN data_ultimo_reset = CURRENT_DATE THEN 'RESETADO HOJE'
    WHEN data_ultimo_reset IS NULL THEN 'NUNCA RESETADO'
    ELSE 'RESETADO EM ' || data_ultimo_reset::text
  END as status_reset,
  CASE 
    WHEN array_length(materias_estudadas_hoje, 1) >= materias_por_dia THEN 'META ATINGIDA'
    ELSE 'EM PROGRESSO'
  END as status_meta
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';