-- =====================================================
-- 10B. ALTERNATIVA PARA PROFILES (SE HOUVER PROBLEMAS)
-- =====================================================
-- Execute este arquivo se o 10_system_tables_with_rls.sql der erro com profiles

-- =====================================================
-- OPÇÃO 1: VERIFICAR ESTRUTURA EXISTENTE
-- =====================================================
-- Execute esta query para ver a estrutura atual da tabela profiles:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND table_schema = 'public';

-- =====================================================
-- OPÇÃO 2: CRIAR TABELA PROFILES CUSTOMIZADA
-- =====================================================
-- Se preferir, pode criar uma tabela profiles própria com outro nome

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  location TEXT,
  is_public BOOLEAN DEFAULT true,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON public.user_profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_public ON public.user_profiles(is_public);

-- Habilita RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Remove policies existentes
DROP POLICY IF EXISTS "Users can view public user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can manage own user profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all user profiles" ON public.user_profiles;

-- Policies para user_profiles
CREATE POLICY "Users can view public user profiles" 
ON public.user_profiles 
FOR SELECT 
USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can manage own user profile" 
ON public.user_profiles 
FOR ALL 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user profiles" 
ON public.user_profiles 
FOR SELECT 
USING (
  public.has_role_or_higher(auth.uid(), 'admin')
);

-- =====================================================
-- OPÇÃO 3: IGNORAR PROFILES COMPLETAMENTE
-- =====================================================
-- Se quiser pular a tabela profiles por enquanto, comente as seções
-- relacionadas a profiles no arquivo 10_system_tables_with_rls.sql

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE public.user_profiles IS 
'Tabela alternativa de perfis de usuários. Use se a tabela profiles padrão do Supabase causar conflitos.';