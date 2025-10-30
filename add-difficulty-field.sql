-- Script para adicionar o campo difficulty_level à tabela topics
-- Execute este script no Supabase SQL Editor

-- Verificar se a coluna já existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'topics' 
        AND column_name = 'difficulty_level'
    ) THEN
        -- Adicionar a coluna difficulty_level
        ALTER TABLE topics 
        ADD COLUMN difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5);
        
        -- Adicionar comentário
        COMMENT ON COLUMN topics.difficulty_level IS 'Nível de dificuldade do tópico (1=Muito Fácil, 2=Fácil, 3=Médio, 4=Difícil, 5=Muito Difícil)';
        
        RAISE NOTICE 'Coluna difficulty_level adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna difficulty_level já existe!';
    END IF;
END $$;

-- Verificar a estrutura da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'topics' 
AND column_name = 'difficulty_level';