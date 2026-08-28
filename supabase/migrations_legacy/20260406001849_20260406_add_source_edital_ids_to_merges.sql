ALTER TABLE IF EXISTS public.subject_merges ADD COLUMN IF NOT EXISTS source_edital_ids UUID[] DEFAULT '{}';
ALTER TABLE IF EXISTS public.topic_merges ADD COLUMN IF NOT EXISTS source_edital_ids UUID[] DEFAULT '{}';;
