
-- Tabela principal: editais do usuário
CREATE TABLE public.user_editais (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) > 0 AND char_length(name) <= 200),
  exam_date date,
  is_imported boolean NOT NULL DEFAULT false,
  source_id text,
  subject_ids text[] NOT NULL DEFAULT '{}'::text[],
  merged_with text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_editais_pkey PRIMARY KEY (id),
  CONSTRAINT user_editais_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Comentários
COMMENT ON TABLE public.user_editais IS 'Editais personalizados do usuário. Podem ser importados (clonados) ou criados manualmente.';
COMMENT ON COLUMN public.user_editais.exam_date IS 'Data opcional da prova/concurso para contagem regressiva de urgência.';
COMMENT ON COLUMN public.user_editais.is_imported IS 'true = clonado de edital global, false = criado manualmente.';
COMMENT ON COLUMN public.user_editais.source_id IS 'ID do edital global original (quando importado).';
COMMENT ON COLUMN public.user_editais.subject_ids IS 'Array de UUIDs de matérias vinculadas a este edital.';
COMMENT ON COLUMN public.user_editais.merged_with IS 'Array de IDs de editais mesclados neste (para desfazer mescla).';

-- RLS
ALTER TABLE public.user_editais ENABLE ROW LEVEL SECURITY;

-- Policies: usuário vê/gerencia apenas seus editais
CREATE POLICY "Users can view own editais"
  ON public.user_editais
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own editais"
  ON public.user_editais
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own editais"
  ON public.user_editais
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own editais"
  ON public.user_editais
  FOR DELETE
  USING (auth.uid() = user_id);

-- Índice para busca por usuário
CREATE INDEX idx_user_editais_user_id ON public.user_editais(user_id);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.update_user_editais_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_editais_updated_at
  BEFORE UPDATE ON public.user_editais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_editais_updated_at();
;
