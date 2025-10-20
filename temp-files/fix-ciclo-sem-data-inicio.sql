-- Correção: Usuário com data_inicio_ciclo NULL
-- Este usuário tem progresso mas não tem data de início do ciclo

-- Verificar o problema específico
SELECT 
  user_id,
  data_inicio_ciclo,
  data_ultimo_reset,
  materias_estudadas_hoje,
  array_length(materias_estudadas_hoje, 1) as count_estudadas,
  created_at,
  atualizado_em
FROM user_cycles 
WHERE data_inicio_ciclo IS NULL;

-- Opção 1: Definir data de início como hoje (novo ciclo)
UPDATE user_cycles 
SET 
  data_inicio_ciclo = CURRENT_DATE,
  materias_estudadas_hoje = '{}', -- Resetar progresso
  data_ultimo_reset = CURRENT_DATE,
  atualizado_em = NOW()
WHERE data_inicio_ciclo IS NULL;

-- Verificar resultado
SELECT 
  user_id,
  data_inicio_ciclo,
  data_ultimo_reset,
  COALESCE(array_length(materias_estudadas_hoje, 1), 0) as estudadas_hoje,
  CASE 
    WHEN COALESCE(array_length(materias_estudadas_hoje, 1), 0) = 0 THEN '🆕 RESETADO'
    ELSE '⚠️ AINDA COM PROGRESSO'
  END as status
FROM user_cycles 
WHERE data_inicio_ciclo = CURRENT_DATE;