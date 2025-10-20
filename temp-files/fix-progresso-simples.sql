-- Fix Simples: Sincronizar progresso diário
-- Data: 2024-12-10

-- 1. Ver estado atual
SELECT 
  user_id,
  materias_estudadas_hoje,
  array_length(materias_estudadas_hoje, 1) as count_atual
FROM user_cycles;

-- 2. Ver sessões de hoje
SELECT 
  user_id,
  subject_id,
  subject_name,
  completed_at
FROM study_sessions 
WHERE study_date = CURRENT_DATE
ORDER BY user_id, completed_at;

-- 3. Para cada usuário, atualizar manualmente (substitua USER_ID_AQUI pelo ID real)
-- Exemplo de como atualizar:
/*
UPDATE user_cycles 
SET materias_estudadas_hoje = ARRAY['subject_id_1', 'subject_id_2']
WHERE user_id = 'USER_ID_AQUI';
*/

-- 4. Verificar resultado
SELECT 
  user_id,
  materias_por_dia,
  materias_estudadas_hoje,
  array_length(materias_estudadas_hoje, 1) as count_final,
  CASE 
    WHEN array_length(materias_estudadas_hoje, 1) >= materias_por_dia THEN 'META_CONCLUIDA'
    WHEN array_length(materias_estudadas_hoje, 1) > 0 THEN 'EM_PROGRESSO'
    ELSE 'RESETADO'
  END as status
FROM user_cycles;