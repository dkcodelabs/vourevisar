-- Adiciona o campo review_profile na tabela user_settings
ALTER TABLE user_settings
ADD COLUMN review_profile TEXT NOT NULL DEFAULT 'INTERMEDIATE';

-- Atualiza os registros existentes para usar o perfil intermediário
UPDATE user_settings
SET review_profile = 'INTERMEDIATE'
WHERE review_profile IS NULL; 