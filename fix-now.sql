-- VERIFICAR SE MATEMÁTICA AINDA EXISTE E ESTÁ 100% CONCLUÍDA

-- 1. Ver todas as matérias e seus status
SELECT 
    'Todas as matérias:' as info,
    s.id,
    s.name,
    s.status,
    COUNT(t.id) as total_topics,
    COUNT(CASE WHEN t.review_stage = 'Concluído' THEN 1 END) as completed_topics,
    CASE 
        WHEN COUNT(t.id) > 0 AND COUNT(CASE WHEN t.review_stage = 'Concluído' THEN 1 END) = COUNT(t.id) 
        THEN '100% CONCLUÍDA' 
        ELSE 'EM PROGRESSO' 
    END as progress_status
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.user_id = (SELECT id FROM auth.users LIMIT 1)
GROUP BY s.id, s.name, s.status
ORDER BY s.name;

-- 2. Ver estado atual do ciclo
SELECT 
    'Ciclo atual:' as info,
    array_length(ciclo_atual, 1) as total_no_ciclo,
    ciclo_atual
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

-- 3. CORREÇÃO SIMPLES: Remover matérias específicas do ciclo
-- Primeiro, vamos ver quais matérias estão 100% concluídas

SELECT 
    'Matérias 100% concluídas:' as info,
    s.id,
    s.name,
    COUNT(t.id) as total_topics,
    COUNT(CASE WHEN t.review_stage = 'Concluído' THEN 1 END) as completed_topics
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.user_id = (SELECT id FROM auth.users LIMIT 1)
GROUP BY s.id, s.name
HAVING COUNT(t.id) > 0 
   AND COUNT(CASE WHEN t.review_stage = 'Concluído' THEN 1 END) = COUNT(t.id);

-- Agora vamos remover essas matérias do ciclo manualmente
-- Substitua os IDs abaixo pelos IDs das matérias 100% concluídas da query acima

/*
-- EXEMPLO: Remover PORTUGUÊS e MATEMÁTICA (substitua pelos IDs reais)
UPDATE user_cycles 
SET 
    ciclo_atual = array_remove(array_remove(ciclo_atual, 'ID_PORTUGUES'), 'ID_MATEMATICA'),
    materias_estudadas_ciclo = array_remove(array_remove(materias_estudadas_ciclo, 'ID_PORTUGUES'), 'ID_MATEMATICA'),
    atualizado_em = NOW()
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);
*/

-- 4. Verificar resultado final
SELECT 
    'Resultado final:' as info,
    array_length(ciclo_atual, 1) as total_no_ciclo_ativo,
    array_length(materias_estudadas_ciclo, 1) as estudadas_no_ciclo,
    COALESCE(array_length(ciclo_atual, 1), 0) - COALESCE(array_length(materias_estudadas_ciclo, 1), 0) as restantes,
    ciclo_atual,
    materias_estudadas_ciclo
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

-- 5. Ver matérias por categoria
SELECT 'Matérias por categoria:' as info;

-- Matérias ativas (no ciclo)
SELECT 
    'ATIVAS:' as categoria,
    s.name
FROM subjects s
JOIN user_cycles uc ON s.id = ANY(uc.ciclo_atual)
WHERE s.user_id = (SELECT id FROM auth.users LIMIT 1)
  AND uc.user_id = (SELECT id FROM auth.users LIMIT 1);

-- Matérias 100% concluídas
SELECT 
    '100% CONCLUÍDAS:' as categoria,
    s.name
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.user_id = (SELECT id FROM auth.users LIMIT 1)
GROUP BY s.id, s.name
HAVING COUNT(t.id) > 0 
   AND COUNT(CASE WHEN t.review_stage = 'Concluído' THEN 1 END) = COUNT(t.id);