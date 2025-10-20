-- Verificar estado da matéria MATEMÁTICA
SELECT 
    s.id,
    s.name,
    s.status,
    COUNT(t.id) as total_topics,
    COUNT(CASE WHEN t.review_stage = 'Concluído' THEN 1 END) as completed_by_stage,
    COUNT(CASE WHEN t.completed = true THEN 1 END) as completed_by_flag,
    COUNT(CASE WHEN t.review_stage = 'Concluído' OR t.completed = true THEN 1 END) as total_completed,
    CASE 
        WHEN COUNT(t.id) > 0 AND COUNT(CASE WHEN t.review_stage = 'Concluído' OR t.completed = true THEN 1 END) = COUNT(t.id) 
        THEN '100% CONCLUÍDA'
        ELSE 'EM PROGRESSO'
    END as status_calculado
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.name = 'MATEMATICA'
  AND s.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
GROUP BY s.id, s.name, s.status;

-- Verificar tópicos individuais da MATEMÁTICA
SELECT 
    t.id,
    t.name,
    t.review_stage,
    t.completed,
    t.review_count,
    t.next_review
FROM topics t
JOIN subjects s ON t.subject_id = s.id
WHERE s.name = 'MATEMATICA'
  AND s.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
ORDER BY t.name;

-- Verificar se MATEMÁTICA está no ciclo atual
SELECT 
    uc.ciclo_atual,
    uc.materias_estudadas_ciclo,
    uc.ciclos_realizados
FROM user_cycles uc
WHERE uc.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';