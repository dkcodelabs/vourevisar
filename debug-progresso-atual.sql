-- Debug do estado atual do progresso diário
-- Execute este script para verificar o estado dos dados

-- 1. Verificar dados do ciclo atual
SELECT 
  'CICLO ATUAL' as tipo,
  id,
  ciclo_atual,
  materias_estudadas_ciclo,
  ciclos_realizados,
  data_inicio_ciclo,
  data_ultimo_reset,
  materias_estudadas_hoje,
  materias_por_dia,
  created_at,
  updated_at
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- 2. Verificar sessões de estudo de hoje
SELECT 
  'SESSOES HOJE' as tipo,
  id,
  subject_id,
  subject_name,
  study_date,
  cycle_position,
  topics_studied,
  completed_at,
  created_at
FROM study_sessions 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
  AND study_date = CURRENT_DATE
ORDER BY completed_at DESC;

-- 3. Verificar matérias ativas
SELECT 
  'MATERIAS ATIVAS' as tipo,
  id,
  name,
  is_active,
  created_at
FROM subjects 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
  AND is_active = true
ORDER BY name;

-- 4. Calcular progresso esperado
WITH progresso_atual AS (
  SELECT 
    COUNT(DISTINCT subject_id) as materias_estudadas_hoje,
    2 as meta_diaria,
    ROUND((COUNT(DISTINCT subject_id)::numeric / 2) * 100) as percentual
  FROM study_sessions 
  WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
    AND study_date = CURRENT_DATE
)
SELECT 
  'PROGRESSO CALCULADO' as tipo,
  materias_estudadas_hoje,
  meta_diaria,
  percentual || '%' as progresso,
  CASE 
    WHEN materias_estudadas_hoje >= meta_diaria THEN 'META ATINGIDA'
    ELSE 'EM PROGRESSO'
  END as status
FROM progresso_atual;