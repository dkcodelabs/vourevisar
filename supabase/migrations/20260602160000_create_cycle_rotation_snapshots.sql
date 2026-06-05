CREATE TABLE IF NOT EXISTS public.cycle_rotation_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_cycle_id UUID NOT NULL REFERENCES public.user_cycles(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  subject_count INTEGER NOT NULL DEFAULT 0,
  studied_subject_count INTEGER NOT NULL DEFAULT 0,
  topics_started_count INTEGER NOT NULL DEFAULT 0,
  topics_completed_count INTEGER NOT NULL DEFAULT 0,
  studied_subject_ids TEXT[] NOT NULL DEFAULT '{}',
  cycle_subject_ids TEXT[] NOT NULL DEFAULT '{}',
  edital_ids TEXT[] NOT NULL DEFAULT '{}',
  per_subject JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_cycle_id, cycle_number)
);

ALTER TABLE public.cycle_rotation_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cycle_rotation_snapshots'
      AND policyname = 'Users can manage their own cycle rotation snapshots'
  ) THEN
    CREATE POLICY "Users can manage their own cycle rotation snapshots"
    ON public.cycle_rotation_snapshots
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cycle_rotation_snapshots_user_cycle
ON public.cycle_rotation_snapshots(user_id, user_cycle_id, cycle_number DESC);

COMMENT ON TABLE public.cycle_rotation_snapshots IS
  'Resumo fechado de cada giro/ciclo antes de iniciar o proximo. Alimenta comparacoes entre ciclos.';

COMMENT ON COLUMN public.cycle_rotation_snapshots.per_subject IS
  'Lista de materias com total de topicos, topicos iniciados no ciclo, concluidos no ciclo e status de materia estudada.';
