-- Debug: Problema com "Meta diária concluída!" persistindo em novo ciclo
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
    WHEN array_length(materias_estudadas_hoje, 1) >= materias_por_dia THEN 'META_CONCLUIDA'
    ELSE 'META_PENDENTE'
  END as status_meta,
  CASE 
    WHEN data_ultimo_reset = CURRENT_DATE THEN 'RESETADO_HOJE'
    WHEN data_ultimo_reset < CURRENT_DATE THEN 'PRECISA_RESET'
    ELSE 'SEM_RESET'
  END as status_reset,
  -- Calcular idade do ciclo
  EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) as dias_desde_inicio,
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
  topics_count
FROM study_sessions 
WHERE study_date = CURRENT_DATE
ORDER BY completed_at DESC;

-- 3. Identificar possíveis problemas
WITH cycle_analysis AS (
  SELECT 
    user_id,
    data_inicio_ciclo,
    data_ultimo_reset,
    materias_estudadas_hoje,
    array_length(materias_estudadas_hoje, 1) as estudadas_count,
    materias_por_dia,
    EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) as ciclo_idade_dias,
    CASE 
      WHEN data_ultimo_reset IS NULL THEN 'NUNCA_RESETADO'
      WHEN data_ultimo_reset = CURRENT_DATE THEN 'RESETADO_HOJE'
      WHEN data_ultimo_reset < CURRENT_DATE THEN 'RESET_ATRASADO'
      ELSE 'RESET_FUTURO'
    END as status_reset,
    CASE 
      WHEN array_length(materias_estudadas_hoje, 1) IS NULL THEN 'ARRAY_NULL'
      WHEN array_length(materias_estudadas_hoje, 1) = 0 THEN 'ARRAY_VAZIO'
      WHEN array_length(materias_estudadas_hoje, 1) >= materias_por_dia THEN 'META_COMPLETA'
      ELSE 'META_PARCIAL'
    END as status_progresso
  FROM user_cycles
)
SELECT 
  *,
  CASE 
    WHEN ciclo_idade_dias > 3 AND status_progresso IN ('ARRAY_NULL', 'ARRAY_VAZIO') THEN 'CICLO_ANTIGO_SEM_PROGRESSO'
    WHEN status_reset = 'RESET_ATRASADO' AND status_progresso = 'META_COMPLETA' THEN 'PRECISA_RESET_NOVO_DIA'
    WHEN status_reset = 'RESET_ATRASADO' AND status_progresso != 'META_COMPLETA' THEN 'CONTINUAR_PROGRESSO'
    WHEN status_progresso = 'META_COMPLETA' AND status_reset = 'RESETADO_HOJE' THEN 'META_CONCLUIDA_HOJE'
    ELSE 'NORMAL'
  END as acao_recomendada
FROM cycle_analysis
ORDER BY user_id;

-- 4. Verificar se há dados inconsistentes
SELECT 
  'Ciclos com materias_estudadas_hoje NULL' as problema,
  COUNT(*) as quantidade
FROM user_cycles 
WHERE materias_estudadas_hoje IS NULL

UNION ALL

SELECT 
  'Ciclos sem data_ultimo_reset' as problema,
  COUNT(*) as quantidade
FROM user_cycles 
WHERE data_ultimo_reset IS NULL

UNION ALL

SELECT 
  'Ciclos com reset futuro (erro)' as problema,
  COUNT(*) as quantidade
FROM user_cycles 
WHERE data_ultimo_reset > CURRENT_DATE

UNION ALL

SELECT 
  'Ciclos muito antigos (>7 dias)' as problema,
  COUNT(*) as quantidade
FROM user_cycles 
WHERE EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) > 7;