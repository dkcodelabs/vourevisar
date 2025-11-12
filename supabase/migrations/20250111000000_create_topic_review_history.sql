-- ============================================
-- MIGRAÇÃO: Histórico de Revisões de Tópicos
-- Data: 2025-01-11
-- Descrição: Cria tabela para rastrear histórico completo de revisões
-- ============================================

-- 1. Criar tabela de histórico de revisões
CREATE TABLE IF NOT EXISTS public.topic_review_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  review_stage TEXT NOT NULL, -- '24h', '7d', '15d', '30d', '60d', 'completed'
  reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices para otimizar queries
CREATE INDEX IF NOT EXISTS idx_topic_review_history_topic_id ON public.topic_review_history(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_review_history_reviewed_at ON public.topic_review_history(reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_topic_review_history_topic_stage ON public.topic_review_history(topic_id, review_stage);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE public.topic_review_history ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de segurança
-- Política simples: usuários autenticados podem gerenciar seus dados
-- O controle de acesso é feito através da relação topic_id -> topics (que já tem RLS)
CREATE POLICY "Users can manage their own topic review history"
  ON public.topic_review_history
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Criar função para registrar revisão automaticamente
CREATE OR REPLACE FUNCTION public.register_topic_review()
RETURNS TRIGGER AS $$
BEGIN
  -- Registrar no histórico quando review_stage muda e não é NULL
  IF NEW.review_stage IS NOT NULL AND (
    OLD.review_stage IS NULL OR 
    OLD.review_stage != NEW.review_stage OR
    NEW.last_reviewed_at != OLD.last_reviewed_at
  ) THEN
    INSERT INTO public.topic_review_history (
      topic_id,
      review_stage,
      reviewed_at
    ) VALUES (
      NEW.id,
      NEW.review_stage,
      COALESCE(NEW.last_reviewed_at, NOW())
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Criar trigger para registrar automaticamente
DROP TRIGGER IF EXISTS trigger_register_topic_review ON public.topics;
CREATE TRIGGER trigger_register_topic_review
  AFTER UPDATE ON public.topics
  FOR EACH ROW
  EXECUTE FUNCTION public.register_topic_review();

-- 7. Comentários para documentação
COMMENT ON TABLE public.topic_review_history IS 'Histórico completo de revisões de tópicos para rastreamento e análise';
COMMENT ON COLUMN public.topic_review_history.review_stage IS 'Estágio da revisão: 24h, 7d, 15d, 30d, 60d, completed';
COMMENT ON COLUMN public.topic_review_history.reviewed_at IS 'Data e hora em que a revisão foi realizada';

-- 8. Migrar dados existentes (opcional - apenas tópicos com histórico)
-- Criar entrada inicial para tópicos que já têm first_studied_at
INSERT INTO public.topic_review_history (topic_id, review_stage, reviewed_at)
SELECT 
  id,
  'first_contact' as review_stage,
  first_studied_at as reviewed_at
FROM public.topics
WHERE first_studied_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================
