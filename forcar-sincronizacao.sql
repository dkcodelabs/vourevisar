-- Forçar sincronização do progresso diário
-- Execute este script se houver sessões não contabilizadas

-- 1. Atualizar progresso para usuários com sessões de hoje
UPDATE user_cycles 
SET 
  materias_estudadas_hoje = subquery.materias_estudadas,
  atualizado_em = NOW()
FROM (
  SELECT 
    user_id,
    array_agg(DISTINCT subject_id) as materias_estudadas
  FROM study_sessions 
  WHERE study_date = CURRENT_DATE
  GROUP BY user_id
) as subquery
WHERE user_cycles.user_id = subquery.user_id;

-- 2. Verificar resultado
SELECT 
  user_id,
  materias_por_dia,
  materias_estudadas_hoje,
  array_length(materias_estudadas_hoje, 1) as count_atualizado,
  CASE 
    WHEN array_length(materias_estudadas_hoje, 1) >= materias_por_dia THEN '✅ META_CONCLUIDA'
    WHEN array_length(materias_estudadas_hoje, 1) > 0 THEN '⏳ EM_PROGRESSO'
    ELSE '🆕 RESETADO'
  END as status_final
FROM user_cycles 
ORDER BY atualizado_em DESC;