-- =====================================================
-- 2. TABELA USER_ROLES (SEPARADA E PROTEGIDA)
-- =====================================================

-- Criação da tabela de roles dos usuários
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id), -- Quem atribuiu essa role
  
  -- Constraint: Um usuário não pode ter a mesma role duplicada
  UNIQUE (user_id, role)
);

-- Índices para performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_user_roles_assigned_at ON public.user_roles(assigned_at);

-- Comentários para documentação
COMMENT ON TABLE public.user_roles IS 'Tabela que armazena as roles dos usuários. Separada para evitar escalada de privilégios.';
COMMENT ON COLUMN public.user_roles.assigned_by IS 'ID do usuário que atribuiu esta role (auditoria)';
COMMENT ON COLUMN public.user_roles.assigned_at IS 'Timestamp de quando a role foi atribuída';