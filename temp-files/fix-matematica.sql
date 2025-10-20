-- Script para corrigir a matéria MATEMÁTICA
-- Primeiro, vamos verificar o estado atual
SELECT 
    s.id,
    s.name,
    s.status,
    COUNT(t.id) as total_topics,
    COUNT(CASE WHEN t.review_stage = 'Concluído' OR t.completed = true THEN 1 END) as completed_topics
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.name = 'MATEMATICA'
  AND s.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
GROUP BY s.id, s.name, s.status;

-- Atualizar status da MATEMÁTICA para "Concluída" se todos os tópicos estão concluídos
UPDATE subjects 
SET status = 'Concluída'
WHERE name = 'MATEMATICA' 
  AND user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
  AND id IN (
    SELECT s.id
    FROM subjects s
    LEFT JOIN topics t ON s.id = t.subject_id
    WHERE s.name = 'MATEMATICA'
      AND s.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
    GROUP BY s.id
    HAVING COUNT(t.id) > 0 
      AND COUNT(CASE WHEN t.review_stage = 'Concluído' OR t.completed = true THEN 1 END) = COUNT(t.id)
  );

-- Remover MATEMÁTICA do ciclo atual se ela está 100% concluída
UPDATE user_cycles 
SET ciclo_atual = array_remove(ciclo_atual, (
    SELECT s.id::text
    FROM subjects s
    LEFT JOIN topics t ON s.id = t.subject_id
    WHERE s.name = 'MATEMATICA'
      AND s.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
    GROUP BY s.id
    HAVING COUNT(t.id) > 0 
      AND COUNT(CASE WHEN t.review_stage = 'Concluído' OR t.completed = true THEN 1 END) = COUNT(t.id)
    LIMIT 1
)),
atualizado_em = NOW()
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- Verificar resultado
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

-- Verificar ciclo atual
SELECT 
    ciclo_atual,
    array_length(ciclo_atual, 1) as total_no_ciclo
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';