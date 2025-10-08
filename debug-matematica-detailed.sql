-- Debug detalhado da MATEMÁTICA
SELECT 
    s.id as subject_id,
    s.name as subject_name,
    s.status as subject_status,
    t.id as topic_id,
    t.name as topic_name,
    t.review_stage,
    t.completed,
    t.review_count,
    t.next_review,
    CASE 
        WHEN t.review_stage = 'Concluído' OR t.completed = true THEN 'CONCLUÍDO'
        ELSE 'EM PROGRESSO'
    END as topic_status
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.name = 'MATEMATICA'
  AND s.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
ORDER BY t.name;

-- Verificar se a MATEMÁTICA deveria estar 100% concluída
SELECT 
    s.id,
    s.name,
    s.status,
    COUNT(t.id) as total_topics,
    COUNT(CASE WHEN t.review_stage = 'Concluído' OR t.completed = true THEN 1 END) as completed_topics,
    CASE 
        WHEN COUNT(t.id) > 0 AND COUNT(CASE WHEN t.review_stage = 'Concluído' OR t.completed = true THEN 1 END) = COUNT(t.id) 
        THEN 'DEVERIA ESTAR 100% CONCLUÍDA'
        ELSE 'AINDA EM PROGRESSO'
    END as status_esperado
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.name = 'MATEMATICA'
  AND s.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
GROUP BY s.id, s.name, s.status;