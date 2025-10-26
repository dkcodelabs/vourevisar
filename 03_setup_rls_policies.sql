-- =====================================================
-- 3. CONFIGURAÇÃO DE RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilita RLS na tabela user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS DE SEGURANÇA
-- =====================================================

-- Política 1: Usuários podem VER suas próprias roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Política 2: NINGUÉM pode inserir/atualizar/deletar diretamente
-- (apenas via funções administrativas ou manualmente via SQL)
CREATE POLICY "Block direct modifications" 
ON public.user_roles 
FOR ALL 
USING (false);

-- =====================================================
-- COMENTÁRIOS EXPLICATIVOS
-- =====================================================

COMMENT ON POLICY "Users can view their own roles" ON public.user_roles IS 
'Permite que usuários vejam apenas suas próprias roles. Não podem ver roles de outros usuários.';

COMMENT ON POLICY "Block direct modifications" ON public.user_roles IS 
'Bloqueia todas as operações de INSERT, UPDATE e DELETE via API. Roles só podem ser modificadas via funções administrativas ou diretamente no banco.';