-- Migration: Add weekly study hours target to user settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS weekly_study_hours_target integer DEFAULT 20 NOT NULL;

COMMENT ON COLUMN public.user_settings.weekly_study_hours_target IS 'Meta de horas de estudo semanais definida pelo estudante (ex: 20 horas).';
