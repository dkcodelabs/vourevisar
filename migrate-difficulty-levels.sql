-- Script para migrar difficulty_level de strings para números
-- Execute este script no Supabase SQL Editor

-- Primeiro, vamos ver os dados atuais
SELECT id, name, difficulty_level, difficulty_set_at 
FROM topics 
WHERE difficulty_level IS NOT NULL 
LIMIT 10;

-- Migrar os dados existentes
UPDATE topics 
SET difficulty_level = CASE 
  WHEN difficulty_level::text = 'easy' THEN 2
  WHEN difficulty_level::text = 'medium' THEN 3  
  WHEN difficulty_level::text = 'hard' THEN 4
  ELSE difficulty_level::integer -- Se já for número, manter
END
WHERE difficulty_level IS NOT NULL;

-- Verificar se a migração funcionou
SELECT id, name, difficulty_level, difficulty_set_at 
FROM topics 
WHERE difficulty_level IS NOT NULL 
LIMIT 10;