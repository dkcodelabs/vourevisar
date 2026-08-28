
-- Adicionar coluna last_trend_check_at para automação GUT
ALTER TABLE public.topics 
ADD COLUMN IF NOT EXISTS last_trend_check_at TIMESTAMPTZ NULL;

-- Criar índice para performance nas queries de automação
CREATE INDEX IF NOT EXISTS idx_topics_last_trend_check 
ON public.topics(last_trend_check_at)
WHERE last_trend_check_at IS NOT NULL;

COMMENT ON COLUMN public.topics.last_trend_check_at IS 
'Timestamp da última vez que o tópico foi processado pela automação GUT. Usado para priorizar tópicos pendentes.';
;
