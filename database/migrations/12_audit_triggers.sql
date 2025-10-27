-- =====================================================
-- 12. TRIGGERS DE AUDITORIA AUTOMÁTICA
-- =====================================================
-- Sistema automático de logs para todas as mudanças importantes

-- =====================================================
-- A) FUNÇÃO GENÉRICA DE AUDITORIA
-- =====================================================
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_values JSONB := '{}';
  new_values JSONB := '{}';
  changes JSONB := '{}';
  action_type TEXT;
BEGIN
  -- Determina o tipo de ação
  IF TG_OP = 'DELETE' THEN
    action_type := 'DELETE';
    old_values := to_jsonb(OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'UPDATE';
    old_values := to_jsonb(OLD);
    new_values := to_jsonb(NEW);
    
    -- Calcula apenas os campos que mudaram
    SELECT jsonb_object_agg(key, value) INTO changes
    FROM jsonb_each(new_values)
    WHERE value IS DISTINCT FROM old_values->key;
    
  ELSIF TG_OP = 'INSERT' THEN
    action_type := 'INSERT';
    new_values := to_jsonb(NEW);
  END IF;

  -- Insere no log de auditoria
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    changes,
    created_at
  ) VALUES (
    auth.uid(),
    action_type,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    old_values,
    new_values,
    changes,
    now()
  );

  -- Retorna o registro apropriado
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- =====================================================
-- B) FUNÇÃO DE AUDITORIA PARA USER_ROLES (ESPECIAL)
-- =====================================================
CREATE OR REPLACE FUNCTION public.audit_user_roles_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_type TEXT;
  target_email TEXT;
  assigner_email TEXT;
BEGIN
  -- Busca emails para o log
  SELECT email INTO target_email 
  FROM auth.users 
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  
  SELECT email INTO assigner_email 
  FROM auth.users 
  WHERE id = auth.uid();

  -- Determina ação
  IF TG_OP = 'DELETE' THEN
    action_type := 'ROLE_REMOVED';
  ELSIF TG_OP = 'INSERT' THEN
    action_type := 'ROLE_ASSIGNED';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'ROLE_UPDATED';
  END IF;

  -- Log especial para mudanças de roles
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    changes,
    created_at
  ) VALUES (
    auth.uid(),
    action_type,
    'user_roles',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN OLD IS NOT NULL THEN 
      jsonb_build_object(
        'user_email', target_email,
        'role', OLD.role,
        'assigned_by', assigner_email
      ) 
    ELSE '{}' END,
    CASE WHEN NEW IS NOT NULL THEN 
      jsonb_build_object(
        'user_email', target_email,
        'role', NEW.role,
        'assigned_by', assigner_email
      ) 
    ELSE '{}' END,
    jsonb_build_object(
      'target_user', target_email,
      'role_change', COALESCE(NEW.role::TEXT, OLD.role::TEXT),
      'action_by', assigner_email
    ),
    now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- =====================================================
-- C) APLICAR TRIGGERS NAS TABELAS IMPORTANTES
-- =====================================================

-- Remove triggers existentes antes de criar novos
DROP TRIGGER IF EXISTS audit_user_roles_trigger ON public.user_roles;
DROP TRIGGER IF EXISTS audit_system_settings_trigger ON public.system_settings;
DROP TRIGGER IF EXISTS audit_organizations_trigger ON public.organizations;
DROP TRIGGER IF EXISTS audit_organization_members_trigger ON public.organization_members;

-- Trigger para user_roles (mudanças de permissão)
CREATE TRIGGER audit_user_roles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles_function();

-- Trigger para system_settings (mudanças de configuração)
CREATE TRIGGER audit_system_settings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Trigger para organizations (criação/mudança de organizações)
CREATE TRIGGER audit_organizations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Trigger para organization_members (mudanças de membership)
CREATE TRIGGER audit_organization_members_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- =====================================================
-- D) FUNÇÃO PARA INSERIR LOGS MANUAIS
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_custom_action(
  _action TEXT,
  _table_name TEXT DEFAULT NULL,
  _record_id UUID DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    changes,
    created_at
  ) VALUES (
    auth.uid(),
    _action,
    _table_name,
    _record_id,
    _metadata,
    now()
  );
END;
$$;

-- =====================================================
-- E) FUNÇÃO PARA LIMPAR LOGS ANTIGOS (APENAS OWNERS)
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(_days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Apenas owners podem limpar logs
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Only owners can cleanup audit logs';
  END IF;

  -- Remove logs mais antigos que X dias
  DELETE FROM public.audit_logs 
  WHERE created_at < (now() - (_days_to_keep || ' days')::INTERVAL);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log da limpeza
  PERFORM public.log_custom_action(
    'AUDIT_CLEANUP',
    'audit_logs',
    NULL,
    jsonb_build_object(
      'days_kept', _days_to_keep,
      'records_deleted', deleted_count
    )
  );
  
  RETURN deleted_count;
END;
$$;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION public.audit_trigger_function() IS 
'Função genérica de auditoria. Registra automaticamente INSERT, UPDATE e DELETE em qualquer tabela.';

COMMENT ON FUNCTION public.audit_user_roles_function() IS 
'Função especializada para auditoria de mudanças de roles. Inclui emails e contexto adicional.';

COMMENT ON FUNCTION public.log_custom_action(TEXT, TEXT, UUID, JSONB) IS 
'Permite inserir logs manuais para ações customizadas do sistema.';

COMMENT ON FUNCTION public.cleanup_old_audit_logs(INTEGER) IS 
'Remove logs de auditoria antigos. Apenas owners podem executar. Padrão: mantém 1 ano.';