
-- Adicionar coluna notes do tipo JSONB na tabela topics
ALTER TABLE public.topics 
ADD COLUMN notes JSONB DEFAULT NULL;

-- Criar índice para melhorar performance de consultas nas anotações
CREATE INDEX idx_topics_notes ON public.topics USING GIN (notes);
;
