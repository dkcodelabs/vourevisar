-- Fix: Forçar reset do progresso diário para novo ciclo
-- Data: 2024-12-10

-- 1. Verificar se há ciclos que foram iniciados recentemente mas ainda têm progresso antigo
SELECT 
  user_id,
  data_inicio_ciclo,
  materias_estudadas_hoje,
  array_length(materias_estudadas_hoje, 1) as count_atual,
  EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) as idade_dias,
  CASE 
    WHEN EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) <= 1 
         AND array_length(materias_estudadas_hoje, 1) > 0 
    THEN 'PRECISA_RESET_NOVO_CICLO'
    ELSE 'OK'
  END as status
FROM user_cycles
WHERE EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) <= 1 
  AND array_length(materias_estudadas_hoje, 1) > 0;

-- 2. Resetar progresso diário para ciclos iniciados hoje ou ontem que ainda têm dados antigos
UPDATE user_cycles 
SET 
  materias_estudadas_hoje = '{}',
  data_ultimo_reset = CURRENT_DATE,
  atualizado_em = NOW()
WHERE 
  -- Ciclo iniciado recentemente (hoje ou ontem)
  EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) <= 1
  -- Mas ainda tem progresso diário (dados antigos)
  AND array_length(materias_estudadas_hoje, 1) > 0;

-- 3. Verificar resultado
SELECT 
  user_id,
  data_inicio_ciclo,
  data_ultimo_reset,
  materias_estudadas_hoje,
  array_length(materias_estudadas_hoje, 1) as count_final,
  EXTRACT(DAYS FROM NOW() - data_inicio_ciclo) as idade_dias,
  CASE 
    WHEN array_length(materias_estudadas_hoje, 1) = 0 THEN '✅ RESETADO'
    ELSE '❌ AINDA_COM_DADOS'
  END as status_final
FROM user_cycles
ORDER BY data_inicio_ciclo DESC;