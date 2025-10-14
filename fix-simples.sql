-- Correção simples e direta do problema
-- Execute este script para corrigir os dados agora

-- 1. Verificar estado atual
SELECT 
  'ANTES' as status,
  array_length(materias_estudadas_hoje, 1) as materias_hoje,
  data_ultimo_reset
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- 2. Sincronizar dados com sessões reais de hoje
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
  'DEPOIS' as status,
  array_length(materias_estudadas_hoje, 1) as materias_hoje,
  materias_por_dia,
  data_ultimo_reset
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- 4. Contar sessões de hoje
SELECT 
  'SESSOES_HOJE' as info,
  COUNT(DISTINCT subject_id) as total_materias
FROM study_sessions 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
  AND study_date = CURRENT_DATE;