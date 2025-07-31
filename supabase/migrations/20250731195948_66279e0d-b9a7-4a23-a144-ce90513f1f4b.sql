-- Add new columns to topics table for enhanced review system
ALTER TABLE public.topics 
ADD COLUMN difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
ADD COLUMN subtopics JSONB DEFAULT '[]'::jsonb,
ADD COLUMN review_notes JSONB DEFAULT '{}'::jsonb,
ADD COLUMN difficulty_set_at TIMESTAMP WITH TIME ZONE;