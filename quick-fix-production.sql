-- ========================================
-- CORREÇÃO RÁPIDA PARA PRODUÇÃO
-- Execute os comandos na ordem
-- ========================================

-- 1. ENCONTRAR SEU USER_ID
SELECT user_id FROM subjects LIMIT 1;

-- 2. VERIFICAR MATÉRIAS COM PROGRESSO (copie o user_id do passo 1)
SELECT 
  s.id,
  s.name,
  CAST(
    (COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END)::float / 
     NULLIF(COUNT(t.id), 0)) * 100 AS INTEGER
  ) as progresso
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.user_id = (SELECT user_id FROM subjects LIMIT 1)
GROUP BY s.id, s.name
HAVING COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) > 0
ORDER BY progresso DESC;

-- 3. CORRIGIR AUTOMATICAMENTE
UPDATE user_cycles 
SET 
  materias_estudadas_ciclo = (
    SELECT array_agg(s.id ORDER BY s.id)
    FROM subjects s
    LEFT JOIN topics t ON s.id = t.subject_id
    WHERE s.user_id = user_cycles.user_id
      AND s.id = ANY(ciclo_atual)
    GROUP BY s.id
    HAVING COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) > 0
  ),
  updated_at = NOW()
WHERE user_id = (SELECT user_id FROM subjects LIMIT 1);

-- 4. VERIFICAR RESULTADO
SELECT 
  array_length(materias_estudadas_ciclo, 1) as materias_estudadas_count,
  materias_estudadas_ciclo
FROM user_cycles 
WHERE user_id = (SELECT user_id FROM subjects LIMIT 1);

-- 5. VERIFICAR ESTATÍSTICAS FINAIS
SELECT 
  s.name as materia,
  CAST(
    (COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END)::float / 
     NULLIF(COUNT(t.id), 0)) * 100 AS INTEGER
  ) as progresso,
  CASE WHEN s.id = ANY(
    SELECT materias_estudadas_ciclo FROM user_cycles WHERE user_id = s.user_id
  ) THEN 'SIM' ELSE 'NÃO' END as contabilizada
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.user_id = (SELECT user_id FROM subjects LIMIT 1)
GROUP BY s.id, s.name, s.user_id
HAVING COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) > 0
ORDER BY progresso DESC;