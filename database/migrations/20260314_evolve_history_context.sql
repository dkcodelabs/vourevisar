-- Migração: Evolução do Histórico e Ciclos
-- Data: 2026-03-14

-- 1. Evolução da tabela de ciclos para suportar histórico de nomes
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'user_cycles' AND column_name = 'name') THEN
        ALTER TABLE public.user_cycles ADD COLUMN name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'user_cycles' AND column_name = 'status') THEN
        ALTER TABLE public.user_cycles ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived'));
    END IF;
END $$;

-- 2. Evolução da tabela de histórico para suportar contexto
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'topic_review_history' AND column_name = 'edital_id') THEN
        ALTER TABLE public.topic_review_history ADD COLUMN edital_id UUID REFERENCES public.user_editals(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'topic_review_history' AND column_name = 'cycle_id') THEN
        ALTER TABLE public.topic_review_history ADD COLUMN cycle_id UUID REFERENCES public.user_cycles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Índice para performance de filtros no dashboard
CREATE INDEX IF NOT EXISTS idx_topic_review_history_cycle ON public.topic_review_history(cycle_id);
CREATE INDEX IF NOT EXISTS idx_topic_review_history_edital ON public.topic_review_history(edital_id);

COMMENT ON COLUMN public.topic_review_history.cycle_id IS 'ID do ciclo ativo no momento da revisão';
COMMENT ON COLUMN public.topic_review_history.edital_id IS 'ID do edital associado ao tópico revisado';
