-- =====================================================
-- FIX: Clean up duplicate profile policies and restrict system_settings
-- =====================================================

-- Clean up redundant profile policies (keep only the new secure ones)
DROP POLICY IF EXISTS "Users can only view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;

-- Fix system_settings: Remove public visibility, require authentication for all access
DROP POLICY IF EXISTS "Users can view public settings" ON public.system_settings;

-- Only owners and admins should access system settings
CREATE POLICY "Authenticated users can view public settings" 
ON public.system_settings 
FOR SELECT 
TO authenticated
USING (visible_to_users = true);

-- Comment explaining the change
COMMENT ON POLICY "Authenticated users can view public settings" ON public.system_settings IS 
'Only authenticated users can view system settings marked as visible_to_users. Unauthenticated access is blocked.';