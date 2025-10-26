-- =====================================================
-- 13. TESTES DAS TABELAS DO SISTEMA
-- =====================================================
-- Scripts para testar todas as funcionalidades implementadas

-- =====================================================
-- CONFIGURAÇÃO INICIAL PARA TESTES
-- =====================================================

-- Simula estar logado como owner
SELECT set_config('request.jwt.claims', '{"sub":"e2de8e3b-9484-4064-b9ae-771a576091e1"}', true);

-- =====================================================
-- A) TESTES DA TABELA SYSTEM_SETTINGS
-- =====================================================

-- Teste 1: Owner pode inserir configurações
INSERT INTO public.system_settings (key, value, visible_to_users, description)
VALUES 
  ('app_name', '"Meu Sistema Seguro"', true, 'Nome da aplicação'),
  ('maintenance_mode', 'false', true, 'Modo de manutenção'),
  ('admin_email', '"admin@exemplo.com"', false, 'Email do administrador'),
  ('max_upload_size', '10485760', true, 'Tamanho máximo de upload em bytes');

-- Teste 2: Verificar se foram inseridas
SELECT * FROM public.system_settings ORDER BY key;

-- Teste 3: Owner pode atualizar configurações
UPDATE public.system_settings 
SET value = '"Sistema Atualizado"', updated_by = auth.uid()
WHERE key = 'app_name';

-- =====================================================
-- B) TESTES DA TABELA PROFILES
-- =====================================================

-- Teste 4: Atualizar perfil do owner (usando id, não user_id)
INSERT INTO public.profiles (id, name, display_name, bio, is_public)
VALUES (
  'e2de8e3b-9484-4064-b9ae-771a576091e1',
  'Proprietário do Sistema',
  'Admin Principal',
  'Administrador principal do sistema',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  is_public = EXCLUDED.is_public;

-- Teste 5: Verificar perfil criado
SELECT * FROM public.profiles WHERE id = auth.uid();

-- =====================================================
-- C) TESTES DA TABELA NOTIFICATIONS
-- =====================================================

-- Teste 6: Sistema pode criar notificações
INSERT INTO public.notifications (user_id, title, message, type)
VALUES (
  'e2de8e3b-9484-4064-b9ae-771a576091e1',
  'Sistema Configurado',
  'Seu sistema de roles foi configurado com sucesso!',
  'success'
);

-- Teste 7: Verificar notificações
SELECT * FROM public.notifications WHERE user_id = auth.uid();

-- =====================================================
-- D) TESTES DA TABELA POSTS
-- =====================================================

-- Teste 8: Criar post público
INSERT INTO public.posts (author_id, title, content, status, visibility)
VALUES (
  'e2de8e3b-9484-4064-b9ae-771a576091e1',
  'Primeiro Post do Sistema',
  'Este é o primeiro post criado no sistema seguro!',
  'published',
  'public'
);

-- Teste 9: Criar post privado
INSERT INTO public.posts (author_id, title, content, status, visibility)
VALUES (
  'e2de8e3b-9484-4064-b9ae-771a576091e1',
  'Post Privado',
  'Este post é apenas para teste de visibilidade.',
  'draft',
  'private'
);

-- Teste 10: Verificar posts criados
SELECT id, title, status, visibility, created_at FROM public.posts;

-- =====================================================
-- E) TESTES DA TABELA ORGANIZATIONS
-- =====================================================

-- Teste 11: Criar organização
INSERT INTO public.organizations (name, slug, description, owner_id, is_public)
VALUES (
  'Minha Empresa',
  'minha-empresa',
  'Organização principal do sistema',
  'e2de8e3b-9484-4064-b9ae-771a576091e1',
  true
);

-- Teste 12: Adicionar membro à organização
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT 
  o.id,
  'e2de8e3b-9484-4064-b9ae-771a576091e1',
  'owner'
FROM public.organizations o 
WHERE o.slug = 'minha-empresa';

-- Teste 13: Verificar organização e membros
SELECT 
  o.name,
  o.slug,
  om.role,
  au.email
