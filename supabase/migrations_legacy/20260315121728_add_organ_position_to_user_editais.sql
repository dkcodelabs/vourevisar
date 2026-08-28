-- Adicionar colunas para estrutura de edital
ALTER TABLE user_editais 
ADD COLUMN IF NOT EXISTS organ TEXT,
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS year TEXT;

-- Tentar migrar dados existentes do campo 'name' para 'organ' e 'position'
-- Lógica: separar por ' - ' se existir
UPDATE user_editais 
SET 
  organ = split_part(name, ' - ', 1),
  position = CASE 
    WHEN name LIKE '% - %' THEN substring(name from position(' - ' in name) + 3)
    ELSE NULL
  END
WHERE organ IS NULL AND position IS NULL;

-- Se o órgão for PMES, PCES ou outros conhecidos, podemos extrair o ano se estiver no nome?
-- Por enquanto só o básico.
;
