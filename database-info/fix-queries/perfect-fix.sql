-- ========================================
-- CORREÇÃO PERFEITA BASEADA NOS TIPOS REAIS
-- USUÁRIO: dwefotografia@gmail.com
-- PROBLEMA: materias_estudadas_ciclo está NULL
-- SOLUÇÃO: Preencher com UUIDs convertidos para TEXT
-- ========================================

-- 1. VERIFICAR ESTADO ATUAL
SELECT 
  'ANTES DA CORREÇÃO' as status,
  ciclo_atual,
  materias_estudadas_ciclo,
  array_length(ciclo_atual, 1) as qtd_no_ciclo,
  array_length(materias_estudadas_ciclo, 1) as qtd_estudadas
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com');

-- 2. VER MATÉRIAS COM PROGRESSO
SELECT 
  s.id::text as subject_id_text,
  s.name as materia,
  COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) as topicos_concluidos
FROM subjects s
LEFT JOIN topics t ON t.subject_id = s.id
WHERE s.user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com')
GROUP BY s.id, s.name
HAVING COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) > 0
ORDER BY topicos_concluidos DESC;

-- ========================================
-- CORREÇÃO PRINCIPAL
-- ========================================

-- 3. CORRIGIR O ARRAY materias_estudadas_ciclo
UPDATE user_cycles 
SET materias_estudadas_ciclo = (
  SELECT array_agg(s.id::text ORDER BY s.id)
  FROM subjects s
  LEFT JOIN topics t ON t.subject_id = s.id
  WHERE s.user_id = user_cycles.user_id
    AND s.id::text = ANY(ciclo_atual)  -- Apenas matérias do ciclo atual
  GROUP BY s.id
  HAVING COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) > 0
)
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com');

-- 4. VERIFICAR SE FUNCIONOU
SELECT 
  'APÓS CORREÇÃO' as status,
  ciclo_atual,
  materias_estudadas_ciclo,
  array_length(ciclo_atual, 1) as qtd_no_ciclo,
  array_length(materias_estudadas_ciclo, 1) as qtd_estudadas_agora
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com');

-- 5. VERIFICAR MATÉRIAS CONTABILIZADAS
SELECT 
  s.name as materia,
  COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) as topicos_concluidos,
  CASE 
    WHEN s.id::text = ANY(
      SELECT materias_estudadas_ciclo 
      FROM user_cycles 
      WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com')
    ) 
    THEN '✅ CONTABILIZADA' 
    ELSE '❌ NÃO CONTABILIZADA' 
  END as status_final
FROM subjects s
LEFT JOIN topics t ON t.subject_id = s.id
WHERE s.user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com')
  AND s.id::text = ANY((
    SELECT ciclo_atual 
    FROM user_cycles 
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com')
  ))
GROUP BY s.id, s.name
ORDER BY topicos_concluidos DESC;