-- Debug: Verificar problema com novo ciclo
-- Data: 2024-12-10

-- 1. Verificar dados do ciclo atual
SELECT 
  user_id,
  data_inicio_ciclo,
  data_ultimo_reset,
  materias_por_dia,
  materias_estudadas_hoje,
  array_length(materias_estudadas_hoje, 1) as count_hoje,
  ciclos_realizados,
  EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) as idade_ciclo_dias,
  EXTRACT(HOURS FROM NOW() - data_inicio_ciclo) as idade_ciclo_horas,
  CASE 
    WHEN data_inicio_ciclo::date = CURRENT_DATE THEN 'CICLO_INICIADO_HOJE'
    WHEN data_inicio_ciclo::date = CURRENT_DATE - INTERVAL '1 day' THEN 'CICLO_INICIADO_ONTEM'
    WHEN EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) <= 1 THEN 'CICLO_NOVO'
    ELSE 'CICLO_ANTIGO'
  END as status_ciclo,
  CASE 
    WHEN data_ultimo_reset = CURRENT_DATE THEN 'RESETADO_HOJE'
    WHEN data_ultimo_reset < CURRENT_DATE THEN 'RESET_ATRASADO'
    ELSE 'SEM_RESET'
  END as status_reset
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- 2. Verificar se o problema é que o ciclo foi iniciado mas o progresso não foi resetado
-- Simular a lógica do frontend
SELECT 
  user_id,
  -- Variáveis da lógica
  data_ultimo_reset,
  CURRENT_DATE as hoje,
  (data_ultimo_reset IS NULL OR data_ultimo_reset != CURRENT_DATE) as is_new_day,
  array_length(materias_estudadas_hoje, 1) >= materias_por_dia as had_completed_goal,
  (materias_estudadas_hoje IS NULL OR array_length(materias_estudadas_hoje, 1) = 0) as bank_data_is_empty,
  EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) as cycle_age_days,
  
  -- Condições de novo ciclo
  (EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) <= 1 
   AND (materias_estudadas_hoje IS NULL OR array_length(materias_estudadas_hoje, 1) = 0)) as condicao_1,
  (data_ultimo_reset IS NULL) as condicao_2,
  (EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) > 3 
   AND (materias_estudadas_hoje IS NULL OR array_length(materias_estudadas_hoje, 1) = 0)) as condicao_3,
   
  -- Resultado final
  CASE 
    WHEN (EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) <= 1 
          AND (materias_estudadas_hoje IS NULL OR array_length(materias_estudadas_hoje, 1) = 0))
         OR (data_ultimo_reset IS NULL)
         OR (EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) > 3 
             AND (materias_estudadas_hoje IS NULL OR array_length(materias_estudadas_hoje, 1) = 0))
    THEN 'DEVERIA_RESETAR'
    ELSE 'NAO_DEVERIA_RESETAR'
  END as acao_recomendada
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';