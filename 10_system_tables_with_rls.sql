-- =====================================================
-- 10. TABELAS DO SISTEMA COM RLS POLICIES
-- =====================================================
-- Implementação de tabelas essenciais com políticas de segurança

-- =====================================================
-- A) TABELA DE CONFIGURAÇÕES DO SISTEMA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  visible_to_users BOOLEAN DEFAULT false,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_visible ON public.system_settings(visible_to_users);

-- Habilita RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policies para system_settings
CREATE POLICY "Owners can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (public.is_owner(auth.uid()));

CREATE POLICY "Users can view public settings" 
ON public.system_settings 
FOR SELECT 
USING (visible_to_users = true);

-- =====================================================
-- B) TABELA DE AUDITORIA/LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance e consultas
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Habilita RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies para audit_logs
CREATE POLICY "Admins can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'owner') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Ninguém pode modificar logs (apenas INSERT via trigger)
CREATE POLICY "No one can modify logs" 
ON public.audit_logs 
FOR UPDATE 
USING (false);

CREATE POLICY "No one can delete logs" 
ON public.audit_logs 
FOR DELETE 
USING (false);

-- Apenas sistema pode inserir logs (via triggers)
CREATE POLICY "System can insert logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);  -- Será controlado por triggers

-- =====================================================
-- C) TABELA DE PERFIS DE USUÁRIOS (AJUSTAR EXISTENTE)
-- =====================================================
-- Estrutura existente: id (PK=auth.users.id), name, email, avatar_url, created_at, updated_at, phone, provider_type

-- Adiciona colunas customizadas que não existem
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_profiles_is_public ON public.profiles(is_public);
CREATE INDEX IF NOT EXISTS idx_profiles_name ON public.profiles(name);

-- Habilita RLS (se já não estiver habilitado)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove policies existentes para profiles
DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Policies para profiles
CREATE POLICY "Users can view public profiles" 
ON public.profiles 
FOR SELECT 
USING (
  is_public = true OR 
  id = auth.uid()
);

CREATE POLICY "Users can manage own profile" 
ON public.profiles 
FOR ALL 
USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  public.has_role_or_higher(auth.uid(), 'admin')
);

-- =====================================================
-- D) TABELA DE NOTIFICAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info', -- info, success, warning, error
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON public.notifications(expires_at);

-- Habilita RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies para notifications
CREATE POLICY "Users can view own notifications" 
ON public.notifications 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" 
ON public.notifications 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all notifications" 
ON public.notifications 
FOR ALL 
USING (
  public.has_role_or_higher(auth.uid(), 'admin')
);

-- Sistema pode inserir notificações
CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);  -- Controlado por funções específicas

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE public.system_settings IS 
'Configurações globais do sistema. Owners podem gerenciar tudo, usuários veem apenas configurações públicas.';

COMMENT ON TABLE public.audit_logs IS 
'Log de auditoria de todas as ações do sistema. Apenas admins+ podem visualizar. Imutável após inserção.';

COMMENT ON TABLE public.profiles IS 
'Perfis dos usuários. Usuários gerenciam próprio perfil, podem ver perfis públicos. Admins veem tudo.';

COMMENT ON TABLE public.notifications IS 
'Sistema de notificações. Usuários veem apenas suas notificações. Admins podem gerenciar todas.';