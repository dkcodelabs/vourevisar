
-- Habilitar RLS nas tabelas se não estiver habilitado
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cycles ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para subjects
DROP POLICY IF EXISTS "Users can view their own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can create their own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can update their own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can delete their own subjects" ON public.subjects;

CREATE POLICY "Users can view their own subjects" 
  ON public.subjects FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subjects" 
  ON public.subjects FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subjects" 
  ON public.subjects FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subjects" 
  ON public.subjects FOR DELETE 
  USING (auth.uid() = user_id);

-- Criar políticas RLS para topics
DROP POLICY IF EXISTS "Users can view topics of their subjects" ON public.topics;
DROP POLICY IF EXISTS "Users can create topics in their subjects" ON public.topics;
DROP POLICY IF EXISTS "Users can update topics in their subjects" ON public.topics;
DROP POLICY IF EXISTS "Users can delete topics in their subjects" ON public.topics;

CREATE POLICY "Users can view topics of their subjects" 
  ON public.topics FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.subjects 
      WHERE subjects.id = topics.subject_id 
      AND subjects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create topics in their subjects" 
  ON public.topics FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.subjects 
      WHERE subjects.id = topics.subject_id 
      AND subjects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update topics in their subjects" 
  ON public.topics FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.subjects 
      WHERE subjects.id = topics.subject_id 
      AND subjects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete topics in their subjects" 
  ON public.topics FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.subjects 
      WHERE subjects.id = topics.subject_id 
      AND subjects.user_id = auth.uid()
    )
  );

-- Políticas para profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Políticas para user_settings
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;

CREATE POLICY "Users can view their own settings" 
  ON public.user_settings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
  ON public.user_settings FOR UPDATE 
  USING (auth.uid() = user_id);

-- Políticas para user_cycles
DROP POLICY IF EXISTS "Users can view their own cycles" ON public.user_cycles;
DROP POLICY IF EXISTS "Users can create their own cycles" ON public.user_cycles;
DROP POLICY IF EXISTS "Users can update their own cycles" ON public.user_cycles;
DROP POLICY IF EXISTS "Users can delete their own cycles" ON public.user_cycles;

CREATE POLICY "Users can view their own cycles" 
  ON public.user_cycles FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cycles" 
  ON public.user_cycles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cycles" 
  ON public.user_cycles FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cycles" 
  ON public.user_cycles FOR DELETE 
  USING (auth.uid() = user_id);

-- Configurar foreign key com CASCADE para excluir tópicos quando uma matéria for excluída
ALTER TABLE public.topics DROP CONSTRAINT IF EXISTS topics_subject_id_fkey;
ALTER TABLE public.topics ADD CONSTRAINT topics_subject_id_fkey 
  FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;

-- Habilitar realtime para as tabelas principais
ALTER TABLE public.subjects REPLICA IDENTITY FULL;
ALTER TABLE public.topics REPLICA IDENTITY FULL;

-- Adicionar tabelas à publicação realtime
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.subjects, public.topics, public.user_cycles;
;
