ALTER TABLE public.pending_ai_extractions
ADD COLUMN IF NOT EXISTS source_files jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.pending_ai_extractions
DROP CONSTRAINT IF EXISTS pending_ai_extractions_source_files_is_array;

ALTER TABLE public.pending_ai_extractions
ADD CONSTRAINT pending_ai_extractions_source_files_is_array
CHECK (jsonb_typeof(source_files) = 'array');

COMMENT ON COLUMN public.pending_ai_extractions.source_files IS
'Storage paths for the main edital and its companion annexes. pdf_url remains the backwards-compatible primary document reference.';
