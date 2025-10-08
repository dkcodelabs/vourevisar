-- Verificar estado atual de todas as matérias
SELECT 
    s.name,
    s.status,
    COUNT(t.id) as total_topics,
    COUNT(CASE WHEN t.review_stage = 'Concluído' OR t.completed = true THEN 1 END) as completed_topics,
    COUNT(CASE WHEN t.review_stage != 'Concluído' AND t.completed != true THEN 1 END) as pending_topics,
    CASE 
        WHEN COUNT(t.id) > 0 AND COUNT(CASE WHEN t.review_stage = 'Concluído' OR t.completed = true THEN 1 END) = COUNT(t.id) 
        THEN '✅ 100% CONCLUÍDA'
        ELSE '⏳ AINDA ATIVA'
    END as status_real
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
GROUP BY s.id, s.name, s.status
ORDER BY s.name;

-- Verificar resumo geral
SELECT 
    COUNT(DISTINCT s.id) as total_subjects,
    COUNT(DISTINCT CASE WHEN s.status = 'Concluída' THEN s.id END) as subjects_marked_completed
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';