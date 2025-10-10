-- Debug completo das matérias e ciclo
-- Verificar matérias do usuário
SELECT 
  'MATERIAS_USUARIO' as tipo,
  s.id,
  s.name,
  s.status,
  s.priority,
  s.user_id,
  (SELECT COUNT(*) FROM topics t WHERE t.subject_id = s.id) as total_topicos
FROM subjects s 
WHERE s.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
ORDER BY s.priority;

-- Verificar ciclo atual
SELECT 
  'CICLO_ATUAL' as tipo,
  uc.ciclo_atual,
  uc.ciclos_realizados,
  uc.atualizado_em,
  array_length(uc.ciclo_atual, 1) as total_no_ciclo
FROM user_cycles uc 
WHERE uc.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- Verificar se as matérias do ciclo existem
SELECT 
  'MATERIAS_NO_CICLO' as tipo,
  unnest(uc.ciclo_atual) as materia_id,
  s.name as materia_nome,
  s.status,
  CASE WHEN s.id IS NULL THEN 'NAO_EXISTE' ELSE 'EXISTE' END as existe
FROM user_cycles uc 
LEFT JOIN subjects s ON s.id::text = ANY(uc.ciclo_atual) AND s.user_id = uc.user_id
WHERE uc.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- Verificar tópicos das matérias no ciclo
SELECT 
  'TOPICOS_CICLO' as tipo,
  s.name as materia,
  t.name as topico,
  t.review_stage,
  t.completed
FROM user_cycles uc 
JOIN subjects s ON s.id::text = ANY(uc.ciclo_atual) AND s.user_id = uc.user_id
LEFT JOIN topics t ON t.subject_id = s.id
WHERE uc.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
ORDER BY s.name, t.name;