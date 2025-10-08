-- CORREÇÃO: Todas as matérias foram 100% concluídas
-- Limpar completamente o ciclo atual

-- 1. Verificar estado atual
SELECT 
    'Estado atual:' as info,
    array_length(ciclo_atual, 1) as total_no_ciclo,
    array_length(materias_estudadas_ciclo, 1) as estudadas,
    ciclo_atual,
    materias_estudadas_ciclo
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

-- 2. Encontrar SEU usuário específico
SELECT 
    'SEU User ID:' as info,
    id as user_id,
    email
FROM auth.users 
WHERE email = 'dwefotografia@gmail.com';

-- 3. Ver SUAS matérias
SELECT 
    s.id,
    s.name,
    s.user_id,
    COUNT(t.id) as total_topics,
    COUNT(CASE WHEN t.review_stage = 'Concluído' THEN 1 END) as completed_topics,
    CASE 
        WHEN COUNT(t.id) > 0 AND COUNT(CASE WHEN t.review_stage = 'Concluído' THEN 1 END) = COUNT(t.id) 
        THEN '100% CONCLUÍDA'
        ELSE 'EM PROGRESSO'
    END as status
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com')
GROUP BY s.id, s.name, s.user_id
ORDER BY s.name;

-- 4. CORREÇÃO: Resetar SEU ciclo
UPDATE user_cycles 
SET 
    ciclo_atual = (
        SELECT array_agg(s.id ORDER BY s.name)
        FROM subjects s
        WHERE s.user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com')
    ),
    materias_estudadas_ciclo = '{}',
    atualizado_em = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com');

-- 4. Verificar resultado final
SELECT 
    'Após limpeza completa:' as info,
    COALESCE(array_length(ciclo_atual, 1), 0) as total_no_ciclo,
    COALESCE(array_length(materias_estudadas_ciclo, 1), 0) as estudadas,
    ciclo_atual,
    materias_estudadas_ciclo
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

-- 5. Verificar resultado após correção
SELECT 
    'Após correção:' as info,
    COALESCE(array_length(ciclo_atual, 1), 0) as total_no_ciclo,
    COALESCE(array_length(materias_estudadas_ciclo, 1), 0) as estudadas,
    ciclo_atual,
    materias_estudadas_ciclo
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dwefotografia@gmail.com');