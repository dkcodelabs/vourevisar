-- Fix: Sincronizar progresso diário com sessões reais
-- Data: 2024-12-10

-- 1. Primeiro, vamos ver o estado atual
SELECT 
  'ANTES DA SINCRONIZAÇÃO' as etapa,
  uc.user_id,
  uc.materias_estudadas_hoje as materias_no_ciclo,
  array_length(uc.materias_estudadas_hoje, 1) as count_ciclo,
  array_agg(DISTINCT ss.subject_id) as materias_nas_sessoes,
  COUNT(DISTINCT ss.subject_id) as count_sessoes
FROM user_cycles uc
LEFT JOIN study_sessions ss ON uc.user_id = ss.user_id AND ss.study_date = CURRENT_DATE
GROUP BY uc.user_id, uc.materias_estudadas_hoje;

-- 2. Sincronizar dados baseado nas sessões reais de hoje
UPDATE user_cycles 
SET 
  materias_estudadas_hoje = (
    SELECT COALESCE(array_agg(DISTINCT subject_id), '{}')
    FROM study_sessions 
    WHERE user_id = user_cycles.user_id 
      AND study_date = CURRENT_DATE
  ),
  atualizado_em = NOW()
WHERE user_id IN (
  SELECT DISTINCT user_id 
  FROM study_sessions 
  WHERE study_date = CURRENT_DATE
);

-- 3. Verificar resultado final
SELECT 
  'DEPOIS DA SINCRONIZAÇÃO' as etapa,
  uc.user_id,
  uc.materias_por_dia,
  uc.materias_estudadas_hoje,
  array_length(uc.materias_estudadas_hoje, 1) as count_atual,
  CASE 
    WHEN array_length(uc.materias_estudadas_hoje, 1) >= uc.materias_por_dia THEN '✅ META_CONCLUIDA'
    WHEN array_length(uc.materias_estudadas_hoje, 1) > 0 THEN '⏳ EM_PROGRESSO'
    ELSE '🆕 RESETADO'
  END as status_final,
  uc.atualizado_em
FROM user_cycles uc
ORDER BY uc.atualizado_em DESC;

-- 4. Verificar sessões de hoje para confirmação
SELECT 
  'SESSÕES DE HOJE' as etapa,
  user_id,
  subject_id,
  subject_name,
  completed_at,
  topics_count
FROM study_sessions 
WHERE study_date = CURRENT_DATE
ORDER BY user_id, completed_at;