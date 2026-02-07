-- Migration: Add Soft Delete to Profiles
-- Description: Adds deleted_at column to support soft delete functionality

-- 1. Add deleted_at column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at);

-- 3. Comment explaining the column
COMMENT ON COLUMN public.profiles.deleted_at IS 'Timestamp for soft delete. If NULL, user is active. If set, user is archived.';
