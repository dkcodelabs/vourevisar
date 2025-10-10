-- Verificar todas as matérias do usuário
SELECT 
    s.id,
    s.name,
    s.status,
    COUNT(t.id) as total_topics
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
GROUP BY s.id, s.name, s.status
ORDER BY s.name;

-- Verificar ciclo atual
SELECT 
    ciclo_atual,
    array_length(ciclo_atual, 1) as total_no_ciclo
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';