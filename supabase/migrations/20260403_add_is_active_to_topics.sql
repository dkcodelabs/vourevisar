-- Adicionar coluna is_active para suporte a exclusão lógica e filtros
-- Esta coluna é esperada pelo frontend em Editais.tsx e useSubjectsAndTopics.tsx

-- 1. Tabela: topics
ALTER TABLE public.topics 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Índice para melhorar a performance dos filtros comuns (apenas registros ativos)
CREATE INDEX IF NOT EXISTS idx_topics_is_active ON public.topics(is_active) WHERE is_active = true;

-- 3. Comentário para documentação
COMMENT ON COLUMN public.topics.is_active IS 'Indica se o tópico está ativo no ciclo de estudos atual';
