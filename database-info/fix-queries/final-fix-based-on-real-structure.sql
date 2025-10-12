-- ========================================
-- CORREÇÃO BASEADA NA ESTRUTURA REAL DO BANCO
-- USUÁRIO: dwefotografia@gmail.com
-- ========================================

-- 1. VERIFICAR ESTADO ATUAL DO SEU CICLO
SELECT 
  'ESTADO ATUAL' as status,
  ciclo_atual,
  materias_estudadas_ciclo,
  ciclos_realizados,
  array_length(ciclo_atual, 1) as qtd_no_ciclo,
  array_length(materias_estudadas_ciclo, 1) as qtd_estudadas
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com');

-- 2. VER SUAS MATÉRIAS E STATUS
SELECT 
  id::text as subject_id,
  name as materia,
  status,
  completed_at
FROM subjects 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com')
ORDER BY name;

-- 3. IDENTIFICAR MATÉRIAS COM PROGRESSO (baseado no status)
SELECT 
  id::text as subject_id,
  name as materia,
  status,
  CASE 
    WHEN completed_at IS NOT NULL THEN 'CONCLUÍDA'
    WHEN status != 'pending' THEN 'EM_PROGRESSO' 
    ELSE 'SEM_PROGRESSO'
  END as tipo_progresso
FROM subjects 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com')
  AND (completed_at IS NOT NULL OR status != 'pending')
ORDER BY completed_at DESC, name;

-- ========================================
-- CORREÇÃO PRINCIPAL
-- ========================================

-- 4. ATUALIZAR materias_estudadas_ciclo COM MATÉRIAS QUE TÊM PROGRESSO
UPDATE user_cycles 
SET 
  materias_estudadas_ciclo = (
    SELECT array_agg(s.id::text ORDER BY s.name)
    FROM subjects s
    WHERE s.user_id = user_cycles.user_id
      AND s.id::text = ANY(ciclo_atual)  -- Apenas matérias do ciclo atual
      AND (s.completed_at IS NOT NULL OR s.status != 'pending')  -- Com progresso
  ),
  atualizado_em = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com');

-- 5. VERIFICAR RESULTADO
SELECT 
  'APÓS CORREÇÃO' as status,
  ciclo_atual,
  materias_estudadas_ciclo,
  array_length(ciclo_atual, 1) as qtd_no_ciclo,
  array_length(materias_estudadas_ciclo, 1) as qtd_estudadas_agora,
  atualizado_em
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com');

-- 6. VERIFICAR QUAIS MATÉRIAS ESTÃO CONTABILIZADAS
SELECT 
  s.name as materia,
  s.status,
  s.completed_at,
  CASE 
    WHEN s.id::text = ANY(
      SELECT materias_estudadas_ciclo 
      FROM user_cycles 
      WHERE user_id = s.user_id
    ) 
    THEN '✅ CONTABILIZADA' 
    ELSE '❌ NÃO CONTABILIZADA' 
  END as status_final
FROM subjects s
WHERE s.user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com')
  AND s.id::text = ANY((
    SELECT ciclo_atual 
    FROM user_cycles 
    WHERE user_id = s.user_id
  ))
ORDER BY s.name;