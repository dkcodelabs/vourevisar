-- Verificar sessões de estudo de hoje
SELECT 
  user_id,
  subject_id,
  subject_name,
  completed_at,
  topics_count,
  'SESSAO_REGISTRADA' as tipo
FROM study_sessions 
WHERE study_date = CURRENT_DATE
ORDER BY user_id, completed_at;

-- Comparar com o que está no user_cycles
SELECT 
  uc.user_id,
  uc.materias_estudadas_hoje,
  array_length(uc.materias_estudadas_hoje, 1) as count_ciclo,
  COUNT(DISTINCT ss.subject_id) as count_sessoes_reais,
  array_agg(DISTINCT ss.subject_id) as materias_nas_sessoes,
  CASE 
    WHEN array_length(uc.materias_estudadas_hoje, 1) = COUNT(DISTINCT ss.subject_id) THEN 'SINCRONIZADO'
    WHEN COUNT(DISTINCT ss.subject_id) > COALESCE(array_length(uc.materias_estudadas_hoje, 1), 0) THEN 'SESSOES_NAO_CONTABILIZADAS'
    WHEN COALESCE(array_length(uc.materias_estudadas_hoje, 1), 0) > COUNT(DISTINCT ss.subject_id) THEN 'CICLO_COM_DADOS_EXTRAS'
    ELSE 'SEM_SESSOES'
  END as status_sync
FROM user_cycles uc
LEFT JOIN study_sessions ss ON uc.user_id = ss.user_id AND ss.study_date = CURRENT_DATE
GROUP BY uc.user_id, uc.materias_estudadas_hoje;