-- Add notes column to subjects table for subject-level annotations
ALTER TABLE public.subjects ADD COLUMN notes jsonb DEFAULT '{}'::jsonb;