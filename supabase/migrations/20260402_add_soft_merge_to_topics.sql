-- Adicionar colunas para suporte a Unificação Inteligente (Soft Merge)
-- Tabela: topics

-- 1. Coluna para referência de hierarquia (quem é o tópico principal/pai)
ALTER TABLE public.topics 
ADD COLUMN IF NOT EXISTS parent_topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL;

-- 2. Coluna para controle de visibilidade (esconder duplicatas unificadas)
ALTER TABLE public.topics 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- 3. Comentários para documentação
COMMENT ON COLUMN public.topics.parent_topic_id IS 'ID do tópico principal ao qual este tópico foi unificado';
COMMENT ON COLUMN public.topics.is_hidden IS 'Indica se o tópico deve ser ocultado na interface (por ser uma duplicata unificada)';

-- 4. Índice para performance em buscas de hierarquia
CREATE INDEX IF NOT EXISTS idx_topics_parent_id ON public.topics(parent_topic_id);
