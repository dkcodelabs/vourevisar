-- Update get_weighted_reviews function with corrected priority ordering
-- Prioridade: R1/R2 → Semana Zero → Difíceis (4-5⭐) → Backlog

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
DECLARE
  v_exam_date DATE;
  v_week_zero_start DATE;
BEGIN
  -- Buscar data da prova do usuário
  SELECT data_prova_meta INTO v_exam_date
  FROM user_settings
  WHERE user_id = p_user_id;
  
  -- Calcular início da Semana Zero (prova - 7 dias)
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
      -- Prioridade 1: R1 ou R2 (Emergência - Curto Prazo)
      WHEN COALESCE(t.review_count, 0) <= 2 AND t.review_stage NOT IN ('Concluído', 'Primeiro Contato') THEN 1
      WHEN t.review_stage IN ('24h', 'R1', 'R2', '7d') THEN 1
      
      -- Prioridade 2: Revisões na Semana Zero (comprimidas pelo Prompt 4)
      WHEN v_exam_date IS NOT NULL 
           AND t.next_review::date >= v_week_zero_start 
           AND t.next_review::date <= v_exam_date THEN 2
      
      -- Prioridade 3: Difíceis (4 ou 5 estrelas)
      WHEN t.difficulty_level >= 4 THEN 3
      
      -- Prioridade 4: Backlog Geral
      ELSE 4
    END as priority_score
  FROM topics t
  JOIN subjects s ON t.subject_id = s.id
  WHERE
    s.user_id = p_user_id
    AND t.next_review IS NOT NULL
  ORDER BY
    -- Ordenação Primária: Score de Prioridade (1 → 2 → 3 → 4)
    priority_score ASC,
    -- Ordenação Secundária: 
    -- Para backlog (prioridade 4), mostrar mais recentes primeiro
    -- Para outros, ordenar cronologicamente
    CASE 
      WHEN priority_score = 4 THEN t.next_review 
      ELSE t.next_review 
    END ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
