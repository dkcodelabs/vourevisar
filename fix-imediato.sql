-- Correção imediata do problema de reset contínuo
-- Execute este script para corrigir os dados agora

-- 1. Verificar estado atual
SELECT 
  'ANTES DA CORREÇÃO' as status,
  array_length(materias_estudadas_hoje, 1) as materias_hoje,
  data_ultimo_reset,
  data_inicio_ciclo,
  EXTRACT(DAY FROM (NOW() - data_inicio_ciclo)) as dias_desde_inicio
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- 2. Sincronizar materias_estudadas_hoje com sessões reais de hoje
UPDATE user_cycles 
SET 
  materias_estudadas_hoje = (
    SELECT COALESCE(array_agg(DISTINCT subject_id::text), ARRAY[]::text[])
    FROM study_sessions 
    WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
      AND study_date = CURRENT_DATE
  ),
  data_ultimo_reset = CURRENT_DATE,
  atualizado_em = NOW()
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- 3. Verificar resultado
SELECT 
  'APÓS CORREÇÃO' as status,
  array_length(materias_estudadas_hoje, 1) as materias_hoje,
  materias_por_dia,
  data_ultimo_reset,
  ROUND((COALESCE(array_length(materias_estudadas_hoje, 1), 0)::numeric / materias_por_dia::numeric) * 100) as percentual,
  CASE 
    WHEN array_length(materias_estudadas_hoje, 1) >= materias_por_dia THEN 'META ATINGIDA'
    ELSE 'EM PROGRESSO'
  END as status_meta
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- 4. Verificar sessões de hoje para confirmar
SELECT 
  'SESSÕES HOJE' as info,
  COUNT(DISTINCT subject_id) as materias_distintas,
  array_agg(DISTINCT subject_name) as materias_nomes
FROM study_sessions 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
  AND study_date = CURRENT_DATE;