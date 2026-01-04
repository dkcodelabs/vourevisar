-- ============================================
-- MIGRAÇÃO: Adicionar Duração ao Histórico de Revisões
-- Data: 2026-01-04
-- Descrição: Permite salvar o tempo estudado no histórico através do trigger existente
-- ============================================

-- 1. Adicionar coluna 'last_session_duration' na tabela topics
-- Esta coluna serve como "transporte" do valor durante o update
ALTER TABLE public.topics 
ADD COLUMN IF NOT EXISTS last_session_duration INTEGER DEFAULT 0;

COMMENT ON COLUMN public.topics.last_session_duration IS 'Duração da última sessão de estudo (em minutos), usado para popular o histórico';

-- 2. Adicionar coluna 'study_duration_minutes' na tabela de histórico
ALTER TABLE public.topic_review_history 
ADD COLUMN IF NOT EXISTS study_duration_minutes INTEGER;

COMMENT ON COLUMN public.topic_review_history.study_duration_minutes IS 'Tempo estudado (em minutos) nesta revisão específica';

-- 3. Atualizar a função do trigger para capturar a duração
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
      reviewed_at,
      study_duration_minutes
    ) VALUES (
      NEW.id,
      NEW.review_stage,
      COALESCE(NEW.last_reviewed_at, NOW()),
      NEW.last_session_duration -- Valor capturado do update
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
