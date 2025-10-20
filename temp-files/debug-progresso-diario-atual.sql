-- Debug: Verificar estado atual do progresso diário
-- Data: 2024-12-10

-- 1. Verificar estado atual dos ciclos
SELECT 
  user_id,
  data_inicio_ciclo,
  data_ultimo_reset,
  materias_por_dia,
  materias_estudadas_hoje,
  array_length(materias_estudadas_hoje, 1) as count_estudadas_hoje,
  CASE 
    WHEN array_length(materias_estudadas_hoje, 1) >= materias_por_dia THEN '✅ META_CONCLUIDA'
    WHEN array_length(materias_estudadas_hoje, 1) > 0 THEN '⏳ EM_PROGRESSO'
    ELSE '🆕 RESETADO'
  END as status_meta,
  atualizado_em
FROM user_cycles 
ORDER BY atualizado_em DESC;

-- 2. Verificar sessões de estudo de hoje
SELECT 
  user_id,
  subject_id,
  subject_name,
  study_date,
  completed_at,
  topics_count,
  topics_studied_array
FROM study_sessions 
WHERE study_date = CURRENT_DATE
ORDER BY completed_at DESC;

-- 3. Verificar se há duplicatas ou problemas
SELECT 
  user_id,
  subject_id,
  subject_name,
  COUNT(*) as sessoes_count,
  array_agg(completed_at ORDER BY completed_at) as horarios
FROM study_sessions 
WHERE study_date = CURRENT_DATE
GROUP BY user_id, subject_id, subject_name
HAVING COUNT(*) > 1;

-- 4. Comparar dados entre tabelas
SELECT 
  uc.user_id,
  uc.materias_estudadas_hoje as ciclo_materias,
  array_length(uc.materias_estudadas_hoje, 1) as ciclo_count,
  array_agg(DISTINCT ss.subject_id) as sessoes_materias,
  COUNT(DISTINCT ss.subject_id) as sessoes_count,
  CASE 
    WHEN array_length(uc.materias_estudadas_hoje, 1) = COUNT(DISTINCT ss.subject_id) THEN '✅ SINCRONIZADO'
    ELSE '❌ DESSINCRONIZADO'
  END as status_sync
FROM user_cycles uc
LEFT JOIN study_sessions ss ON uc.user_id = ss.user_id AND ss.study_date = CURRENT_DATE
GROUP BY uc.user_id, uc.materias_estudadas_hoje;