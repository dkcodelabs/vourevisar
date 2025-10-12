-- Fix Seguro: Resetar meta diária para novos ciclos
-- Data: 2024-12-10

-- Primeiro, vamos ver o que temos
SELECT 
  user_id,
  data_inicio_ciclo,
  data_ultimo_reset,
  materias_por_dia,
  materias_estudadas_hoje,
  array_length(materias_estudadas_hoje, 1) as count_estudadas,
  EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) as dias_ciclo
FROM user_cycles;

-- Agora aplicar a correção de forma segura
UPDATE user_cycles 
SET 
  materias_estudadas_hoje = '{}',
  data_ultimo_reset = CURRENT_DATE,
  atualizado_em = NOW()
WHERE 
  -- Condição 1: Nunca foi resetado
  data_ultimo_reset IS NULL
  
  OR
  
  -- Condição 2: Novo dia + meta já cumprida
  (data_ultimo_reset < CURRENT_DATE 
   AND COALESCE(array_length(materias_estudadas_hoje, 1), 0) >= COALESCE(materias_por_dia, 2))
  
  OR
  
  -- Condição 3: Ciclo novo (≤ 1 dia) sem progresso
  (EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) <= 1 
   AND COALESCE(array_length(materias_estudadas_hoje, 1), 0) = 0)
  
  OR
  
  -- Condição 4: Ciclo antigo (> 3 dias) sem progresso
  (EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) > 3 
   AND COALESCE(array_length(materias_estudadas_hoje, 1), 0) = 0);

-- Verificar resultado final
SELECT 
  user_id,
  data_inicio_ciclo,
  data_ultimo_reset,
  COALESCE(materias_por_dia, 2) as meta_diaria,
  COALESCE(array_length(materias_estudadas_hoje, 1), 0) as estudadas_hoje,
  EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) as dias_ciclo,
  CASE 
    WHEN COALESCE(array_length(materias_estudadas_hoje, 1), 0) >= COALESCE(materias_por_dia, 2) THEN '✅ META_CONCLUIDA'
    WHEN COALESCE(array_length(materias_estudadas_hoje, 1), 0) > 0 THEN '⏳ EM_PROGRESSO'
    ELSE '🆕 RESETADO'
  END as status
FROM user_cycles 
ORDER BY atualizado_em DESC;