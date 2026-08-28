
-- Adicionar flag para marcar tópicos rejeitados/inválidos
ALTER TABLE public.topics 
ADD COLUMN IF NOT EXISTS is_skipped BOOLEAN DEFAULT false;

-- Adicionar coluna para armazenar motivo da rejeição
ALTER TABLE public.topics 
ADD COLUMN IF NOT EXISTS skip_reason TEXT NULL;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_topics_is_skipped 
ON public.topics(is_skipped)
WHERE is_skipped = false;

COMMENT ON COLUMN public.topics.is_skipped IS 
'Flag indicando se o tópico foi pulado/rejeitado pela IA de validação';

COMMENT ON COLUMN public.topics.skip_reason IS 
'Motivo pelo qual o tópico foi rejeitado (ex: dados inválidos, teste, etc)';
;
