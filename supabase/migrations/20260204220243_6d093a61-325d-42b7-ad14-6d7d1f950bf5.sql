-- Remove permissive RLS policies that expose data publicly
-- These policies allow unrestricted SELECT access and should be removed

-- Drop the permissive policy on topics table
DROP POLICY IF EXISTS "Sem RLS Select Topics" ON topics;

-- Drop the permissive policy on subjects table (if exists)
DROP POLICY IF EXISTS "Sem RLS Select Subjects" ON subjects;