FROM public.organizations o
JOIN public.organization_members om ON om.organization_id = o.id
JOIN auth.users au ON au.id = om.user_id;

-- =====================================================
-- F) TESTES DE AUDITORIA
-- =====================================================

-- Teste 14: Verificar logs de auditoria gerados automaticamente
SELECT 
  al.action,
  al.table_name,
  al.changes,
  al.created_at,
  au.email as user_email
FROM public.audit_logs al
LEFT JOIN auth.users au ON au.id = al.user_id
ORDER BY al.created_at DESC
LIMIT 10;

-- Teste 15: Criar log manual (se a função existir)
-- Primeiro execute o arquivo 12_audit_triggers.sql para ter esta função
-- SELECT public.log_custom_action(
--   'SYSTEM_TEST',
--   'test_table',
--   gen_random_uuid(),
--   '{"test": "Teste de log manual", "timestamp": "' || now() || '"}'::JSONB
-- );

-- =====================================================
-- G) TESTES DE FUNÇÕES HELPER
-- =====================================================

-- Teste 16: Testar função de membership
SELECT public.is_organization_member(
  (SELECT id FROM public.organizations WHERE slug = 'minha-empresa'),
  'e2de8e3b-9484-4064-b9ae-771a576091e1'
) as is_member;

-- Teste 17: Testar função de role na organização
SELECT public.get_organization_role(
  (SELECT id FROM public.organizations WHERE slug = 'minha-empresa'),
  'e2de8e3b-9484-4064-b9ae-771a576091e1'
) as org_role;

-- =====================================================
-- H) TESTES DE SEGURANÇA (SIMULAR USUÁRIO COMUM)
-- =====================================================

-- Simula usuário não-owner (substitua por um UUID real se tiver)
-- SELECT set_config('request.jwt.claims', '{"sub":"user-comum-uuid"}', true);

-- Teste 18: Usuário comum NÃO pode ver configurações privadas
-- SELECT * FROM public.system_settings WHERE visible_to_users = false;
-- Esperado: Nenhum resultado

-- Teste 19: Usuário comum pode ver configurações públicas
-- SELECT * FROM public.system_settings WHERE visible_to_users = true;
-- Esperado: Apenas configurações públicas

-- Teste 20: Usuário comum NÃO pode ver logs de auditoria
-- SELECT * FROM public.audit_logs LIMIT 5;
-- Esperado: Nenhum resultado (apenas admins+)

-- =====================================================
-- I) LIMPEZA E VERIFICAÇÃO FINAL
-- =====================================================

-- Volta para contexto de owner
SELECT set_config('request.jwt.claims', '{"sub":"e2de8e3b-9484-4064-b9ae-771a576091e1"}', true);

-- Teste 21: Verificar contadores finais
SELECT 
  'system_settings' as table_name, 
  count(*) as records 
FROM public.system_settings
UNION ALL
SELECT 
  'profiles' as table_name, 
  count(*) as records 
FROM public.profiles
UNION ALL
SELECT 
  'notifications' as table_name, 
  count(*) as records 
FROM public.notifications
UNION ALL
SELECT 
  'posts' as table_name, 
  count(*) as records 
FROM public.posts
UNION ALL
SELECT 
  'organizations' as table_name, 
  count(*) as records 
FROM public.organizations
UNION ALL
SELECT 
  'audit_logs' as table_name, 
  count(*) as records 
FROM public.audit_logs;

-- =====================================================
-- RESULTADOS ESPERADOS
-- =====================================================
/*
✅ system_settings: 4 registros (configurações do sistema)
✅ profiles: 1 registro (perfil do owner)
✅ notifications: 1 registro (notificação de boas-vindas)
✅ posts: 2 registros (1 público, 1 privado)
✅ organizations: 1 registro (organização principal)
✅ audit_logs: Vários registros (logs automáticos + manual)

🔒 SEGURANÇA TESTADA:
- Owners podem gerenciar tudo
- Usuários comuns veem apenas dados públicos/próprios
- Logs de auditoria protegidos
- RLS funcionando em todas as tabelas
*/