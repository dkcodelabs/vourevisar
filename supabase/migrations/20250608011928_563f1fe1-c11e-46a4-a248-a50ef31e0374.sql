
-- Criar tabela para rastrear sessões de estudo e métricas
CREATE TABLE public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  topics_studied INTEGER NOT NULL DEFAULT 0,
  subjects_worked JSONB DEFAULT '[]'::jsonb,
  session_duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS para segurança
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own study sessions" 
  ON public.study_sessions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own study sessions" 
  ON public.study_sessions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study sessions" 
  ON public.study_sessions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Adicionar novos campos para tracking na tabela subjects (opcional para métricas)
ALTER TABLE public.subjects 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_study_time_minutes INTEGER DEFAULT 0;

-- Adicionar novos campos para tracking na tabela topics (opcional para métricas)
ALTER TABLE public.topics 
ADD COLUMN IF NOT EXISTS first_studied_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;
;
