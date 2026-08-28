CREATE TABLE IF NOT EXISTS public.ai_extraction_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  stage TEXT NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  message TEXT NULL,
  mode TEXT NOT NULL DEFAULT 'extractForCargo',
  selected_cargo TEXT NULL,
  analysis_result JSONB NULL,
  source_payload JSONB NULL,
  extraction_result JSONB NULL,
  error_message TEXT NULL,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_extraction_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own ai extraction jobs" ON public.ai_extraction_jobs;
CREATE POLICY "Users can view own ai extraction jobs"
  ON public.ai_extraction_jobs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can cancel own ai extraction jobs" ON public.ai_extraction_jobs;
CREATE POLICY "Users can cancel own ai extraction jobs"
  ON public.ai_extraction_jobs
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_ai_extraction_jobs_user_created
  ON public.ai_extraction_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_extraction_jobs_status
  ON public.ai_extraction_jobs(status, updated_at DESC);
COMMENT ON TABLE public.ai_extraction_jobs IS 'Background jobs for AI edital extraction by selected cargo/area.';
