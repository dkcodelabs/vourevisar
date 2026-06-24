-- Adicionar edital_id em study_sessions
ALTER TABLE public.study_sessions 
ADD COLUMN IF NOT EXISTS edital_id uuid REFERENCES public.user_editais(id) ON DELETE SET NULL;

-- Tentar popular edital_id em study_sessions baseado no subject_id
UPDATE public.study_sessions ss
SET edital_id = (
    SELECT ue.id 
    FROM public.user_editais ue 
    WHERE ss.subject_id::text = ANY(ue.subject_ids)
    ORDER BY ue.updated_at DESC 
    LIMIT 1
)
WHERE ss.edital_id IS NULL AND ss.subject_id IS NOT NULL;
;
