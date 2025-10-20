-- CORREÇÃO SIMPLES DO CICLO
-- Execute no Supabase SQL Editor

-- 1. Verificar estado atual
SELECT 
    'Estado Atual:' as info,
    ciclos_realizados,
    array_length(materias_estudadas_ciclo, 1) as estudadas_count,
    array_length(ciclo_atual, 1) as total_ciclo,
    materias_estudadas_ciclo,
    ciclo_atual,
    data_inicio_ciclo,
    atualizado_em
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

-- 2. CORREÇÃO: Se você finalizou 2 ciclos, o próximo deve ser #3
-- Execute esta linha para corrigir o número do ciclo:

UPDATE user_cycles 
SET 
    ciclos_realizados = 3,
    materias_estudadas_ciclo = '{}',
    data_inicio_ciclo = NOW(),
    atualizado_em = NOW()
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

-- 3. CORREÇÃO: Remover matérias 100% concluídas do ciclo atual
-- Primeiro, vamos verificar a estrutura das tabelas

SELECT 'Estrutura da tabela subjects:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subjects' 
ORDER BY ordinal_position;

SELECT 'Estrutura da tabela topics:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'topics' 
ORDER BY ordinal_position;

-- Verificar matérias e seus tópicos
SELECT 'Matérias e tópicos:' as info;
SELECT 
    s.id as subject_id,
    s.name as subject_name,
    COUNT(t.id) as total_topics,
    COUNT(CASE WHEN t.review_stage = 'Concluído' THEN 1 END) as completed_topics,
    CASE 
        WHEN COUNT(t.id) > 0 AND COUNT(CASE WHEN t.review_stage = 'Concluído' THEN 1 END) = COUNT(t.id) 
        THEN 'CONCLUÍDA' 
        ELSE 'ATIVA' 
    END as status
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.user_id = (SELECT id FROM auth.users LIMIT 1)
GROUP BY s.id, s.name
ORDER BY s.name;

-- 4. CORREÇÃO MANUAL: Remover matérias 100% concluídas do ciclo
-- Execute esta query após verificar quais matérias estão 100% concluídas

/*
-- Exemplo: Se MATEMÁTICA (ID específico) está 100% concluída, remova do ciclo:
UPDATE user_cycles 
SET 
    ciclo_atual = array_remove(ciclo_atual, 'ID_DA_MATEMATICA_AQUI'),
    atualizado_em = NOW()
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);
*/

-- 5. Verificar estado final
SELECT 
    'Estado Final:' as info,
    ciclos_realizados,
    array_length(materias_estudadas_ciclo, 1) as estudadas_count,
    array_length(ciclo_atual, 1) as total_ciclo_ativo,
    ciclo_atual
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);