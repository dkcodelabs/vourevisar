
-- Adiciona rastreamento de autoria na tabela pública de editais
ALTER TABLE public_editais 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Índice para facilitar consultas por admin
CREATE INDEX IF NOT EXISTS idx_public_editais_created_by ON public_editais(created_by);

COMMENT ON COLUMN public_editais.created_by IS 'ID do administrador que cadastrou o edital no catálogo público';
;
