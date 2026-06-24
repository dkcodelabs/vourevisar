
-- Atualizar o status das matérias que têm todos os tópicos concluídos
UPDATE subjects 
SET 
  status = 'Concluída',
  completed_at = NOW(),
  updated_at = NOW()
WHERE id IN (
  SELECT s.id 
  FROM subjects s
  WHERE s.status != 'Concluída'
    AND NOT EXISTS (
      SELECT 1 
      FROM topics t 
      WHERE t.subject_id = s.id 
        AND (t.review_stage != 'Concluído' OR t.review_stage IS NULL)
    )
    AND EXISTS (
      SELECT 1 
      FROM topics t 
      WHERE t.subject_id = s.id
    )
);
;
