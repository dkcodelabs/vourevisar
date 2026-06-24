-- Motor de Ciclos V2

-- 1. Tabela Principal do Ciclo
CREATE TABLE IF NOT EXISTS public.study_cycles_v2 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.study_cycles_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own v2 cycles" ON public.study_cycles_v2 FOR ALL USING (auth.uid() = user_id);

-- 2. Tabela de Giros (Rotations)
CREATE TABLE IF NOT EXISTS public.cycle_rotations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cycle_id UUID NOT NULL REFERENCES public.study_cycles_v2(id) ON DELETE CASCADE,
    rotation_number INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS e vincular via cycle_id
ALTER TABLE public.cycle_rotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own rotations" ON public.cycle_rotations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.study_cycles_v2 WHERE study_cycles_v2.id = cycle_rotations.cycle_id AND study_cycles_v2.user_id = auth.uid())
);

-- 3. Tabela de Estados Rápidos da Matéria no Ciclo
CREATE TABLE IF NOT EXISTS public.cycle_subject_states (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    cycle_id UUID NOT NULL REFERENCES public.study_cycles_v2(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    last_studied_date DATE,
    completed_in_current_rotation BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(cycle_id, subject_id)
);

ALTER TABLE public.cycle_subject_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own subject states" ON public.cycle_subject_states FOR ALL USING (auth.uid() = user_id);

-- 4. Tabela de Logs Perfeitos (Extrato)
CREATE TABLE IF NOT EXISTS public.cycle_study_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    rotation_id UUID NOT NULL REFERENCES public.cycle_rotations(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    studied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.cycle_study_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own study logs" ON public.cycle_study_logs FOR ALL USING (auth.uid() = user_id);

-- Trigger para updated_at no study_cycles_v2
CREATE OR REPLACE FUNCTION update_study_cycles_v2_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_study_cycles_v2_modtime
BEFORE UPDATE ON public.study_cycles_v2
FOR EACH ROW EXECUTE PROCEDURE update_study_cycles_v2_modtime();

-- Trigger para updated_at no cycle_subject_states
CREATE OR REPLACE FUNCTION update_cycle_subject_states_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cycle_subject_states_modtime
BEFORE UPDATE ON public.cycle_subject_states
FOR EACH ROW EXECUTE PROCEDURE update_cycle_subject_states_modtime();;
