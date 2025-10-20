-- Script simples para corrigir MATEMÁTICA

-- 1. Verificar estado atual da MATEMÁTICA
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

-- 2. Buscar ID da MATEMÁTICA
SELECT id FROM subjects WHERE name = 'MATEMATICA' AND user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- 3. Atualizar status para Concluída (substitua o ID abaixo pelo resultado da query anterior)
-- UPDATE subjects SET status = 'Concluída' WHERE id = 'SEU_ID_AQUI' AND user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- 4. Remover do ciclo atual (substitua o ID abaixo pelo resultado da query anterior)
-- UPDATE user_cycles SET ciclo_atual = array_remove(ciclo_atual, 'SEU_ID_AQUI'), atualizado_em = NOW() WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- 5. Verificar ciclo atual
SELECT ciclo_atual FROM user_cycles WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';