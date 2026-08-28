
-- Adiciona coluna active_subject_ids à tabela user_editais
-- Representa quais matérias do edital estão "ativas" (visíveis na página Matérias)
-- É um subconjunto de subject_ids

ALTER TABLE user_editais
ADD COLUMN IF NOT EXISTS active_subject_ids text[] DEFAULT '{}';

-- Popula active_subject_ids com o valor atual de subject_ids
-- para editais já carregados no ciclo (merged_into_cycle = true)
UPDATE user_editais
SET active_subject_ids = subject_ids
WHERE merged_into_cycle = true AND (active_subject_ids IS NULL OR active_subject_ids = '{}');
;
