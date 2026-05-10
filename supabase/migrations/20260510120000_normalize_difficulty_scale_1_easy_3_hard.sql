-- Normaliza a escala oficial de dificuldade para:
-- 1 = Fácil, 2 = Médio, 3 = Difícil.
--
-- O produto gravava anteriormente 1 = Difícil e 3 = Fácil em parte do fluxo.
-- Esta migration troca 1 <-> 3 uma única vez e registra uma trava para evitar
-- que a inversão rode novamente.

CREATE TABLE IF NOT EXISTS public.app_data_migrations (
  migration_key TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.app_data_migrations
    WHERE migration_key = 'normalize_difficulty_scale_1_easy_3_hard'
  ) THEN
    UPDATE public.topics
    SET difficulty_level = CASE difficulty_level
      WHEN 1 THEN 3
      WHEN 3 THEN 1
      ELSE difficulty_level
    END
    WHERE difficulty_level IN (1, 3);

    UPDATE public.topic_review_history
    SET difficulty_numeric = CASE difficulty_numeric
      WHEN 1 THEN 3
      WHEN 3 THEN 1
      ELSE difficulty_numeric
    END
    WHERE difficulty_numeric IN (1, 3);

    INSERT INTO public.app_data_migrations (migration_key)
    VALUES ('normalize_difficulty_scale_1_easy_3_hard');
  END IF;
END $$;

COMMENT ON COLUMN public.topics.difficulty_level IS 'Dificuldade normalizada (1=Fácil, 2=Médio, 3=Difícil)';
COMMENT ON COLUMN public.topic_review_history.difficulty_numeric IS 'Dificuldade normalizada (1=Fácil, 2=Médio, 3=Difícil)';

CREATE OR REPLACE FUNCTION public.get_weighted_reviews(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 1000,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  subject_id UUID,
  review_stage TEXT,
  next_review TIMESTAMPTZ,
  review_count INTEGER,
  first_studied_at TIMESTAMPTZ,
  last_reviewed_at TIMESTAMPTZ,
  completed BOOLEAN,
  difficulty_level INTEGER,
  notes JSONB,
  subject_name TEXT,
  subject_color TEXT,
  priority_score INTEGER
) AS $$
DECLARE
  v_exam_date DATE;
  v_week_zero_start DATE;
BEGIN
  SELECT data_prova_meta INTO v_exam_date
  FROM public.user_settings
  WHERE user_id = p_user_id;

  IF v_exam_date IS NOT NULL THEN
    v_week_zero_start := v_exam_date - INTERVAL '7 days';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.subject_id,
    t.review_stage,
    t.next_review,
    COALESCE(t.review_count, 0) as review_count,
    t.first_studied_at,
    t.last_reviewed_at,
    COALESCE(t.completed, false) as completed,
    t.difficulty_level,
    t.notes,
    s.name as subject_name,
    s.color as subject_color,
    CASE
      WHEN COALESCE(t.review_count, 0) <= 2 AND t.review_stage NOT IN ('Concluído', 'Primeiro Contato') THEN 1
      WHEN t.review_stage IN ('24h', 'R1', 'R2', '7d') THEN 1
      WHEN v_exam_date IS NOT NULL
           AND t.next_review::date >= v_week_zero_start
           AND t.next_review::date <= v_exam_date THEN 2
      WHEN t.difficulty_level >= 3 THEN 3
      ELSE 4
    END as priority_score
  FROM public.topics t
  JOIN public.subjects s ON t.subject_id = s.id
  WHERE
    s.user_id = p_user_id
    AND t.next_review IS NOT NULL
  ORDER BY
    priority_score ASC,
    t.next_review ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP VIEW IF EXISTS public.user_difficulty_overview;

CREATE VIEW public.user_difficulty_overview
WITH (security_invoker = true)
AS
SELECT
  s.user_id,
  count(t.id) AS total_topics,
  count(t.difficulty_level) AS rated_topics,
  round(avg(t.difficulty_level::numeric), 2) AS avg_difficulty,
  count(CASE WHEN t.difficulty_level = 1 THEN 1 ELSE NULL END) AS easy_count,
  count(CASE WHEN t.difficulty_level = 2 THEN 1 ELSE NULL END) AS medium_count,
  count(CASE WHEN t.difficulty_level = 3 THEN 1 ELSE NULL END) AS hard_count,
  0::bigint AS very_easy_count,
  0::bigint AS very_hard_count,
  count(CASE WHEN t.completed = true AND t.difficulty_level >= 3 THEN 1 ELSE NULL END) AS hard_topics_mastered
FROM public.subjects s
LEFT JOIN public.topics t ON s.id = t.subject_id
GROUP BY s.user_id;

GRANT SELECT ON public.user_difficulty_overview TO authenticated;
GRANT SELECT ON public.user_difficulty_overview TO anon;
