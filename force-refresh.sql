-- FORÇAR REFRESH COMPLETO DOS DADOS

-- 1. Estado atual real no banco
SELECT 
    'BANCO - Estado Real:' as info,
    COALESCE(array_length(ciclo_atual, 1), 0) as total_ciclo,
    COALESCE(array_length(materias_estudadas_ciclo, 1), 0) as estudadas,
    ciclo_atual,
    materias_estudadas_ciclo
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com');

-- 2. Matérias reais no banco
SELECT 
    'BANCO - Suas Matérias:' as info,
    s.name,
    COUNT(t.id) as total_topics,
    COUNT(CASE WHEN t.review_stage = 'Concluído' THEN 1 END) as completed_topics,
    COUNT(CASE WHEN t.completed = true THEN 1 END) as completed_flag
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com')
GROUP BY s.id, s.name
ORDER BY s.name;

-- 3. FORÇAR atualização timestamp para invalidar cache
UPDATE user_cycles 
SET atualizado_em = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com');

-- 4. Verificar após atualização
SELECT 
    'APÓS FORCE UPDATE:' as info,
    COALESCE(array_length(ciclo_atual, 1), 0) as total_ciclo,
    COALESCE(array_length(materias_estudadas_ciclo, 1), 0) as estudadas,
    atualizado_em
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com');