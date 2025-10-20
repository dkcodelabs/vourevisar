-- Verificar se MATEMÁTICA ainda está no ciclo atual
SELECT 
    ciclo_atual,
    array_length(ciclo_atual, 1) as total_no_ciclo,
    CASE 
        WHEN 'f4c51111-2a08-4015-8732-f97b1f8d334a' = ANY(ciclo_atual) 
        THEN 'MATEMÁTICA AINDA ESTÁ NO CICLO' 
        ELSE 'MATEMÁTICA NÃO ESTÁ NO CICLO' 
    END as status_matematica
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- FORÇAR remoção da MATEMÁTICA do ciclo atual
UPDATE user_cycles 
SET ciclo_atual = array_remove(ciclo_atual, 'f4c51111-2a08-4015-8732-f97b1f8d334a'),
    materias_estudadas_ciclo = array_remove(materias_estudadas_ciclo, 'f4c51111-2a08-4015-8732-f97b1f8d334a'),
    atualizado_em = NOW()
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- Verificar resultado
SELECT 
    ciclo_atual,
    materias_estudadas_ciclo,
    array_length(ciclo_atual, 1) as total_no_ciclo,
    array_length(materias_estudadas_ciclo, 1) as total_estudadas,
    CASE 
        WHEN 'f4c51111-2a08-4015-8732-f97b1f8d334a' = ANY(ciclo_atual) 
        THEN '❌ MATEMÁTICA AINDA ESTÁ NO CICLO' 
        ELSE '✅ MATEMÁTICA REMOVIDA DO CICLO' 
    END as status_final
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';