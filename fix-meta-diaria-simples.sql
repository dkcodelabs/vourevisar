-- Fix Simples: Resetar meta diária para novos ciclos
-- Data: 2024-12-10

-- CORREÇÃO IMEDIATA: Resetar progresso diário para ciclos que precisam
UPDATE user_cycles 
SET 
  materias_estudadas_hoje = '{}',
  data_ultimo_reset = CURRENT_DATE,
  atualizado_em = NOW()
WHERE 
  -- Resetar se:
  -- 1. Nunca foi resetado
  data_ultimo_reset IS NULL
  
  OR
  
  -- 2. Novo dia + meta já cumprida (reset normal)
  (data_ultimo_reset < CURRENT_DATE 
   AND array_length(materias_estudadas_hoje, 1) >= materias_por_dia)
  
  OR
  
  -- 3. Ciclo iniciado recentemente (hoje ou ontem) mas sem progresso
  (EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) <= 1 
   AND (materias_estudadas_hoje IS NULL OR array_length(materias_estudadas_hoje, 1) = 0))
  
  OR
  
  -- 4. Ciclo muito antigo sem progresso (possível novo ciclo não detectado)
  (EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) > 3 
   AND (materias_estudadas_hoje IS NULL OR array_length(materias_estudadas_hoje, 1) = 0));

-- Verificar resultado
SELECT 
  user_id,
  data_inicio_ciclo,
  data_ultimo_reset,
  materias_por_dia,
  array_length(materias_estudadas_hoje, 1) as estudadas_hoje,
  EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) as ciclo_idade_dias,
  CASE 
    WHEN array_length(materias_estudadas_hoje, 1) >= materias_por_dia THEN '✅ META_CONCLUIDA'
    WHEN array_length(materias_estudadas_hoje, 1) > 0 THEN '⏳ EM_PROGRESSO'
    ELSE '🆕 RESETADO'
  END as status
FROM user_cycles 
ORDER BY atualizado_em DESC;