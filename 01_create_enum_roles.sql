-- =====================================================
-- 1. CRIAÇÃO DO ENUM DE ROLES
-- =====================================================
-- Define os tipos de roles possíveis no sistema
CREATE TYPE public.app_role AS ENUM (
  'owner',      -- Proprietário do sistema (você)
  'admin',      -- Administrador
  'moderator',  -- Moderador
  'user'        -- Usuário comum
);

-- Comentário para documentação
COMMENT ON TYPE public.app_role IS 'Enum que define os níveis de acesso no sistema. Hierarquia: owner > admin > moderator > user';