-- ========================================
-- CORREÇÃO SIMPLES PARA PRODUÇÃO
-- Execute um comando por vez
-- ========================================

-- 1. ENCONTRAR SEU USER_ID
SELECT user_id FROM subjects LIMIT 1;

-- 2. VERIFICAR MATÉRIAS COM PROGRESSO
SELECT 
  s.id,
  s.name,
  COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) as topicos_concluidos,
  COUNT(t.id) as total_topicos
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.user_id = (SELECT user_id FROM subjects LIMIT 1)
GROUP BY s.id, s.name
HAVING COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) > 0
ORDER BY topicos_concluidos DESC;

-- 3. VER ESTADO ATUAL DO CICLO
SELECT 
  ciclos_realizados,
  array_length(ciclo_atual, 1) as total_materias_ciclo,
  array_length(materias_estudadas_ciclo, 1) as materias_estudadas_atual,
  materias_estudadas_ciclo
FROM user_cycles 
WHERE user_id = (SELECT user_id FROM subjects LIMIT 1);

-- 4. CORRIGIR O PROBLEMA (COMANDO PRINCIPAL)
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

-- 5. VERIFICAR SE FUNCIONOU
SELECT 
  'RESULTADO FINAL' as status,
  array_length(materias_estudadas_ciclo, 1) as materias_estudadas_agora,
  materias_estudadas_ciclo
FROM user_cycles 
WHERE user_id = (SELECT user_id FROM subjects LIMIT 1);

-- 6. LISTAR MATÉRIAS CONTABILIZADAS
SELECT 
  s.name as materia,
  COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) as concluidos,
  COUNT(t.id) as total,
  CASE WHEN s.id = ANY(
    SELECT materias_estudadas_ciclo FROM user_cycles WHERE user_id = s.user_id
  ) THEN 'CONTABILIZADA' ELSE 'NÃO CONTABILIZADA' END as status
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.user_id = (SELECT user_id FROM subjects LIMIT 1)
GROUP BY s.id, s.name, s.user_id
HAVING COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) > 0
ORDER BY concluidos DESC;