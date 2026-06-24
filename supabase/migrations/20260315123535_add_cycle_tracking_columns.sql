-- Adicionar colunas em topic_review_history
ALTER TABLE public.topic_review_history 
ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.user_cycles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS edital_id uuid REFERENCES public.user_editais(id) ON DELETE SET NULL;

-- Adicionar colunas em study_sessions
ALTER TABLE public.study_sessions 
ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.user_cycles(id) ON DELETE SET NULL;
;
