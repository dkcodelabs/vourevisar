-- Verificar estrutura da tabela topics para campos de dificuldade e subtópicos
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'topics' 
    AND table_schema = 'public'
    AND column_name IN ('difficulty_level', 'subtopics', 'notes')
ORDER BY column_name;

-- Verificar se há dados existentes nesses campos
SELECT 
    id,
    name,
    difficulty_level,
    subtopics,
    notes,
    subject_id
FROM topics 
WHERE difficulty_level IS NOT NULL 
   OR subtopics IS NOT NULL 
   OR notes IS NOT NULL
LIMIT 5;

-- Verificar um tópico específico para debug
SELECT 
    id,
    name,
    difficulty_level,
    subtopics,
    notes,
    created_at,
    updated_at
FROM topics 
WHERE name ILIKE '%Princípios Contábeis%' 
   OR name ILIKE '%contab%'
   OR name ILIKE '%mat%'
   OR name ILIKE '%apagar%'
LIMIT 5;

-- Testar inserção de dados de teste para verificar se funciona
-- (NÃO EXECUTE ESTE COMANDO SEM CONFIRMAR)
/*
UPDATE topics 
SET 
    difficulty_level = 'medium',
    subtopics = '[{"id": "test-1", "name": "Subtópico Teste 1"}, {"id": "test-2", "name": "Subtópico Teste 2"}]'::json,
    notes = '{"content": "Teste de anotação"}'::json
WHERE name ILIKE '%mat%' 
LIMIT 1;
*/