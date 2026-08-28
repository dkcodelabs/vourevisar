
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS is_unified boolean DEFAULT false;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS merged_with_ia boolean DEFAULT false;
;
