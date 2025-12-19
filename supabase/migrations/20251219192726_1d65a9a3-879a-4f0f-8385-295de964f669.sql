-- Fix security definer view issue by recreating with SECURITY INVOKER
-- This ensures the view respects RLS policies of the querying user

DROP VIEW IF EXISTS public.user_difficulty_overview;

CREATE VIEW public.user_difficulty_overview 
WITH (security_invoker = true)
AS
SELECT 
  s.user_id,
  count(t.id) AS total_topics,
  count(t.difficulty_level) AS rated_topics,
  round(avg(t.difficulty_level::numeric), 2) AS avg_difficulty,
  count(CASE WHEN t.difficulty_level = 1 THEN 1 ELSE NULL END) AS very_easy_count,
  count(CASE WHEN t.difficulty_level = 2 THEN 1 ELSE NULL END) AS easy_count,
  count(CASE WHEN t.difficulty_level = 3 THEN 1 ELSE NULL END) AS medium_count,
  count(CASE WHEN t.difficulty_level = 4 THEN 1 ELSE NULL END) AS hard_count,
  count(CASE WHEN t.difficulty_level = 5 THEN 1 ELSE NULL END) AS very_hard_count,
  count(CASE WHEN t.completed = true AND t.difficulty_level >= 4 THEN 1 ELSE NULL END) AS hard_topics_mastered
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
GROUP BY s.user_id;

-- Grant necessary permissions
GRANT SELECT ON public.user_difficulty_overview TO authenticated;
GRANT SELECT ON public.user_difficulty_overview TO anon;