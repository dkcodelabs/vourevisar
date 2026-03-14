-- 1. Remover os objetos dependentes primeiro
DROP TRIGGER IF EXISTS trigger_register_topic_review ON public.topics;
DROP TRIGGER IF EXISTS tr_register_topic_review ON public.topics;
DROP FUNCTION IF EXISTS public.register_topic_review() CASCADE;

-- 2. Adicionar colunas faltantes para o algoritmo SRS Ebbinghaus
ALTER TABLE public.topic_review_history 
ADD COLUMN IF NOT EXISTS difficulty_numeric INTEGER,
ADD COLUMN IF NOT EXISTS memory_stability_after_review FLOAT,
ADD COLUMN IF NOT EXISTS interval_after_review FLOAT,
ADD COLUMN IF NOT EXISTS trend_delta FLOAT,
ADD COLUMN IF NOT EXISTS trend_label TEXT;

-- 3. Comentários para documentação
COMMENT ON COLUMN public.topic_review_history.difficulty_numeric IS 'Dificuldade normalizada (1=Difícil, 2=Médio, 3=Fácil)';
COMMENT ON COLUMN public.topic_review_history.memory_stability_after_review IS 'Nova estabilidade calculada após esta revisão';
COMMENT ON COLUMN public.topic_review_history.interval_after_review IS 'Novo intervalo calculado (em dias)';
COMMENT ON COLUMN public.topic_review_history.trend_delta IS 'Variação de performance em relação às revisões anteriores';
