-- Update provider_type for all Google users who are incorrectly marked as 'Email'
-- This fixes the issue where Google OAuth users have provider_type set to 'Email' instead of 'Google'

UPDATE public.profiles 
SET provider_type = 'Google' 
WHERE provider_type = 'Email' 
AND id IN (
  SELECT id 
  FROM auth.users 
  WHERE raw_user_meta_data->>'provider' = 'google'
);;
