-- 1. Alterar Constraints para CASCADE na deleção de Editais
ALTER TABLE public.subjects 
DROP CONSTRAINT IF EXISTS subjects_edital_id_fkey,
ADD CONSTRAINT subjects_edital_id_fkey 
FOREIGN KEY (edital_id) 
REFERENCES public.user_editais(id) 
ON DELETE CASCADE;

ALTER TABLE public.topics 
DROP CONSTRAINT IF EXISTS topics_edital_id_fkey,
ADD CONSTRAINT topics_edital_id_fkey 
FOREIGN KEY (edital_id) 
REFERENCES public.user_editais(id) 
ON DELETE CASCADE;

-- 2. Alterar Constraints de Merges para CASCADE (Pai -> Merge)
ALTER TABLE public.topic_merges 
DROP CONSTRAINT IF EXISTS topic_merges_primary_topic_id_fkey,
ADD CONSTRAINT topic_merges_primary_topic_id_fkey 
FOREIGN KEY (primary_topic_id) 
REFERENCES public.topics(id) 
ON DELETE CASCADE;

ALTER TABLE public.subject_merges 
DROP CONSTRAINT IF EXISTS subject_merges_primary_subject_id_fkey,
ADD CONSTRAINT subject_merges_primary_subject_id_fkey 
FOREIGN KEY (primary_subject_id) 
REFERENCES public.subjects(id) 
ON DELETE CASCADE;

-- 3. Criar Função de Trigger para Recuperação de Visibilidade
CREATE OR REPLACE FUNCTION public.handle_topic_orphan_recovery()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o parent_topic_id for setado como NULL (via ON DELETE SET NULL automático da FK pai)
    -- OU se for atualizado manualmente para NULL
    -- E o tópico estiver oculto
    IF NEW.parent_topic_id IS NULL AND OLD.parent_topic_id IS NOT NULL AND NEW.is_hidden = true THEN
        NEW.is_hidden := false;
        NEW.merged_with_ia := false;
        -- Log da operação (opcional, pode ser visto via logs do postgres se habilitado)
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Aplicar o Trigger na tabela topics
DROP TRIGGER IF EXISTS trg_ensure_topic_visibility ON public.topics;
CREATE TRIGGER trg_ensure_topic_visibility
BEFORE UPDATE ON public.topics
FOR EACH ROW
EXECUTE FUNCTION public.handle_topic_orphan_recovery();

-- 5. Função Extra: Trigger para impedir inserção de matérias órfãs (Proteção CRUD)
CREATE OR REPLACE FUNCTION public.prevent_orphaned_subjects()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.edital_id IS NULL AND (NEW.user_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Não é permitido criar uma matéria sem edital_id vinculado.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_orphaned_subjects ON public.subjects;
CREATE TRIGGER trg_prevent_orphaned_subjects
BEFORE INSERT ON public.subjects
FOR EACH ROW
EXECUTE FUNCTION public.prevent_orphaned_subjects();;
