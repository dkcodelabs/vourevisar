-- Ver detalhes do tópico da MATEMÁTICA
SELECT 
    s.id as subject_id,
    s.name as subject_name,
    s.status as subject_status,
    t.id as topic_id,
    t.name as topic_name,
    t.review_stage,
    t.completed,
    t.review_count,
    t.next_review
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.name = 'MATEMATICA'
  AND s.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- Corrigir o tópico da MATEMÁTICA para estar concluído
-- (Execute apenas se o tópico deveria estar concluído)
UPDATE topics 
SET 
    review_stage = 'Concluído',
    completed = true,
    review_count = 4,
    next_review = NULL,
    last_reviewed_at = NOW()
WHERE subject_id = 'f4c51111-2a08-4015-8732-f97b1f8d334a'
  AND name = 'mat';

-- Atualizar status da matéria para Concluída
UPDATE subjects 
SET status = 'Concluída'
WHERE id = 'f4c51111-2a08-4015-8732-f97b1f8d334a'
  AND user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- Remover MATEMÁTICA do ciclo atual
UPDATE user_cycles 
SET ciclo_atual = array_remove(ciclo_atual, 'f4c51111-2a08-4015-8732-f97b1f8d334a'),
    atualizado_em = NOW()
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- Verificar resultado final
SELECT 
    s.id,
    s.name,
    s.status,
    COUNT(t.id) as total_topics,
    COUNT(CASE WHEN t.review_stage = 'Concluído' OR t.completed = true THEN 1 END) as completed_topics,
    CASE 
        WHEN COUNT(t.id) > 0 AND COUNT(CASE WHEN t.review_stage = 'Concluído' OR t.completed = true THEN 1 END) = COUNT(t.id) 
        THEN '✅ 100% CONCLUÍDA'
        ELSE '⏳ EM PROGRESSO'
    END as status_final
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.name = 'MATEMATICA'
  AND s.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
GROUP BY s.id, s.name, s.status;