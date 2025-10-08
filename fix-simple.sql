-- CORREÇÃO SIMPLES E DIRETA

-- 1. Ver estado atual
SELECT 
    'Estado atual:' as info,
    array_length(ciclo_atual, 1) as total_ciclo,
    array_length(materias_estudadas_ciclo, 1) as estudadas,
    ciclo_atual,
    materias_estudadas_ciclo
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

-- 2. Ver todas as matérias com progresso
SELECT 
    s.id,
    s.name,
    COUNT(t.id) as total_topics,
    COUNT(CASE WHEN t.review_stage = 'Concluído' THEN 1 END) as completed_topics,
    CASE 
        WHEN COUNT(t.id) > 0 AND COUNT(CASE WHEN t.review_stage = 'Concluído' THEN 1 END) = COUNT(t.id) 
        THEN '100% CONCLUÍDA - REMOVER DO CICLO'
        ELSE 'ATIVA - MANTER NO CICLO'
    END as acao
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.user_id = (SELECT id FROM auth.users LIMIT 1)
GROUP BY s.id, s.name
ORDER BY s.name;

-- 3. CORREÇÃO MANUAL
-- Copie os IDs das matérias "100% CONCLUÍDA" da query acima
-- E execute o UPDATE abaixo substituindo pelos IDs corretos

-- Exemplo (substitua pelos IDs reais):
/*
UPDATE user_cycles 
SET 
    ciclo_atual = ARRAY(
        SELECT unnest(ciclo_atual) 
        EXCEPT 
        SELECT unnest(ARRAY['ID_MATEMATICA'::text, 'ID_PORTUGUES'::text])
    ),
    materias_estudadas_ciclo = ARRAY(
        SELECT unnest(materias_estudadas_ciclo) 
        EXCEPT 
        SELECT unnest(ARRAY['ID_MATEMATICA'::text, 'ID_PORTUGUES'::text])
    ),
    atualizado_em = NOW()
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);
*/

-- 4. Verificar após correção (execute após o UPDATE)
SELECT 
    'Após correção:' as info,
    array_length(ciclo_atual, 1) as total_ciclo_ativo,
    array_length(materias_estudadas_ciclo, 1) as estudadas,
    ciclo_atual,
    materias_estudadas_ciclo
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);