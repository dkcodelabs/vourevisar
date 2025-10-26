-- =====================================================
-- 6B. DROP DE FUNÇÕES EXISTENTES (CORREÇÃO DE TIPOS)
-- =====================================================
-- Execute este arquivo ANTES do 07_advanced_admin_functions.sql
-- para corrigir problemas de tipos de dados

-- =====================================================
-- REMOVE TODAS AS FUNÇÕES EXISTENTES
-- =====================================================

-- Remove funções básicas (todas as variações)
DROP FUNCTION IF EXISTS public.has_role(app_role, UUID);
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role);
DROP FUNCTION IF EXISTS public.has_role_or_higher(app_role, UUID);
DROP FUNCTION IF EXISTS public.has_role_or_higher(UUID, app_role);
DROP FUNCTION IF EXISTS public.get_user_highest_role(UUID);

-- Remove funções SECURITY DEFINER
DROP FUNCTION IF EXISTS public.is_owner(UUID);
DROP FUNCTION IF EXISTS public.assign_role(UUID, app_role);
DROP FUNCTION IF EXISTS public.remove_role(UUID, app_role);
DROP FUNCTION IF EXISTS public.set_user_role(UUID, app_role);

-- Remove funções administrativas avançadas (todas as variações)
DROP FUNCTION IF EXISTS public.list_users_with_roles();
DROP FUNCTION IF EXISTS public.get_user_info(UUID);
DROP FUNCTION IF EXISTS public.get_role_audit_log(INTEGER);
DROP FUNCTION IF EXISTS public.get_role_audit_log();

-- =====================================================
-- FORÇA REMOÇÃO COM CASCADE (se necessário)
-- =====================================================

-- Se ainda houver erro, descomente as linhas abaixo:
-- DROP FUNCTION public.list_users_with_roles() CASCADE;
-- DROP FUNCTION public.get_user_info(UUID) CASCADE;
-- DROP FUNCTION public.get_role_audit_log(INTEGER) CASCADE;

-- =====================================================
-- NOTA IMPORTANTE
-- =====================================================
-- Após executar este arquivo, execute novamente:
-- 1. 04_basic_security_functions.sql (para recriar funções básicas)
-- 2. 07_advanced_admin_functions.sql (com tipos corretos)