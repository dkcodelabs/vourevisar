-- Create a function to get reviews sorted by weighted priority
CREATE OR REPLACE FUNCTION get_weighted_reviews(
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
BEGIN
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
      -- Prioridade 1: R1 ou R2 (Emergência - Curto Prazo)
      WHEN t.review_stage IN ('R1', 'R2') THEN 1
      -- Prioridade 2: Difícil (1 ou 2 estrelas) ou Nunca avaliados (NULL)
      WHEN t.difficulty_level IN (1, 2) OR t.difficulty_level IS NULL THEN 2
      -- Prioridade 3: Backlog Geral
      ELSE 3
    END as priority_score
  FROM topics t
  JOIN subjects s ON t.subject_id = s.id
  WHERE
    s.user_id = p_user_id
    AND t.next_review IS NOT NULL
  ORDER BY
    -- Ordenação Primária: Score de Prioridade (1 -> 2 -> 3)
    priority_score ASC,
    -- Ordenação Secundária: Data da revisão (Cronológica)
    t.next_review ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
