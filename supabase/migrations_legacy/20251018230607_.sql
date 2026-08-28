-- Fix CRITICAL security issue: User Contact Information Publicly Accessible
-- Add SELECT RLS policy to profiles table to protect user contact information
-- This prevents any authenticated user from accessing other users' emails and phone numbers

CREATE POLICY "Users can only view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);;
