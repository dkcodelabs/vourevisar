-- First, migrate data from review_notes to notes for topics that have review_notes but no notes
UPDATE topics 
SET notes = review_notes 
WHERE review_notes IS NOT NULL 
  AND review_notes != '{}'::jsonb 
  AND (notes IS NULL OR notes = '{}'::jsonb);

-- For topics that have both review_notes and notes, merge the content
UPDATE topics 
SET notes = jsonb_build_object(
  'content', 
  COALESCE((notes->>'content'), '') || 
  CASE 
    WHEN COALESCE((notes->>'content'), '') != '' AND COALESCE((review_notes->>'content'), '') != '' 
    THEN E'\n\n--- Anotações de Revisão ---\n' || COALESCE((review_notes->>'content'), '')
    ELSE COALESCE((review_notes->>'content'), '')
  END,
  'updatedAt', COALESCE((review_notes->>'updatedAt'), (notes->>'updatedAt'), NOW()::text),
  'createdAt', COALESCE((notes->>'createdAt'), (review_notes->>'createdAt'), NOW()::text)
)
WHERE review_notes IS NOT NULL 
  AND review_notes != '{}'::jsonb 
  AND notes IS NOT NULL 
  AND notes != '{}'::jsonb;

-- Remove the review_notes column after migration
ALTER TABLE topics DROP COLUMN review_notes;