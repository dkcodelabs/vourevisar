-- Verificar estado do PORTUGUÊS
SELECT 
    s.id,
    s.name,
    s.status,
    COUNT(t.id) as total_topics,
    COUNT(CASE WHEN t.review_stage = 'Concluído' OR t.completed = true THEN 1 END) as completed_topics,
    CASE 
        WHEN COUNT(t.id) > 0 AND COUNT(CASE WHEN t.review_stage = 'Concluído' OR t.completed = true THEN 1 END) = COUNT(t.id) 
        THEN '100% CONCLUÍDA'
        ELSE 'ATIVA'
    END as status_real
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.name = 'PORTUGUES'
  AND s.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
GROUP BY s.id, s.name, s.status;

-- Verificar tópicos do PORTUGUÊS
SELECT 
    t.id,
    t.name,
    t.review_stage,
    t.completed,
    t.review_count,
    t.next_review
FROM topics t
JOIN subjects s ON t.subject_id = s.id
WHERE s.name = 'PORTUGUES'
  AND s.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
ORDER BY t.name;

-- Verificar ciclo atual
SELECT 
    ciclo_atual,
    materias_estudadas_ciclo,
    array_length(ciclo_atual, 1) as total_no_ciclo
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';