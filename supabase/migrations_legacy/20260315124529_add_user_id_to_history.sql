-- Adicionar colunas em topic_review_history
ALTER TABLE public.topic_review_history 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.user_cycles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS edital_id uuid REFERENCES public.user_editais(id) ON DELETE SET NULL;

-- Popular user_id em topic_review_history baseado nos tópicos/matérias
UPDATE public.topic_review_history trh
SET user_id = s.user_id
FROM public.topics t
JOIN public.subjects s ON t.subject_id = s.id
WHERE trh.topic_id = t.id
AND trh.user_id IS NULL;

-- Se ainda houver registros sem user_id (ex: tópicos órfãos), usar o owner do sistema ou deixar null por enquanto.
-- Mas pela modelagem, todo tópico pertence a uma matéria que pertence a um usuário.
;
