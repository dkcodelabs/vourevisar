
-- Create table for question attempts
CREATE TABLE public.question_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  bank TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multipla-escolha', 'verdadeiro-falso', 'dissertativa')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('facil', 'medio', 'dificil')),
  user_answer TEXT,
  correct_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies for question_attempts
CREATE POLICY "Users can view their own attempts" 
  ON public.question_attempts 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attempts" 
  ON public.question_attempts 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_question_attempts_user_id ON public.question_attempts(user_id);
CREATE INDEX idx_question_attempts_subject_topic ON public.question_attempts(subject, topic);
CREATE INDEX idx_question_attempts_attempted_at ON public.question_attempts(attempted_at);
