-- Metadata extracted from edital PDFs/text by IA.
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS exam_weight_points NUMERIC NULL,
ADD COLUMN IF NOT EXISTS exam_weight_questions INTEGER NULL,
ADD COLUMN IF NOT EXISTS exam_weight_percentage NUMERIC NULL,
ADD COLUMN IF NOT EXISTS exam_weight_raw TEXT NULL;

COMMENT ON COLUMN public.subjects.exam_weight_points IS 'Pontuação/peso oficial da matéria no edital, quando identificado pela IA.';
COMMENT ON COLUMN public.subjects.exam_weight_questions IS 'Quantidade de questões da matéria no edital, quando identificada pela IA.';
COMMENT ON COLUMN public.subjects.exam_weight_percentage IS 'Percentual da matéria na prova, quando identificado pela IA.';
COMMENT ON COLUMN public.subjects.exam_weight_raw IS 'Trecho bruto do edital usado como evidência do peso da matéria.';

ALTER TABLE public.pending_ai_extractions
ADD COLUMN IF NOT EXISTS analysis_result JSONB NULL,
ADD COLUMN IF NOT EXISTS selected_cargo TEXT NULL,
ADD COLUMN IF NOT EXISTS source_type TEXT NULL,
ADD COLUMN IF NOT EXISTS pdf_url TEXT NULL;

COMMENT ON COLUMN public.pending_ai_extractions.analysis_result IS 'Resultado da etapa inicial de análise do edital: metadados e cargos disponíveis.';
COMMENT ON COLUMN public.pending_ai_extractions.selected_cargo IS 'Cargo selecionado pelo usuário antes da extração de disciplinas.';
COMMENT ON COLUMN public.pending_ai_extractions.source_type IS 'Origem do documento analisado: text ou pdf.';
COMMENT ON COLUMN public.pending_ai_extractions.pdf_url IS 'URL temporária do PDF usado na extração, quando houver.';
