-- =====================================================
-- FIX: Remove public profile visibility - require authentication
-- =====================================================

-- Drop the overly permissive public profiles policy
DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (id = auth.uid());

-- Policy 2: Admins/Owners can view all profiles for management
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'admin'));

-- Policy 3: Authenticated users can view limited public profile info (only display_name and avatar for public profiles)
-- This is handled by using a view instead - profiles table itself is restricted

-- Comment explaining the change
COMMENT ON POLICY "Users can view own profile" ON public.profiles IS 
'Users can only view their own full profile data. Removed public visibility to prevent data scraping of emails, phone numbers, and personal info.';

COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS 
'Administrators can view all profiles for user management purposes.';