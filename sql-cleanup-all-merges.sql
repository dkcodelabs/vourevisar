-- ================================================
-- LIMPEZA TOTAL DE TODOS OS MERGES
-- Execute para remover todos os registros problemáticos
-- ================================================

-- Verificar antes de limpar
SELECT 'subject_merges para remover:' as info, COUNT(*) as total FROM subject_merges;
SELECT 'topic_merges para remover:' as info, COUNT(*) as total FROM topic_merges;

-- Limpar topic_merges primeiro (tem foreign key)
DELETE FROM topic_merges;

-- Limpar subject_merges
DELETE FROM subject_merges;

-- Verificar resultado
SELECT 'subject_merges restante:' as info, COUNT(*) as total FROM subject_merges;
SELECT 'topic_merges restante:' as info, COUNT(*) as total FROM topic_merges;
